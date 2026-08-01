// sales-plan-kpi.js — คำนวณ KPI ของ Sales Plan จากกิจกรรมจริง
const { q } = require('../db');

// จับคู่ประเภทกิจกรรม (activity_type.code) เข้ากับ KPI bucket
const CALL_TYPES = ['TELESALES', 'VIDEO_CALL', 'ONLINE_MEETING'];
const VISIT_TYPES = ['VISIT'];
const INSPECTION_TYPES = ['SITE_INSPECTION'];
const DONE = ['completed', 'partially_completed'];

// สถานะเป้าหมายจากค่า actual เทียบ min/full
function targetStatus(actual, min, full) {
  if (actual <= 0) return 'not_started';
  if (min > 0 && actual < min) return 'below_target';
  if (full > 0 && actual >= full) return actual > full ? 'exceeded_target' : 'target_achieved';
  if (min > 0 && actual >= min) return 'minimum_achieved';
  return 'on_track';
}

// นับ planned/actual ต่อ target_type จากกิจกรรมของแผน
function tally(acts) {
  const c = {
    sales_calls: { planned: 0, actual: 0 },
    sales_visits: { planned: 0, actual: 0 },
    new_prospect: { planned: 0, actual: 0 },
    proposal_sent: { planned: 0, actual: 0 },
    site_inspection: { planned: 0, actual: 0 },
    booking_closed: { planned: 0, actual: 0 },
  };
  for (const a of acts) {
    const code = (a.at_code || '').toUpperCase();
    const done = DONE.includes(String(a.status || '').toLowerCase());
    const rt = String(a.result_type || '').toLowerCase();
    if (CALL_TYPES.includes(code)) { c.sales_calls.planned++; if (done) c.sales_calls.actual++; }
    if (VISIT_TYPES.includes(code)) { c.sales_visits.planned++; if (done) c.sales_visits.actual++; }
    if (INSPECTION_TYPES.includes(code)) { c.site_inspection.planned++; if (done) c.site_inspection.actual++; }
    // ผลลัพธ์ (outcome-based) — planned นับจากที่ตั้งเป้า, actual นับจากผลจริง
    if (rt === 'new prospect created' || a.prospect_id) { c.new_prospect.planned++; if (rt === 'new prospect created' || done) c.new_prospect.actual++; }
    if (rt === 'proposal sent' || a.proposal_id) { c.proposal_sent.planned++; if (rt === 'proposal sent' || a.proposal_id) c.proposal_sent.actual++; }
    if (rt === 'booking closed' || rt === 'booking created' || a.booking_id) { c.booking_closed.planned++; if (rt === 'booking closed' || a.booking_id) c.booking_closed.actual++; }
  }
  return c;
}

// คำนวณใหม่และบันทึกลง sales_plan_target (สร้างแถวจาก template ถ้ายังไม่มี)
async function recalc(planId) {
  const plan = await q('SELECT company_id FROM sales_plan WHERE id=$1', [planId]);
  if (!plan.rows[0]) return null;
  const companyId = plan.rows[0].company_id;

  // สร้างแถว target จาก template ถ้าแผนยังไม่มี target เลย
  const existing = await q('SELECT * FROM sales_plan_target WHERE sales_plan_id=$1', [planId]);
  if (existing.rows.length === 0) {
    const tpl = await q(
      `SELECT DISTINCT ON (target_type) target_type, minimum_target, full_target, weight_percentage
       FROM sales_target_template WHERE company_id=$1 AND status='active'
       ORDER BY target_type, effective_date DESC NULLS LAST, id DESC`, [companyId]);
    for (const t of tpl.rows)
      await q(`INSERT INTO sales_plan_target (sales_plan_id,target_type,minimum_target,full_target,weight_percentage)
               VALUES ($1,$2,$3,$4,$5)`, [planId, t.target_type, t.minimum_target, t.full_target, t.weight_percentage]);
  }

  const acts = await q(
    `SELECT a.status, a.result_type, a.prospect_id, a.proposal_id, a.booking_id, t.code AS at_code
     FROM sales_plan_activity a
     LEFT JOIN sales_plan_activity_type t ON t.id=a.activity_type_id
     WHERE a.sales_plan_id=$1`, [planId]);
  const c = tally(acts.rows);

  const targets = await q('SELECT * FROM sales_plan_target WHERE sales_plan_id=$1', [planId]);
  for (const tg of targets.rows) {
    const b = c[tg.target_type] || { planned: 0, actual: 0 };
    const full = Number(tg.full_target) || 0;
    const min = Number(tg.minimum_target) || 0;
    const pct = full > 0 ? Math.round((b.actual / full) * 10000) / 100 : 0;
    const capped = Math.min(pct, 100);
    const weighted = Math.round((capped / 100) * (Number(tg.weight_percentage) || 0) * 100) / 100;
    const status = targetStatus(b.actual, min, full);
    await q(`UPDATE sales_plan_target SET planned_value=$2, actual_value=$3, achievement_percentage=$4,
             weighted_score=$5, target_status=$6, updated_at=now() WHERE id=$1`,
      [tg.id, b.planned, b.actual, pct, weighted, status]);
  }
  const fresh = await q('SELECT * FROM sales_plan_target WHERE sales_plan_id=$1 ORDER BY id', [planId]);
  const overall = fresh.rows.reduce((s, r) => s + Number(r.weighted_score || 0), 0);
  return { targets: fresh.rows, overall_score: Math.round(overall * 100) / 100 };
}

module.exports = { recalc, tally, targetStatus };
