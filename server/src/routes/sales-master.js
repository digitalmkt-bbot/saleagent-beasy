// sales-master.js — master data ของ Sales Plan (mount ที่ /api)
const router = require('express').Router();
const { q } = require('../db');
const { wrap } = require('./_util');
const { isAdmin } = require('./_scope');
const cid = (req) => req.user.company_id;
const adminOnly = (req, res, next) => isAdmin(req.user) ? next() : res.status(403).json({ error: 'เฉพาะผู้ดูแลระบบ' });

// ---- Segments ----
router.get('/sales-segments', wrap(async (req, res) =>
  res.json({ rows: (await q(`SELECT * FROM sales_segment WHERE company_id=$1 AND status='active' ORDER BY display_order,id`, [cid(req)])).rows })));
router.post('/sales-segments', adminOnly, wrap(async (req, res) => {
  const b = req.body || {};
  const r = await q(`INSERT INTO sales_segment (company_id,code,name_en,name_th,description,display_order) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [cid(req), b.code, b.name_en || b.name, b.name_th || b.name, b.description || null, +b.display_order || 0]);
  res.status(201).json(r.rows[0]);
}));
router.put('/sales-segments/:id', adminOnly, wrap(async (req, res) => {
  const b = req.body || {};
  const r = await q(`UPDATE sales_segment SET name_en=COALESCE($3,name_en), name_th=COALESCE($4,name_th), description=COALESCE($5,description), status=COALESCE($6,status), display_order=COALESCE($7,display_order) WHERE id=$1 AND company_id=$2 RETURNING *`,
    [req.params.id, cid(req), b.name_en, b.name_th, b.description, b.status, b.display_order]);
  if (!r.rows[0]) return res.status(404).json({ error: 'not found' });
  res.json(r.rows[0]);
}));

// ---- Activity types ----
router.get('/sales-activity-types', wrap(async (req, res) =>
  res.json({ rows: (await q(`SELECT * FROM sales_plan_activity_type WHERE company_id=$1 AND status='active' ORDER BY display_order,id`, [cid(req)])).rows })));
router.post('/sales-activity-types', adminOnly, wrap(async (req, res) => {
  const b = req.body || {};
  const r = await q(`INSERT INTO sales_plan_activity_type (company_id,code,name_en,name_th,description,display_order) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [cid(req), b.code, b.name_en || b.name, b.name_th || b.name, b.description || null, +b.display_order || 0]);
  res.status(201).json(r.rows[0]);
}));

// ---- Objectives ----
router.get('/sales-objectives', wrap(async (req, res) =>
  res.json({ rows: (await q(`SELECT * FROM sales_objective WHERE company_id=$1 AND status='active' ORDER BY display_order,id`, [cid(req)])).rows })));
router.post('/sales-objectives', adminOnly, wrap(async (req, res) => {
  const b = req.body || {};
  const r = await q(`INSERT INTO sales_objective (company_id,code,name_en,name_th,description,display_order) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [cid(req), b.code, b.name_en || b.name, b.name_th || b.name, b.description || null, +b.display_order || 0]);
  res.status(201).json(r.rows[0]);
}));

// ---- Markets (global) ----
router.get('/markets', wrap(async (req, res) =>
  res.json({ rows: (await q(`SELECT * FROM market WHERE status='active' ORDER BY display_order,market_code`)).rows })));
router.get('/markets/:code', wrap(async (req, res) => {
  const r = await q('SELECT * FROM market WHERE market_code=$1', [String(req.params.code).toUpperCase()]);
  if (!r.rows[0]) return res.status(404).json({ error: 'not found' });
  res.json(r.rows[0]);
}));

// ---- Target templates ----
router.get('/sales-target-templates', wrap(async (req, res) =>
  res.json({ rows: (await q(`SELECT * FROM sales_target_template WHERE company_id=$1 ORDER BY target_type,id`, [cid(req)])).rows })));
router.post('/sales-target-templates', adminOnly, wrap(async (req, res) => {
  const b = req.body || {};
  const r = await q(
    `INSERT INTO sales_target_template (company_id,target_name,target_type,minimum_target,full_target,measurement_unit,team_id,user_id,effective_date,expiry_date,weight_percentage,status,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,COALESCE($12,'active'),$13) RETURNING *`,
    [cid(req), b.target_name || null, b.target_type, +b.minimum_target || 0, +b.full_target || 0, b.measurement_unit || null,
     b.team_id || null, b.user_id || null, b.effective_date || null, b.expiry_date || null, +b.weight_percentage || 0, b.status, req.user.id]);
  res.status(201).json(r.rows[0]);
}));
router.put('/sales-target-templates/:id', adminOnly, wrap(async (req, res) => {
  const b = req.body || {};
  const r = await q(
    `UPDATE sales_target_template SET target_name=COALESCE($3,target_name), minimum_target=COALESCE($4,minimum_target),
       full_target=COALESCE($5,full_target), measurement_unit=COALESCE($6,measurement_unit), team_id=$7, user_id=$8,
       effective_date=$9, expiry_date=$10, weight_percentage=COALESCE($11,weight_percentage), status=COALESCE($12,status), updated_at=now()
     WHERE id=$1 AND company_id=$2 RETURNING *`,
    [req.params.id, cid(req), b.target_name, b.minimum_target, b.full_target, b.measurement_unit, b.team_id || null, b.user_id || null,
     b.effective_date || null, b.expiry_date || null, b.weight_percentage, b.status]);
  if (!r.rows[0]) return res.status(404).json({ error: 'not found' });
  res.json(r.rows[0]);
}));

module.exports = router;
