const router = require('express').Router();
const { q } = require('../db');
const { wrap } = require('./_util');
const { isStaff, OWNED } = require('./_scope');
const cid = (req) => req.user.company_id;

// สรุปภาพรวมทั้งหมดสำหรับหน้ารายงาน
router.get('/summary', wrap(async (req, res) => {
  const c = cid(req);
  const staff = isStaff(req.user);
  const A = staff ? [c, req.user.id] : [c];
  const PJ = staff ? `AND p.customer_id IN ${OWNED}` : '';
  const AC = staff ? `AND (a.assignee_user_id=$2 OR a.customer_id IN ${OWNED})` : '';
  const PW = staff ? `AND customer_id IN ${OWNED}` : '';
  const [funnel, byOwner, byTeam, actByUser, win, monthly] = await Promise.all([
    q(`SELECT s.seq, s.name, count(p.id)::int cnt, COALESCE(sum(p.estimated_value),0) value
       FROM pipeline_stage s LEFT JOIN project p ON p.stage_id=s.id AND p.company_id=$1 ${PJ}
       WHERE s.company_id=$1 GROUP BY s.seq,s.name ORDER BY s.seq`, A),
    q(`SELECT u.display_name AS name, count(p.id)::int deals,
         COALESCE(sum(p.estimated_value) FILTER (WHERE NOT p.is_open),0) won_value,
         COALESCE(sum(p.estimated_value) FILTER (WHERE p.is_open),0) open_value
       FROM app_user u LEFT JOIN project p ON p.owner_user_id=u.id ${PJ}
       WHERE u.company_id=$1 ${staff ? 'AND u.id=$2' : ''} GROUP BY u.display_name ORDER BY won_value DESC`, A),
    q(`SELECT t.name, count(p.id)::int deals, COALESCE(sum(p.estimated_value),0) value
       FROM team t LEFT JOIN project p ON p.owner_team_id=t.id ${PJ} WHERE t.company_id=$1 GROUP BY t.name ORDER BY value DESC`, A),
    q(`SELECT u.display_name AS name,
         count(a.id) FILTER (WHERE a.status='done')::int done,
         count(a.id) FILTER (WHERE a.status='pending')::int pending,
         count(a.id) FILTER (WHERE a.status='pending' AND a.due_at::date<CURRENT_DATE)::int overdue
       FROM app_user u LEFT JOIN activity a ON a.assignee_user_id=u.id ${staff ? `AND (a.assignee_user_id=$2 OR a.customer_id IN ${OWNED})` : ''}
       WHERE u.company_id=$1 ${staff ? 'AND u.id=$2' : ''} GROUP BY u.display_name ORDER BY done DESC`, A),
    q(`SELECT count(*) FILTER (WHERE NOT is_open)::int won, count(*) FILTER (WHERE is_open)::int open,
         COALESCE(sum(estimated_value) FILTER (WHERE NOT is_open),0) won_value,
         COALESCE(sum(estimated_value) FILTER (WHERE is_open),0) open_value FROM project WHERE company_id=$1 ${PW}`, A),
    q(`SELECT to_char(date_trunc('month',start_date),'YYYY-MM') AS month, count(*)::int deals, COALESCE(sum(estimated_value),0) value
       FROM project WHERE company_id=$1 AND start_date IS NOT NULL ${PW} GROUP BY 1 ORDER BY 1`, A),
  ]);
  const w = win.rows[0];
  const winRate = (w.won + w.open) ? Math.round(w.won / (w.won + w.open) * 100) : 0;
  res.json({ funnel: funnel.rows, byOwner: byOwner.rows, byTeam: byTeam.rows, activityByUser: actByUser.rows, win: { ...w, winRate }, monthly: monthly.rows });
}));

// รายงาน 1: ลำดับเซลส์ที่เข้าพบ/ติดต่อเอเจ้นท์เยอะสุด (ทุกช่องทาง) + แยกช่องทาง
router.get('/sales-activity', wrap(async (req, res) => {
  const c = cid(req); const staff = isStaff(req.user);
  const { from, to } = req.query;
  // include ALL users except admin (incl managers/Director), active, even with 0 activities
  const jc = ['a.assignee_user_id=u.id', 'a.company_id=$1']; const args = [c]; let i = 2;
  if (from) { jc.push(`a.activity_at::date >= $${i++}`); args.push(from); }
  if (to) { jc.push(`a.activity_at::date <= $${i++}`); args.push(to); }
  const uc = ["u.company_id=$1", "u.is_active=true", "lower(u.role) NOT IN ('admin','executive')"];
  if (staff) { uc.push(`u.id=$${i++}`); args.push(req.user.id); }
  const totals = (await q(`SELECT u.id AS uid, u.display_name AS name, count(a.id)::int total
    FROM app_user u LEFT JOIN activity a ON ${jc.join(' AND ')}
    WHERE ${uc.join(' AND ')} GROUP BY u.id,u.display_name ORDER BY total DESC, u.display_name`, args)).rows;
  const mWhere = ['a.company_id=$1']; const mArgs = [c]; let j = 2;
  if (from) { mWhere.push(`a.activity_at::date >= $${j++}`); mArgs.push(from); }
  if (to) { mWhere.push(`a.activity_at::date <= $${j++}`); mArgs.push(to); }
  if (staff) { mWhere.push(`a.assignee_user_id=$${j++}`); mArgs.push(req.user.id); }
  const methods = (await q(`SELECT a.assignee_user_id AS uid, COALESCE(cm.name,'-') AS method, count(*)::int n
    FROM activity a LEFT JOIN contact_method cm ON cm.id=a.contact_method_id
    WHERE ${mWhere.join(' AND ')} GROUP BY a.assignee_user_id,cm.name`, mArgs)).rows;
  const byU = {}; methods.forEach(m => { (byU[m.uid] = byU[m.uid] || {})[m.method] = m.n; });
  res.json({ rows: totals.map(r => ({ ...r, methods: byU[r.uid] || {} })) });
}));

// รายงาน 2: เซลส์คนนี้ไปเอเจ้นท์ไหนมาบ้าง
router.get('/sales-activity/:userId', wrap(async (req, res) => {
  const c = cid(req); const uid = +req.params.userId;
  if (isStaff(req.user) && uid !== req.user.id) return res.status(403).json({ error: 'ดูได้เฉพาะของตัวเอง' });
  const { from, to } = req.query;
  const where = ['a.company_id=$1', 'a.assignee_user_id=$2']; const args = [c, uid]; let i = 3;
  if (from) { where.push(`a.activity_at::date >= $${i++}`); args.push(from); }
  if (to) { where.push(`a.activity_at::date <= $${i++}`); args.push(to); }
  const rows = (await q(`SELECT a.customer_id, c2.name, count(*)::int n, max(a.activity_at) AS last_at
    FROM activity a LEFT JOIN customer c2 ON c2.id=a.customer_id
    WHERE ${where.join(' AND ')} GROUP BY a.customer_id,c2.name ORDER BY n DESC`, args)).rows;
  res.json({ rows });
}));

// รายงาน 3: ข้อมูล trip-line สำหรับ B2B dashboard (อ่านจาก DB ระบบ rate ผ่าน RATE_DATABASE_URL)
// รูปแบบตรงกับ RAW ใน love_andaman_b2b_dashboard.html: {cols, rows}
const { rq } = require('../rate-db');
const B2B_SQL = `
  SELECT COALESCE(NULLIF(b.bookingdate,''), substr(b.bookedat,1,10), b.createdat) AS bd,
         t.date AS td, COALESCE(r.name,'') AS route,
         b.agentid AS agid, COALESCE(a.name, b.agentid) AS ag, COALESCE(a.code,'') AS code,
         COALESCE(NULLIF(s.name,''), 'House') AS own,
         COALESCE(m.name, ms.name, '—') AS mkt,
         COALESCE(b.total,0)::numeric AS total, COALESCE(t.subtotal,0)::numeric AS sub,
         SUM(COALESCE(t.subtotal,0)) OVER (PARTITION BY b.id) AS sumsub,
         COUNT(*) OVER (PARTITION BY b.id) AS nlines,
         (COALESCE(t.pax_ad_fr,0)+COALESCE(t.pax_chd_fr,0)+COALESCE(t.pax_ad_th,0)+COALESCE(t.pax_chd_th,0))::int AS pax
  FROM operation_schemas.sb_bookings b
  JOIN operation_schemas.sb_bookings__trips t ON t.sb_bookings_id = b.id
  LEFT JOIN operation_schemas.routes r ON r.id = t.routeid
  LEFT JOIN operation_schemas.sb_agents a ON a.id = b.agentid
  LEFT JOIN operation_schemas.sb_sales s ON s.id = a.sales
  LEFT JOIN operation_schemas.sb_markets m ON m.id = a.market
  LEFT JOIN operation_schemas.sb_markets ms ON ms.id = b.marketsnapshot_market
  WHERE b.status = 'confirmed'`;
const famOf = (n) => /phi ?phi/i.test(n) ? 'Phi Phi' : /similan/i.test(n) ? 'Similan'
  : /surin/i.test(n) ? 'Surin' : /krabi/i.test(n) ? 'Krabi' : 'อื่นๆ';
let b2bCache = null; // {at, data} — กันยิง DB ระบบ rate ถี่เกิน
router.get('/b2b-dashboard', wrap(async (req, res) => {
  if (b2bCache && Date.now() - b2bCache.at < 60_000) return res.json(b2bCache.data);
  const { rows } = await rq(B2B_SQL);
  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  const out = rows
    .filter(r => isoDate.test(r.bd || '') && isoDate.test(r.td || '')) // ตัด booking ทดสอบที่วันที่ไม่ใช่ ISO
    .map(r => {
      const total = +r.total, sub = +r.sub, sumsub = +r.sumsub, n = +r.nlines;
      const rev = n === 1 ? total : sumsub > 0 ? total * sub / sumsub : total / n;
      return [r.bd, r.td, famOf(r.route), r.ag, r.agid, r.code, r.own, r.mkt, Math.round(rev), r.pax];
    });
  const data = {
    cols: ['bd', 'td', 'fam', 'ag', 'agid', 'code', 'own', 'mkt', 'rev', 'pax'],
    rows: out,
    meta: { lines: out.length, at: new Date().toISOString() },
  };
  b2bCache = { at: Date.now(), data };
  res.json(data);
}));

module.exports = router;
