const router = require('express').Router();
const { q, tx } = require('../db');
const { wrap, num } = require('./_util');
const { isStaff, isAdmin } = require('./_scope');
const { recalc } = require('./sales-plan-kpi');

// ---- helpers ----
function isoWeek(d) {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((dt - yearStart) / 86400000) + 1) / 7);
  return { week, year: dt.getUTCFullYear() };
}
function mondayOf(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const day = d.getDay() || 7;              // Sun=0 -> 7
  d.setDate(d.getDate() - (day - 1));       // back to Monday
  d.setHours(0, 0, 0, 0);
  return d;
}
function fmt(d) { return d.toISOString().slice(0, 10); }
function genPlanNumber(userId, week, year) {
  return `SP#${year}${String(week).padStart(2, '0')}-${String(userId || 0).padStart(3, '0')}`;
}
// scope: sales เห็นเฉพาะของตัวเอง / manager,admin,executive เห็นทั้งบริษัท
function scopeWhere(user, alias, args) {
  if (isStaff(user)) { args.push(user.id); return ` AND (${alias}.user_id=$${args.length} OR ${alias}.manager_id=$${args.length})`; }
  return '';
}

// ---- LIST ----
router.get('/', wrap(async (req, res) => {
  const cid = req.user.company_id;
  const where = ['sp.company_id=$1']; const args = [cid];
  where.push('1=1' + scopeWhere(req.user, 'sp', args));
  const add = (cond, val) => { args.push(val); where.push(cond.replace('$$', '$' + args.length)); };
  if (req.query.user_id) add('sp.user_id=$$', +req.query.user_id);
  if (req.query.team_id) add('sp.team_id=$$', +req.query.team_id);
  if (req.query.manager_id) add('sp.manager_id=$$', +req.query.manager_id);
  if (req.query.status) add('sp.status=$$', req.query.status);
  if (req.query.week) add('sp.week_number=$$', +req.query.week);
  if (req.query.month) add("to_char(sp.start_date,'MM')=$$", String(req.query.month).padStart(2, '0'));
  if (req.query.year) add('sp.year=$$', +req.query.year);
  if (req.query.from) add('sp.end_date>=$$', req.query.from);
  if (req.query.to) add('sp.start_date<=$$', req.query.to);
  if (req.query.search) { args.push('%' + req.query.search + '%'); const p = '$' + args.length; where.push(`(sp.plan_number ILIKE ${p} OR u.display_name ILIKE ${p})`); }
  const W = where.join(' AND ');
  const rows = await q(
    `SELECT sp.*, u.display_name AS user_name, m.display_name AS manager_name, tm.name AS team_name,
       (SELECT count(*) FROM sales_plan_activity a WHERE a.sales_plan_id=sp.id)::int planned_count,
       (SELECT count(*) FROM sales_plan_activity a WHERE a.sales_plan_id=sp.id AND a.status IN ('completed','partially_completed'))::int done_count,
       (SELECT count(*) FROM sales_plan_activity a WHERE a.sales_plan_id=sp.id AND (a.result_type='Proposal Sent' OR a.proposal_id IS NOT NULL))::int proposal_count,
       (SELECT count(*) FROM sales_plan_activity a WHERE a.sales_plan_id=sp.id AND (a.result_type='Booking Closed' OR a.booking_id IS NOT NULL))::int booking_count,
       (SELECT count(*) FROM sales_plan_activity a WHERE a.sales_plan_id=sp.id AND (a.result_type='New Prospect Created' OR a.prospect_id IS NOT NULL))::int new_customer_count
     FROM sales_plan sp
       LEFT JOIN app_user u ON u.id=sp.user_id
       LEFT JOIN app_user m ON m.id=sp.manager_id
       LEFT JOIN team tm ON tm.id=sp.team_id
     WHERE ${W} ORDER BY sp.start_date DESC, sp.id DESC LIMIT ${num(req.query.limit, 100)}`, args);
  const out = rows.rows.map(r => ({ ...r, completion_pct: r.planned_count ? Math.round((r.done_count / r.planned_count) * 100) : 0 }));
  res.json({ rows: out });
}));

// ---- CREATE ----
router.post('/', wrap(async (req, res) => {
  const b = req.body || {};
  const cid = req.user.company_id;
  const userId = (isAdmin(req.user) && b.user_id) ? +b.user_id : req.user.id;
  const start = mondayOf(b.start_date);
  const end = new Date(start); end.setDate(start.getDate() + 6);
  const { week, year } = isoWeek(start);
  // กฎ: 1 คน 1 แผน/สัปดาห์ (เว้นแต่ admin)
  if (!isAdmin(req.user)) {
    const dup = await q('SELECT id FROM sales_plan WHERE company_id=$1 AND user_id=$2 AND start_date=$3', [cid, userId, fmt(start)]);
    if (dup.rows[0]) return res.status(409).json({ error: 'มีแผนของสัปดาห์นี้อยู่แล้ว', id: dup.rows[0].id });
  }
  const u = await q('SELECT team_id FROM app_user WHERE id=$1', [userId]);
  const out = await tx(async (cl) => {
    const pr = await cl.query(
      `INSERT INTO sales_plan (company_id,plan_number,user_id,team_id,manager_id,week_number,year,start_date,end_date,note,status,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft',$11) RETURNING *`,
      [cid, genPlanNumber(userId, week, year), userId, b.team_id || u.rows[0]?.team_id || null, b.manager_id || null,
       week, year, fmt(start), fmt(end), b.note || null, req.user.id]);
    return pr.rows[0];
  });
  await recalc(out.id);              // สร้างแถว target จาก template
  res.status(201).json(out);
}));

// ---- DETAIL ----
router.get('/:id', wrap(async (req, res) => {
  const cid = req.user.company_id;
  const p = await q(
    `SELECT sp.*, u.display_name AS user_name, m.display_name AS manager_name, tm.name AS team_name
     FROM sales_plan sp LEFT JOIN app_user u ON u.id=sp.user_id LEFT JOIN app_user m ON m.id=sp.manager_id
       LEFT JOIN team tm ON tm.id=sp.team_id WHERE sp.id=$1 AND sp.company_id=$2`, [req.params.id, cid]);
  if (!p.rows[0]) return res.status(404).json({ error: 'not found' });
  const acts = await q(
    `SELECT a.*, seg.name_en AS segment_name, mk.market_code, mk.country_name AS market_name,
       at.name_en AS activity_type_name, at.code AS activity_type_code, ob.name_en AS objective_name,
       cu.name AS customer_name
     FROM sales_plan_activity a
       LEFT JOIN sales_segment seg ON seg.id=a.primary_segment_id
       LEFT JOIN market mk ON mk.id=a.primary_market_id
       LEFT JOIN sales_plan_activity_type at ON at.id=a.activity_type_id
       LEFT JOIN sales_objective ob ON ob.id=a.objective_type_id
       LEFT JOIN customer cu ON cu.id=a.customer_id
     WHERE a.sales_plan_id=$1 ORDER BY a.activity_date NULLS LAST, a.start_time NULLS LAST, a.id`, [req.params.id]);
  const targets = await q('SELECT * FROM sales_plan_target WHERE sales_plan_id=$1 ORDER BY id', [req.params.id]);
  const reviews = await q(
    `SELECT r.*, u.display_name AS reviewer_name FROM sales_plan_review r
     LEFT JOIN app_user u ON u.id=r.reviewer_id WHERE r.sales_plan_id=$1 ORDER BY r.created_at DESC`, [req.params.id]);
  res.json({ ...p.rows[0], activities: acts.rows, targets: targets.rows, reviews: reviews.rows });
}));

// ---- UPDATE (header/summary) ----
router.put('/:id', wrap(async (req, res) => {
  const b = req.body || {};
  const cur = await q('SELECT status FROM sales_plan WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
  if (!cur.rows[0]) return res.status(404).json({ error: 'not found' });
  // แผนที่อนุมัติแล้วต้องมีเหตุผลถึงจะแก้หลักได้ (บันทึกลง review เป็น audit)
  const r = await q(
    `UPDATE sales_plan SET note=COALESCE($3,note), summary=COALESCE($4,summary), issues=COALESCE($5,issues),
       opportunities=COALESCE($6,opportunities), next_week_plan=COALESCE($7,next_week_plan),
       manager_id=COALESCE($8,manager_id), team_id=COALESCE($9,team_id), updated_at=now()
     WHERE id=$1 AND company_id=$2 RETURNING *`,
    [req.params.id, req.user.company_id, b.note, b.summary, b.issues, b.opportunities, b.next_week_plan, b.manager_id || null, b.team_id || null]);
  if (b.edit_reason && ['approved', 'completed', 'closed'].includes(cur.rows[0].status))
    await q(`INSERT INTO sales_plan_review (sales_plan_id,reviewer_id,action,comment,previous_status,new_status) VALUES ($1,$2,'edit',$3,$4,$4)`,
      [req.params.id, req.user.id, b.edit_reason, cur.rows[0].status]);
  res.json(r.rows[0]);
}));

router.delete('/:id', wrap(async (req, res) => {
  await q('DELETE FROM sales_plan WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
  res.json({ ok: true });
}));

// ---- WORKFLOW ----
async function transition(req, res, action, allowed, next, extra = {}) {
  const cid = req.user.company_id;
  const cur = await q('SELECT * FROM sales_plan WHERE id=$1 AND company_id=$2', [req.params.id, cid]);
  if (!cur.rows[0]) return res.status(404).json({ error: 'not found' });
  const prev = cur.rows[0].status;
  if (allowed && !allowed.includes(prev)) return res.status(400).json({ error: `ไม่สามารถ ${action} จากสถานะ ${prev}` });
  const sets = ['status=$3', 'updated_at=now()']; const args = [req.params.id, cid, next];
  for (const [col, val] of Object.entries(extra)) { args.push(val); sets.push(`${col}=$${args.length}`); }
  const r = await q(`UPDATE sales_plan SET ${sets.join(',')} WHERE id=$1 AND company_id=$2 RETURNING *`, args);
  await q(`INSERT INTO sales_plan_review (sales_plan_id,reviewer_id,action,comment,previous_status,new_status) VALUES ($1,$2,$3,$4,$5,$6)`,
    [req.params.id, req.user.id, action, (req.body && req.body.comment) || null, prev, next]);
  return r.rows[0];
}

router.post('/:id/submit', wrap(async (req, res) => {
  const r = await transition(req, res, 'submit', ['draft', 'revision_required'], 'submitted', { submitted_at: new Date().toISOString() });
  if (r) res.json(r);
}));
router.post('/:id/approve', wrap(async (req, res) => {
  if (isStaff(req.user)) return res.status(403).json({ error: 'เฉพาะผู้จัดการ/ผู้ดูแลระบบเท่านั้น' });
  const r = await transition(req, res, 'approve', ['submitted', 'pending_review'], 'approved',
    { approved_at: new Date().toISOString(), approved_by: req.user.id, reviewed_at: new Date().toISOString() });
  if (r) res.json(r);
}));
router.post('/:id/request-revision', wrap(async (req, res) => {
  if (isStaff(req.user)) return res.status(403).json({ error: 'เฉพาะผู้จัดการ/ผู้ดูแลระบบเท่านั้น' });
  const r = await transition(req, res, 'request_revision', ['submitted', 'pending_review'], 'revision_required', { reviewed_at: new Date().toISOString() });
  if (r) res.json(r);
}));
router.post('/:id/complete', wrap(async (req, res) => {
  const r = await transition(req, res, 'complete', ['approved', 'in_progress'], 'completed', { completed_at: new Date().toISOString() });
  if (r) { await recalc(req.params.id); res.json(r); }
}));
router.post('/:id/close', wrap(async (req, res) => {
  const r = await transition(req, res, 'close', ['completed', 'approved', 'in_progress'], 'closed');
  if (r) res.json(r);
}));

// ---- TARGETS ----
router.get('/:id/targets', wrap(async (req, res) => {
  const r = await recalc(req.params.id);
  res.json(r || { targets: [], overall_score: 0 });
}));
router.post('/:id/targets/recalculate', wrap(async (req, res) => {
  const r = await recalc(req.params.id);
  res.json(r || { targets: [], overall_score: 0 });
}));
// แก้ไขค่า target (manager/admin): min/full/weight
router.put('/:id/targets/:targetId', wrap(async (req, res) => {
  if (isStaff(req.user)) return res.status(403).json({ error: 'เฉพาะผู้จัดการ/ผู้ดูแลระบบเท่านั้น' });
  const b = req.body || {};
  const own = await q('SELECT sp.id FROM sales_plan_target t JOIN sales_plan sp ON sp.id=t.sales_plan_id WHERE t.id=$1 AND sp.company_id=$2', [req.params.targetId, req.user.company_id]);
  if (!own.rows[0]) return res.status(404).json({ error: 'not found' });
  await q(`UPDATE sales_plan_target SET minimum_target=COALESCE($2,minimum_target), full_target=COALESCE($3,full_target),
           weight_percentage=COALESCE($4,weight_percentage), updated_at=now() WHERE id=$1`,
    [req.params.targetId, b.minimum_target, b.full_target, b.weight_percentage]);
  const r = await recalc(req.params.id);
  res.json(r);
}));

// ---- SUMMARY ----
router.get('/:id/summary', wrap(async (req, res) => {
  const cid = req.user.company_id;
  const p = await q('SELECT * FROM sales_plan WHERE id=$1 AND company_id=$2', [req.params.id, cid]);
  if (!p.rows[0]) return res.status(404).json({ error: 'not found' });
  const kpi = await recalc(req.params.id);
  const agg = await q(
    `SELECT count(*)::int total,
       count(*) FILTER (WHERE status IN ('completed','partially_completed'))::int completed,
       count(*) FILTER (WHERE status='planned')::int planned,
       count(*) FILTER (WHERE status='cancelled')::int cancelled,
       COALESCE(sum(estimated_deal_value),0) pipeline_value,
       COALESCE(sum(CASE WHEN result_type='Booking Closed' OR booking_id IS NOT NULL THEN estimated_deal_value ELSE 0 END),0) booking_value
     FROM sales_plan_activity WHERE sales_plan_id=$1`, [req.params.id]);
  res.json({ plan: p.rows[0], kpi, activity: agg.rows[0] });
}));

// ---- DUPLICATE (สร้างแผนสัปดาห์ถัดไปจากของเดิม) ----
router.post('/:id/duplicate', wrap(async (req, res) => {
  const cid = req.user.company_id;
  const src = await q('SELECT * FROM sales_plan WHERE id=$1 AND company_id=$2', [req.params.id, cid]);
  if (!src.rows[0]) return res.status(404).json({ error: 'not found' });
  const s = src.rows[0];
  const start = new Date(s.start_date); start.setDate(start.getDate() + 7);
  const end = new Date(start); end.setDate(start.getDate() + 6);
  const { week, year } = isoWeek(start);
  const out = await tx(async (cl) => {
    const np = await cl.query(
      `INSERT INTO sales_plan (company_id,plan_number,user_id,team_id,manager_id,week_number,year,start_date,end_date,note,status,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft',$11) RETURNING *`,
      [cid, genPlanNumber(s.user_id, week, year), s.user_id, s.team_id, s.manager_id, week, year, fmt(start), fmt(end), s.note, req.user.id]);
    const acts = await cl.query('SELECT * FROM sales_plan_activity WHERE sales_plan_id=$1', [s.id]);
    for (const a of acts.rows) {
      const nd = a.activity_date ? new Date(a.activity_date) : null;
      if (nd) nd.setDate(nd.getDate() + 7);
      await cl.query(
        `INSERT INTO sales_plan_activity (sales_plan_id,activity_date,day_of_week,start_time,end_time,all_day,customer_id,client_name,contact_person,
           primary_segment_id,primary_market_id,activity_type_id,objective_type_id,objective_detail,expected_result,expected_value,expected_pax,priority_id,location,status,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'planned',$20)`,
        [np.rows[0].id, nd ? fmt(nd) : null, a.day_of_week, a.start_time, a.end_time, a.all_day, a.customer_id, a.client_name, a.contact_person,
         a.primary_segment_id, a.primary_market_id, a.activity_type_id, a.objective_type_id, a.objective_detail, a.expected_result, a.expected_value, a.expected_pax, a.priority_id, a.location, req.user.id]);
    }
    return np.rows[0];
  });
  await recalc(out.id);
  res.status(201).json(out);
}));

// ---- ACTIVITIES (nested) ----
const DOW = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 0: 7 };
async function syncLinks(cl, activityId, segments, markets, primarySeg, primaryMkt) {
  if (Array.isArray(segments)) {
    await cl.query('DELETE FROM sales_plan_activity_segment WHERE sales_plan_activity_id=$1', [activityId]);
    for (const s of segments) await cl.query('INSERT INTO sales_plan_activity_segment (sales_plan_activity_id,segment_id,is_primary) VALUES ($1,$2,$3)', [activityId, s, +s === +primarySeg]);
  }
  if (Array.isArray(markets)) {
    await cl.query('DELETE FROM sales_plan_activity_market WHERE sales_plan_activity_id=$1', [activityId]);
    for (const m of markets) await cl.query('INSERT INTO sales_plan_activity_market (sales_plan_activity_id,market_id,is_primary) VALUES ($1,$2,$3)', [activityId, m, +m === +primaryMkt]);
  }
}

router.get('/:id/activities', wrap(async (req, res) => {
  const acts = await q(
    `SELECT a.*, seg.name_en AS segment_name, mk.market_code, at.name_en AS activity_type_name, ob.name_en AS objective_name, cu.name AS customer_name
     FROM sales_plan_activity a
       LEFT JOIN sales_segment seg ON seg.id=a.primary_segment_id
       LEFT JOIN market mk ON mk.id=a.primary_market_id
       LEFT JOIN sales_plan_activity_type at ON at.id=a.activity_type_id
       LEFT JOIN sales_objective ob ON ob.id=a.objective_type_id
       LEFT JOIN customer cu ON cu.id=a.customer_id
     WHERE a.sales_plan_id=$1 ORDER BY a.activity_date NULLS LAST, a.start_time NULLS LAST, a.id`, [req.params.id]);
  res.json({ rows: acts.rows });
}));

router.post('/:id/activities', wrap(async (req, res) => {
  const b = req.body || {};
  const own = await q('SELECT id FROM sales_plan WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
  if (!own.rows[0]) return res.status(404).json({ error: 'not found' });
  const dow = b.activity_date ? DOW[new Date(b.activity_date).getDay()] : (b.day_of_week || null);
  const out = await tx(async (cl) => {
    const r = await cl.query(
      `INSERT INTO sales_plan_activity (sales_plan_id,activity_date,day_of_week,start_time,end_time,all_day,reminder_time,
         customer_id,prospect_id,lead_id,client_name,contact_person,phone,email,
         primary_segment_id,primary_market_id,activity_type_id,objective_type_id,objective_detail,expected_result,
         expected_value,expected_pax,expected_closing_date,priority_id,location,status,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,COALESCE($26,'planned'),$27) RETURNING *`,
      [req.params.id, b.activity_date || null, dow, b.start_time || null, b.end_time || null, !!b.all_day, b.reminder_time || null,
       b.customer_id || null, b.prospect_id || null, b.lead_id || null, b.client_name || null, b.contact_person || null, b.phone || null, b.email || null,
       b.primary_segment_id || null, b.primary_market_id || null, b.activity_type_id || null, b.objective_type_id || null, b.objective_detail || null, b.expected_result || null,
       +b.expected_value || 0, +b.expected_pax || 0, b.expected_closing_date || null, b.priority_id || null, b.location || null, b.status, req.user.id]);
    await syncLinks(cl, r.rows[0].id, b.segments, b.markets, b.primary_segment_id, b.primary_market_id);
    return r.rows[0];
  });
  await recalc(req.params.id);
  res.status(201).json(out);
}));

module.exports = router;
