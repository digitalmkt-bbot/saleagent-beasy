const router = require('express').Router();
const { q, tx } = require('../db');
const { wrap, num } = require('./_util');

function genCode() {
  const d = new Date(); const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0');
  return `PJ#${yy}${mm}${dd}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`;
}

router.get('/', wrap(async (req, res) => {
  const cid = req.user.company_id;
  const where = ['p.company_id=$1']; const args = [cid]; let i = 2;
  if (req.query.search) { where.push(`(p.code ILIKE $${i} OR p.name ILIKE $${i})`); args.push('%' + req.query.search + '%'); i++; }
  if (req.query.stage) { where.push(`p.stage_id=$${i++}`); args.push(+req.query.stage); }
  if (req.query.customer_id) { where.push(`p.customer_id=$${i++}`); args.push(+req.query.customer_id); }
  if (req.query.team) { where.push(`p.owner_team_id=$${i++}`); args.push(+req.query.team); }
  if (req.query.owner) { where.push(`p.owner_user_id=$${i++}`); args.push(+req.query.owner); }
  if (req.query.priority) { where.push(`p.priority_id=$${i++}`); args.push(+req.query.priority); }
  if (req.query.open === 'true') where.push('p.is_open=true');
  if (req.query.open === 'false') where.push('p.is_open=false');
  const W = where.join(' AND ');
  const rows = await q(
    `SELECT p.*, c.name AS customer_name, s.name AS stage_name, s.seq AS stage_seq,
            u.display_name AS owner_name, pr.label AS priority_label, pt.name AS type_name,
            (SELECT count(*) FROM activity a WHERE a.project_id=p.id)::int activity_count
     FROM project p LEFT JOIN customer c ON c.id=p.customer_id
       LEFT JOIN pipeline_stage s ON s.id=p.stage_id
       LEFT JOIN app_user u ON u.id=p.owner_user_id
       LEFT JOIN priority pr ON pr.id=p.priority_id
       LEFT JOIN project_type pt ON pt.id=p.project_type_id
     WHERE ${W} ORDER BY p.updated_at DESC LIMIT ${num(req.query.limit, 100)}`, args);
  const sum = await q(`SELECT COALESCE(sum(estimated_value),0) total FROM project p WHERE ${W}`, args);
  res.json({ rows: rows.rows, total_value: +sum.rows[0].total });
}));

router.get('/:id', wrap(async (req, res) => {
  const p = await q(`SELECT p.*, c.name AS customer_name, s.name AS stage_name, s.seq AS stage_seq,
      u.display_name AS owner_name, tm.name AS team_name, pr.label AS priority_label, pt.name AS type_name
    FROM project p LEFT JOIN customer c ON c.id=p.customer_id LEFT JOIN pipeline_stage s ON s.id=p.stage_id
      LEFT JOIN app_user u ON u.id=p.owner_user_id LEFT JOIN team tm ON tm.id=p.owner_team_id
      LEFT JOIN priority pr ON pr.id=p.priority_id LEFT JOIN project_type pt ON pt.id=p.project_type_id
    WHERE p.id=$1 AND p.company_id=$2`, [req.params.id, req.user.company_id]);
  if (!p.rows[0]) return res.status(404).json({ error: 'not found' });
  const rel = await q('SELECT r.*, c.name AS customer_name FROM project_related_customer r LEFT JOIN customer c ON c.id=r.customer_id WHERE r.project_id=$1', [req.params.id]);
  const acts = await q(`SELECT a.*, cm.name AS method_name,
      COALESCE((SELECT array_agg(t.name) FROM activity_tag at JOIN tag t ON t.id=at.tag_id WHERE at.activity_id=a.id),'{}') AS tags
     FROM activity a LEFT JOIN contact_method cm ON cm.id=a.contact_method_id WHERE a.project_id=$1 ORDER BY a.activity_at DESC LIMIT 50`, [req.params.id]);
  res.json({ ...p.rows[0], related: rel.rows, activities: acts.rows });
}));

router.post('/', wrap(async (req, res) => {
  const b = req.body; const cid = req.user.company_id;
  const out = await tx(async (cl) => {
    const pr = await cl.query(
      `INSERT INTO project (company_id,code,name,customer_id,place_name,address,province,district,reference_no,
         project_type_id,stage_id,estimated_value,start_date,end_date,is_open,priority_id,owner_user_id,owner_team_id,note,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,COALESCE($12,0),$13,$14,COALESCE($15,true),$16,$17,$18,$19,$20) RETURNING *`,
      [cid, b.code || genCode(), b.name, b.customer_id, b.place_name, b.address, b.province, b.district, b.reference_no,
       b.project_type_id, b.stage_id, b.estimated_value, b.start_date, b.end_date, b.is_open, b.priority_id, b.owner_user_id || req.user.id, b.owner_team_id, b.note, req.user.id]);
    for (const r of (b.related || []).slice(0, 10))
      await cl.query(`INSERT INTO project_related_customer (project_id,customer_id,contact_id,role,email,phone) VALUES ($1,$2,$3,$4,$5,$6)`,
        [pr.rows[0].id, r.customer_id, r.contact_id, r.role, r.email, r.phone]);
    return pr.rows[0];
  });
  res.status(201).json(out);
}));

router.put('/:id', wrap(async (req, res) => {
  const b = req.body;
  const r = await q(
    `UPDATE project SET name=COALESCE($3,name), customer_id=COALESCE($4,customer_id), stage_id=COALESCE($5,stage_id),
       estimated_value=COALESCE($6,estimated_value), is_open=COALESCE($7,is_open), priority_id=$8,
       project_type_id=$9, start_date=$10, end_date=$11, note=$12, updated_at=now()
     WHERE id=$1 AND company_id=$2 RETURNING *`,
    [req.params.id, req.user.company_id, b.name, b.customer_id, b.stage_id, b.estimated_value, b.is_open, b.priority_id, b.project_type_id, b.start_date, b.end_date, b.note]);
  if (!r.rows[0]) return res.status(404).json({ error: 'not found' });
  res.json(r.rows[0]);
}));

router.delete('/:id', wrap(async (req, res) => {
  await q('DELETE FROM project WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
  res.json({ ok: true });
}));

module.exports = router;
