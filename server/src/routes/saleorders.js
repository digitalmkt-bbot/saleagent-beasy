const router = require('express').Router();
const { q } = require('../db');
const { wrap } = require('./_util');

router.get('/', wrap(async (req, res) => {
  const rows = await q(
    `SELECT so.*, c.name AS customer_name, p.name AS project_name, u.display_name AS owner_name
     FROM sale_order so LEFT JOIN customer c ON c.id=so.customer_id
       LEFT JOIN project p ON p.id=so.project_id LEFT JOIN app_user u ON u.id=so.created_by
     WHERE so.company_id=$1 ORDER BY so.created_at DESC LIMIT 100`, [req.user.company_id]);
  res.json({ rows: rows.rows });
}));

router.post('/', wrap(async (req, res) => {
  const b = req.body;
  const r = await q(
    `INSERT INTO sale_order (company_id,code,quotation_id,project_id,customer_id,order_date,grand_total,status,created_by)
     VALUES ($1,$2,$3,$4,$5,COALESCE($6,CURRENT_DATE),COALESCE($7,0),COALESCE($8,'open'),$9) RETURNING *`,
    [req.user.company_id, b.code || 'SO-' + Date.now(), b.quotation_id, b.project_id, b.customer_id, b.order_date, b.grand_total, b.status, req.user.id]);
  res.status(201).json(r.rows[0]);
}));

// แปลงใบเสนอราคา -> ใบสั่งขาย
router.post('/from-quotation/:qid', wrap(async (req, res) => {
  const cid = req.user.company_id;
  const qh = (await q('SELECT * FROM quotation WHERE id=$1 AND company_id=$2', [req.params.qid, cid])).rows[0];
  if (!qh) return res.status(404).json({ error: 'quotation not found' });
  const code = 'SO-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + Math.floor(Math.random() * 9000 + 1000);
  const r = await q(
    `INSERT INTO sale_order (company_id,code,quotation_id,project_id,customer_id,order_date,grand_total,status,created_by)
     VALUES ($1,$2,$3,$4,$5,CURRENT_DATE,$6,'open',$7) RETURNING *`,
    [cid, code, qh.id, qh.project_id, qh.customer_id, qh.grand_total, req.user.id]);
  await q(`UPDATE quotation SET status='accepted' WHERE id=$1`, [qh.id]);
  res.status(201).json(r.rows[0]);
}));

module.exports = router;
