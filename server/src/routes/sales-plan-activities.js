const router = require('express').Router();
const { q, tx } = require('../db');
const { wrap } = require('./_util');
const { recalc } = require('./sales-plan-kpi');

const DOW = { 0: 7, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 };

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

// ตรวจสิทธิ์: กิจกรรมต้องอยู่ในแผนของบริษัทผู้ใช้
async function loadActivity(req) {
  const r = await q(
    `SELECT a.*, sp.company_id, sp.id AS plan_id FROM sales_plan_activity a
     JOIN sales_plan sp ON sp.id=a.sales_plan_id WHERE a.id=$1 AND sp.company_id=$2`,
    [req.params.activityId, req.user.company_id]);
  return r.rows[0];
}

router.get('/:activityId', wrap(async (req, res) => {
  const a = await loadActivity(req);
  if (!a) return res.status(404).json({ error: 'not found' });
  const segs = await q('SELECT segment_id, is_primary FROM sales_plan_activity_segment WHERE sales_plan_activity_id=$1', [a.id]);
  const mks = await q('SELECT market_id, is_primary FROM sales_plan_activity_market WHERE sales_plan_activity_id=$1', [a.id]);
  res.json({ ...a, segments: segs.rows, markets: mks.rows });
}));

router.put('/:activityId', wrap(async (req, res) => {
  const a = await loadActivity(req);
  if (!a) return res.status(404).json({ error: 'not found' });
  const b = req.body || {};
  const dow = b.activity_date ? DOW[new Date(b.activity_date).getDay()] : a.day_of_week;
  const out = await tx(async (cl) => {
    const r = await cl.query(
      `UPDATE sales_plan_activity SET activity_date=COALESCE($2,activity_date), day_of_week=$3,
         start_time=$4, end_time=$5, all_day=COALESCE($6,all_day), reminder_time=$7,
         customer_id=$8, prospect_id=$9, lead_id=$10, client_name=$11, contact_person=$12, phone=$13, email=$14,
         primary_segment_id=$15, primary_market_id=$16, activity_type_id=$17, objective_type_id=$18,
         objective_detail=$19, expected_result=$20, expected_value=COALESCE($21,expected_value),
         expected_pax=COALESCE($22,expected_pax), expected_closing_date=$23, priority_id=$24, location=$25,
         status=COALESCE($26,status), updated_at=now()
       WHERE id=$1 RETURNING *`,
      [a.id, b.activity_date || null, dow, b.start_time || null, b.end_time || null, b.all_day, b.reminder_time || null,
       b.customer_id || null, b.prospect_id || null, b.lead_id || null, b.client_name || null, b.contact_person || null, b.phone || null, b.email || null,
       b.primary_segment_id || null, b.primary_market_id || null, b.activity_type_id || null, b.objective_type_id || null,
       b.objective_detail || null, b.expected_result || null, b.expected_value, b.expected_pax, b.expected_closing_date || null, b.priority_id || null, b.location || null, b.status]);
    await syncLinks(cl, a.id, b.segments, b.markets, b.primary_segment_id, b.primary_market_id);
    return r.rows[0];
  });
  await recalc(a.plan_id);
  res.json(out);
}));

router.delete('/:activityId', wrap(async (req, res) => {
  const a = await loadActivity(req);
  if (!a) return res.status(404).json({ error: 'not found' });
  await q('DELETE FROM sales_plan_activity WHERE id=$1', [a.id]);
  await recalc(a.plan_id);
  res.json({ ok: true });
}));

// บันทึกผลจริง (Actual Result)
router.post('/:activityId/result', wrap(async (req, res) => {
  const a = await loadActivity(req);
  if (!a) return res.status(404).json({ error: 'not found' });
  const b = req.body || {};
  // กฎ: ถ้า result เป็น Follow-up Required ต้องมี next_follow_up_at
  if (b.result_type === 'Follow-up Required' && !b.next_follow_up_at)
    return res.status(400).json({ error: 'กรุณาระบุวันติดตามครั้งถัดไป' });
  const r = await q(
    `UPDATE sales_plan_activity SET actual_result=$2, result_type=$3, customer_feedback=$4, interest_level=$5,
       next_action=$6, next_follow_up_at=$7, estimated_deal_value=COALESCE($8,estimated_deal_value),
       estimated_pax=COALESCE($9,estimated_pax), closing_probability=$10, quotation_id=$11, proposal_id=$12,
       booking_id=$13, internal_note=$14, status=COALESCE($15,status), completed_at=now(), updated_at=now()
     WHERE id=$1 RETURNING *`,
    [a.id, b.actual_result || null, b.result_type || null, b.customer_feedback || null, b.interest_level || null,
     b.next_action || null, b.next_follow_up_at || null, b.estimated_deal_value, b.estimated_pax, b.closing_probability || null,
     b.quotation_id || null, b.proposal_id || null, b.booking_id || null, b.internal_note || null, b.status || 'completed']);
  await recalc(a.plan_id);
  res.json(r.rows[0]);
}));

router.post('/:activityId/complete', wrap(async (req, res) => {
  const a = await loadActivity(req);
  if (!a) return res.status(404).json({ error: 'not found' });
  // กฎ: completed ต้องมี actual_result
  const ar = (req.body && req.body.actual_result) || a.actual_result;
  if (!ar) return res.status(400).json({ error: 'กรุณาบันทึกผลลัพธ์จริงก่อนปิดกิจกรรม' });
  const r = await q(`UPDATE sales_plan_activity SET status='completed', actual_result=$2, completed_at=now(), updated_at=now() WHERE id=$1 RETURNING *`, [a.id, ar]);
  await recalc(a.plan_id);
  res.json(r.rows[0]);
}));

router.post('/:activityId/reschedule', wrap(async (req, res) => {
  const a = await loadActivity(req);
  if (!a) return res.status(404).json({ error: 'not found' });
  const b = req.body || {};
  const dow = b.activity_date ? DOW[new Date(b.activity_date).getDay()] : a.day_of_week;
  const r = await q(`UPDATE sales_plan_activity SET activity_date=$2, day_of_week=$3, start_time=$4, end_time=$5, status='rescheduled', updated_at=now() WHERE id=$1 RETURNING *`,
    [a.id, b.activity_date || a.activity_date, dow, b.start_time || a.start_time, b.end_time || a.end_time]);
  await recalc(a.plan_id);
  res.json(r.rows[0]);
}));

router.post('/:activityId/cancel', wrap(async (req, res) => {
  const a = await loadActivity(req);
  if (!a) return res.status(404).json({ error: 'not found' });
  const r = await q(`UPDATE sales_plan_activity SET status='cancelled', internal_note=COALESCE($2,internal_note), updated_at=now() WHERE id=$1 RETURNING *`,
    [a.id, (req.body && req.body.reason) || null]);
  await recalc(a.plan_id);
  res.json(r.rows[0]);
}));

// สร้าง Prospect ใหม่จากกิจกรรม (บันทึกลงตาราง customer เดิม lifecycle=prospect)
router.post('/:activityId/create-prospect', wrap(async (req, res) => {
  const a = await loadActivity(req);
  if (!a) return res.status(404).json({ error: 'not found' });
  const b = req.body || {};
  const name = b.name || a.client_name;
  if (!name) return res.status(400).json({ error: 'กรุณาระบุชื่อลูกค้า/บริษัท' });
  // ตรวจข้อมูลซ้ำจากชื่อ/เบอร์/อีเมล
  const dup = await q(`SELECT id,name FROM customer WHERE company_id=$1 AND (name ILIKE $2 OR (phone IS NOT NULL AND phone=$3) OR (email IS NOT NULL AND email=$4)) LIMIT 1`,
    [req.user.company_id, name, b.phone || a.phone || '', b.email || a.email || '']);
  if (dup.rows[0] && !b.force) return res.status(409).json({ error: 'พบข้อมูลลูกค้าที่อาจซ้ำ', duplicate: dup.rows[0] });
  const out = await tx(async (cl) => {
    const c = await cl.query(
      `INSERT INTO customer (company_id,name,phone,email,owner_user_id,lifecycle_stage,created_by) VALUES ($1,$2,$3,$4,$5,'prospect',$6) RETURNING *`,
      [req.user.company_id, name, b.phone || a.phone || null, b.email || a.email || null, req.user.id, req.user.id]);
    await cl.query('UPDATE sales_plan_activity SET prospect_id=$2, result_type=COALESCE(result_type,$3), updated_at=now() WHERE id=$1',
      [a.id, c.rows[0].id, 'New Prospect Created']);
    return c.rows[0];
  });
  await recalc(a.plan_id);
  res.status(201).json(out);
}));

// สร้างใบเสนอราคา/Proposal จากกิจกรรม (ใช้ตาราง quotation เดิม)
router.post('/:activityId/create-proposal', wrap(async (req, res) => {
  const a = await loadActivity(req);
  if (!a) return res.status(404).json({ error: 'not found' });
  const b = req.body || {};
  const code = 'QO#' + Date.now().toString().slice(-8);
  const out = await tx(async (cl) => {
    const qo = await cl.query(
      `INSERT INTO quotation (company_id,code,customer_id,issue_date,grand_total,status,owner_user_id) VALUES ($1,$2,$3,CURRENT_DATE,$4,'sent',$5) RETURNING *`,
      [req.user.company_id, code, a.customer_id || a.prospect_id || null, +b.grand_total || +a.expected_value || 0, req.user.id]);
    await cl.query('UPDATE sales_plan_activity SET proposal_id=$2, quotation_id=$2, result_type=$3, updated_at=now() WHERE id=$1',
      [a.id, qo.rows[0].id, 'Proposal Sent']);
    return qo.rows[0];
  });
  await recalc(a.plan_id);
  res.status(201).json(out);
}));

// สร้าง Task จากกิจกรรม (ใช้ตาราง activity เดิมเป็นงานติดตาม)
router.post('/:activityId/create-task', wrap(async (req, res) => {
  const a = await loadActivity(req);
  if (!a) return res.status(404).json({ error: 'not found' });
  if (!a.customer_id) return res.status(400).json({ error: 'กิจกรรมนี้ยังไม่ได้เชื่อมกับลูกค้าในระบบ' });
  const at = a.activity_date ? new Date(a.activity_date) : new Date();
  const r = await q(
    `INSERT INTO activity (company_id,customer_id,direction,activity_at,detail,is_follow_up,due_at,status,assignee_user_id,created_by)
     VALUES ($1,$2,'outbound',$3,$4,true,$5,'pending',$6,$6) RETURNING *`,
    [req.user.company_id, a.customer_id, at.toISOString(), a.objective_detail || 'Sales Plan activity', a.next_follow_up_at || at.toISOString(), req.user.id]);
  res.status(201).json(r.rows[0]);
}));

module.exports = router;
