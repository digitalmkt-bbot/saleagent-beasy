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

module.exports = router;
