const router = require('express').Router();
const { q, tx } = require('../db');
const { wrap } = require('./_util');
const { isStaff, OWNED } = require('./_scope');

router.get('/', wrap(async (req, res) => {
  const staff = isStaff(req.user);
  const args = staff ? [req.user.company_id, req.user.id] : [req.user.company_id];
  let sql = `SELECT q.*, c.name AS customer_name, p.name AS project_name
     FROM quotation q LEFT JOIN customer c ON c.id=q.customer_id
       LEFT JOIN project p ON p.id=q.project_id
     WHERE q.company_id=$1 ${staff ? `AND q.customer_id IN ${OWNED}` : ''}`;
  if (req.query.customer_id) { args.push(+req.query.customer_id); sql += ` AND q.customer_id = $${args.length}`; }
  sql += ` ORDER BY q.created_at DESC LIMIT 100`;
  const rows = await q(sql, args);
  res.json({ rows: rows.rows });
}));

router.get('/:id', wrap(async (req, res) => {
  const h = await q('SELECT * FROM quotation WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
  if (!h.rows[0]) return res.status(404).json({ error: 'not found' });
  const items = await q('SELECT * FROM quotation_item WHERE quotation_id=$1 ORDER BY id', [req.params.id]);
  res.json({ ...h.rows[0], items: items.rows });
}));

router.post('/', wrap(async (req, res) => {
  const b = req.body; const cid = req.user.company_id;
  const code = b.code || 'QT-' + Date.now();
  const out = await tx(async (cl) => {
    let sub = 0; (b.items || []).forEach(it => { sub += (+it.qty || 0) * (+it.unit_price || 0); });
    const vat = b.vat != null ? +b.vat : +(sub * 0.07).toFixed(2);
    const grand = sub - (+b.discount || 0) + vat;
    const h = await cl.query(
      `INSERT INTO quotation (company_id,code,project_id,customer_id,contact_id,issue_date,valid_until,subtotal,discount,vat,grand_total,status,owner_user_id)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6,CURRENT_DATE),$7,$8,COALESCE($9,0),$10,$11,COALESCE($12,'draft'),$13) RETURNING *`,
      [cid, code, b.project_id, b.customer_id, b.contact_id, b.issue_date, b.valid_until, sub, b.discount, vat, grand, b.status, req.user.id]);
    for (const it of (b.items || [])) {
      const amt = (+it.qty || 0) * (+it.unit_price || 0);
      await cl.query('INSERT INTO quotation_item (quotation_id,description,qty,unit_price,amount) VALUES ($1,$2,$3,$4,$5)',
        [h.rows[0].id, it.description, it.qty || 1, it.unit_price || 0, amt]);
    }
    return h.rows[0];
  });
  res.status(201).json(out);
}));

module.exports = router;
