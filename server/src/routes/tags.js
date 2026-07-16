const router = require('express').Router();
const { q } = require('../db');
const { wrap } = require('./_util');

router.get('/', wrap(async (req, res) => {
  const args = [req.user.company_id]; let sql = 'SELECT * FROM tag WHERE company_id=$1';
  if (req.query.scope) { sql += ' AND scope=$2'; args.push(req.query.scope); }
  sql += ' ORDER BY tag_group, name';
  res.json({ rows: (await q(sql, args)).rows });
}));

router.post('/', wrap(async (req, res) => {
  const b = req.body;
  const r = await q('INSERT INTO tag (company_id,name,tag_group,scope,color) VALUES ($1,$2,$3,COALESCE($4,\'customer\'),$5) RETURNING *',
    [req.user.company_id, b.name, b.tag_group, b.scope, b.color]);
  res.status(201).json(r.rows[0]);
}));

router.delete('/:id', wrap(async (req, res) => {
  const id = +req.params.id;
  const tg = (await q('SELECT id FROM tag WHERE id=$1 AND company_id=$2', [id, req.user.company_id])).rows[0];
  if (!tg) return res.status(404).json({ error: 'ไม่พบแท็ก' });
  await q('DELETE FROM customer_tag WHERE tag_id=$1', [id]);
  await q('DELETE FROM activity_tag WHERE tag_id=$1', [id]);
  await q('DELETE FROM tag WHERE id=$1 AND company_id=$2', [id, req.user.company_id]);
  res.json({ ok: true });
}));

module.exports = router;
