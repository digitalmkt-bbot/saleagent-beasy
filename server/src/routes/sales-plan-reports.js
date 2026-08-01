// sales-plan-reports.js — รายงาน, ปฏิทิน, แจ้งเตือน (mount ที่ /api/sales-plans ก่อน router หลัก)
const router = require('express').Router();
const { q } = require('../db');
const { wrap, num } = require('./_util');
const { isStaff } = require('./_scope');

const cid = (req) => req.user.company_id;
// scope: staff เห็นเฉพาะแผนของตัวเอง
function scope(req, alias, args) {
  if (isStaff(req.user)) { args.push(req.user.id); return ` AND ${alias}.user_id=$${args.length}`; }
  return '';
}
function range(req) {
  const to = req.query.to || null, from = req.query.from || null;
  return { from, to };
}

// ---------- REPORTS ----------
router.get('/reports', wrap(async (req, res) => {
  const args = [cid(req)];
  const sc = scope(req, 'sp', args);
  const { from, to } = range(req);
  const dcond = [];
  if (from) { args.push(from); dcond.push(`sp.end_date>=$${args.length}`); }
  if (to) { args.push(to); dcond.push(`sp.start_date<=$${args.length}`); }
  if (req.query.team_id) { args.push(+req.query.team_id); dcond.push(`sp.team_id=$${args.length}`); }
  const D = dcond.length ? ' AND ' + dcond.join(' AND ') : '';
  const W = `sp.company_id=$1 ${sc} ${D}`;

  // by employee
  const byEmployee = await q(
    `SELECT u.id, u.display_name AS name, tm.name AS team,
       count(DISTINCT sp.id)::int plans,
       count(a.id)::int activities,
       count(a.id) FILTER (WHERE a.status IN ('completed','partially_completed'))::int completed,
       count(a.id) FILTER (WHERE a.result_type='New Prospect Created' OR a.prospect_id IS NOT NULL)::int prospects,
       count(a.id) FILTER (WHERE a.result_type='Proposal Sent' OR a.proposal_id IS NOT NULL)::int proposals,
       count(a.id) FILTER (WHERE a.result_type='Booking Closed' OR a.booking_id IS NOT NULL)::int bookings,
       COALESCE(sum(CASE WHEN a.result_type='Booking Closed' OR a.booking_id IS NOT NULL THEN a.estimated_deal_value ELSE 0 END),0) booking_value
     FROM sales_plan sp JOIN app_user u ON u.id=sp.user_id LEFT JOIN team tm ON tm.id=sp.team_id
       LEFT JOIN sales_plan_activity a ON a.sales_plan_id=sp.id
     WHERE ${W} GROUP BY u.id,u.display_name,tm.name ORDER BY booking_value DESC, completed DESC`, args);

  // by team
  const byTeam = await q(
    `SELECT COALESCE(tm.name,'-') AS team, count(DISTINCT sp.id)::int plans, count(a.id)::int activities,
       count(a.id) FILTER (WHERE a.status IN ('completed','partially_completed'))::int completed,
       count(a.id) FILTER (WHERE a.result_type='Booking Closed' OR a.booking_id IS NOT NULL)::int bookings,
       COALESCE(sum(CASE WHEN a.result_type='Booking Closed' OR a.booking_id IS NOT NULL THEN a.estimated_deal_value ELSE 0 END),0) booking_value
     FROM sales_plan sp LEFT JOIN team tm ON tm.id=sp.team_id LEFT JOIN sales_plan_activity a ON a.sales_plan_id=sp.id
     WHERE ${W} GROUP BY tm.name ORDER BY booking_value DESC`, args);

  // by segment
  const bySegment = await q(
    `SELECT COALESCE(seg.name_en,'-') AS segment, count(a.id)::int activities,
       count(a.id) FILTER (WHERE a.result_type='Booking Closed' OR a.booking_id IS NOT NULL)::int bookings
     FROM sales_plan sp JOIN sales_plan_activity a ON a.sales_plan_id=sp.id
       LEFT JOIN sales_segment seg ON seg.id=a.primary_segment_id
     WHERE ${W} GROUP BY seg.name_en ORDER BY activities DESC`, args);

  // by market
  const byMarket = await q(
    `SELECT COALESCE(mk.market_code,'-') AS market, COALESCE(mk.country_name,'-') AS country, count(a.id)::int activities,
       count(a.id) FILTER (WHERE a.result_type='Booking Closed' OR a.booking_id IS NOT NULL)::int bookings
     FROM sales_plan sp JOIN sales_plan_activity a ON a.sales_plan_id=sp.id
       LEFT JOIN market mk ON mk.id=a.primary_market_id
     WHERE ${W} GROUP BY mk.market_code,mk.country_name ORDER BY activities DESC`, args);

  // funnel (conversion)
  const funnel = await q(
    `SELECT
       count(a.id)::int total,
       count(a.id) FILTER (WHERE a.result_type IN ('Contacted','Interested','Negotiating','Proposal Sent','Booking Closed'))::int contacted,
       count(a.id) FILTER (WHERE a.result_type IN ('Interested','Negotiating','Proposal Sent','Booking Closed'))::int interested,
       count(a.id) FILTER (WHERE a.result_type='Proposal Sent' OR a.proposal_id IS NOT NULL)::int proposal,
       count(a.id) FILTER (WHERE a.result_type='Booking Closed' OR a.booking_id IS NOT NULL)::int booking
     FROM sales_plan sp JOIN sales_plan_activity a ON a.sales_plan_id=sp.id WHERE ${W}`, args);

  // completion / overdue
  const completion = await q(
    `SELECT count(a.id)::int total,
       count(a.id) FILTER (WHERE a.status IN ('completed','partially_completed'))::int completed,
       count(a.id) FILTER (WHERE a.status='planned' AND a.activity_date < CURRENT_DATE)::int overdue,
       count(a.id) FILTER (WHERE a.status='cancelled')::int cancelled
     FROM sales_plan sp JOIN sales_plan_activity a ON a.sales_plan_id=sp.id WHERE ${W}`, args);

  // ranking (by avg weighted overall score of targets)
  const ranking = await q(
    `SELECT u.display_name AS name, ROUND(AVG(o.score)::numeric,1) AS score, count(DISTINCT sp.id)::int plans
     FROM sales_plan sp JOIN app_user u ON u.id=sp.user_id
       JOIN (SELECT sales_plan_id, SUM(weighted_score) score FROM sales_plan_target GROUP BY sales_plan_id) o ON o.sales_plan_id=sp.id
     WHERE ${W} GROUP BY u.display_name ORDER BY score DESC NULLS LAST LIMIT 20`, args);

  res.json({
    byEmployee: byEmployee.rows, byTeam: byTeam.rows, bySegment: bySegment.rows, byMarket: byMarket.rows,
    funnel: funnel.rows[0], completion: completion.rows[0], ranking: ranking.rows,
  });
}));

// MoM / YoY comparison (bookings, proposals, prospects, booking value)
router.get('/reports/trend', wrap(async (req, res) => {
  const args = [cid(req)];
  const sc = scope(req, 'sp', args);
  const rows = await q(
    `SELECT to_char(date_trunc('month', sp.start_date),'YYYY-MM') AS ym,
       count(a.id) FILTER (WHERE a.result_type='New Prospect Created' OR a.prospect_id IS NOT NULL)::int prospects,
       count(a.id) FILTER (WHERE a.result_type='Proposal Sent' OR a.proposal_id IS NOT NULL)::int proposals,
       count(a.id) FILTER (WHERE a.result_type='Booking Closed' OR a.booking_id IS NOT NULL)::int bookings,
       COALESCE(sum(CASE WHEN a.result_type='Booking Closed' OR a.booking_id IS NOT NULL THEN a.estimated_deal_value ELSE 0 END),0) booking_value
     FROM sales_plan sp LEFT JOIN sales_plan_activity a ON a.sales_plan_id=sp.id
     WHERE sp.company_id=$1 ${sc} GROUP BY 1 ORDER BY 1 DESC LIMIT 24`, args);
  res.json({ rows: rows.rows });
}));

// ---------- CALENDAR ----------
router.get('/calendar', wrap(async (req, res) => {
  const args = [cid(req)];
  const sc = scope(req, 'sp', args);
  const { from, to } = range(req);
  const dc = [];
  if (from) { args.push(from); dc.push(`a.activity_date>=$${args.length}`); }
  if (to) { args.push(to); dc.push(`a.activity_date<=$${args.length}`); }
  const D = dc.length ? ' AND ' + dc.join(' AND ') : '';
  const rows = await q(
    `SELECT a.id, a.activity_date, a.start_time, a.status, a.client_name, cu.name AS customer_name,
       at.name_en AS activity_type_name, sp.id AS plan_id, sp.plan_number, u.display_name AS user_name
     FROM sales_plan_activity a JOIN sales_plan sp ON sp.id=a.sales_plan_id
       LEFT JOIN customer cu ON cu.id=a.customer_id
       LEFT JOIN sales_plan_activity_type at ON at.id=a.activity_type_id
       LEFT JOIN app_user u ON u.id=sp.user_id
     WHERE sp.company_id=$1 ${sc} AND a.activity_date IS NOT NULL ${D}
     ORDER BY a.activity_date, a.start_time NULLS LAST LIMIT ${num(req.query.limit, 500)}`, args);
  res.json({ rows: rows.rows });
}));

// ---------- ALERTS (computed) ----------
router.get('/alerts', wrap(async (req, res) => {
  const c = cid(req);
  const staff = isStaff(req.user);
  const alerts = [];
  // next Monday
  const now = new Date(); const day = now.getDay() || 7;
  const nextMon = new Date(now); nextMon.setDate(now.getDate() + (8 - day)); const nm = nextMon.toISOString().slice(0, 10);
  const hasNext = await q('SELECT 1 FROM sales_plan WHERE company_id=$1 AND user_id=$2 AND start_date=$3 LIMIT 1', [c, req.user.id, nm]);
  if (!hasNext.rows[0]) alerts.push({ level: 'warning', event: 'no_next_plan', title: 'ยังไม่ได้สร้างแผนสัปดาห์ถัดไป', body: 'เริ่ม ' + nm });

  if (!staff) {
    const pending = await q(`SELECT count(*)::int c FROM sales_plan WHERE company_id=$1 AND status IN ('submitted','pending_review')`, [c]);
    if (pending.rows[0].c) alerts.push({ level: 'info', event: 'pending_review', title: 'มีแผนรอตรวจสอบ', body: pending.rows[0].c + ' แผน' });
  }
  const A = staff ? [c, req.user.id] : [c];
  const sc = staff ? ' AND sp.user_id=$2' : '';
  const today = await q(`SELECT count(*)::int c FROM sales_plan_activity a JOIN sales_plan sp ON sp.id=a.sales_plan_id WHERE sp.company_id=$1 ${sc} AND a.activity_date=CURRENT_DATE AND a.status IN ('planned','confirmed')`, A);
  if (today.rows[0].c) alerts.push({ level: 'info', event: 'today', title: 'มีกิจกรรมวันนี้', body: today.rows[0].c + ' รายการ' });
  const overdue = await q(`SELECT count(*)::int c FROM sales_plan_activity a JOIN sales_plan sp ON sp.id=a.sales_plan_id WHERE sp.company_id=$1 ${sc} AND a.activity_date < CURRENT_DATE AND a.status='planned'`, A);
  if (overdue.rows[0].c) alerts.push({ level: 'warning', event: 'overdue', title: 'มีกิจกรรมเลยกำหนดยังไม่บันทึกผล', body: overdue.rows[0].c + ' รายการ' });
  const followups = await q(`SELECT count(*)::int c FROM sales_plan_activity a JOIN sales_plan sp ON sp.id=a.sales_plan_id WHERE sp.company_id=$1 ${sc} AND a.next_follow_up_at=CURRENT_DATE`, A);
  if (followups.rows[0].c) alerts.push({ level: 'info', event: 'followup', title: 'ถึงกำหนดติดตามวันนี้', body: followups.rows[0].c + ' รายการ' });
  res.json({ rows: alerts, count: alerts.length });
}));

// ---------- NOTIFICATIONS FEED ----------
router.get('/notifications', wrap(async (req, res) => {
  const rows = await q(
    `SELECT n.*, sp.plan_number FROM sales_plan_notification n LEFT JOIN sales_plan sp ON sp.id=n.sales_plan_id
     WHERE n.company_id=$1 AND (n.user_id=$2 OR n.user_id IS NULL) ORDER BY n.created_at DESC LIMIT 50`,
    [cid(req), req.user.id]);
  const unread = rows.rows.filter(r => !r.is_read).length;
  res.json({ rows: rows.rows, count: unread });
}));
router.post('/notifications/:nid/read', wrap(async (req, res) => {
  await q('UPDATE sales_plan_notification SET is_read=true WHERE id=$1 AND company_id=$2 AND (user_id=$3 OR user_id IS NULL)', [req.params.nid, cid(req), req.user.id]);
  res.json({ ok: true });
}));
router.post('/notifications/read-all', wrap(async (req, res) => {
  await q('UPDATE sales_plan_notification SET is_read=true WHERE company_id=$1 AND (user_id=$2 OR user_id IS NULL)', [cid(req), req.user.id]);
  res.json({ ok: true });
}));

module.exports = router;
