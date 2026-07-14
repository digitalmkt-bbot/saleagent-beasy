const router = require('express').Router();
const { q } = require('../db');
const { wrap, num } = require('./_util');
const { isStaff } = require('./_scope');

const SELECT = `SELECT a.*, c.name AS customer_name, ct.name AS contact_name, p.name AS project_name,
  cm.name AS method_name, u.display_name AS assignee_name, pr.label AS priority_label,
  COALESCE((SELECT array_agg(t.name) FROM activity_tag at JOIN tag t ON t.id=at.tag_id WHERE at.activity_id=a.id),'{}') AS tags
  FROM activity a
    LEFT JOIN customer c ON c.id=a.customer_id
    LEFT JOIN contact ct ON ct.id=a.contact_id
    LEFT JOIN project p ON p.id=a.project_id
    LEFT JOIN contact_method cm ON cm.id=a.contact_method_id
    LEFT JOIN app_user u ON u.id=a.assignee_user_id
    LEFT JOIN priority pr ON pr.id=a.priority_id`;

router.get('/', wrap(async (req, res) => {
  const cid = req.user.company_id;
  const where = ['a.company_id=$1']; const args = [cid]; let i = 2;
  if (isStaff(req.user)) { where.push(`(a.assignee_user_id=$${i} OR a.customer_id IN (SELECT id FROM customer WHERE company_id=$1 AND owner_user_id=$${i}))`); args.push(req.user.id); i++; }
  if (req.query.status && req.query.status !== 'all') { where.push(`a.status=$${i++}`); args.push(req.query.status); }
  if (req.query.customer_id) { where.push(`a.customer_id=$${i++}`); args.push(+req.query.customer_id); }
  if (req.query.project_id) { where.push(`a.project_id=$${i++}`); args.push(+req.query.project_id); }
  if (req.query.assignee) { where.push(`a.assignee_user_id=$${i++}`); args.push(+req.query.assignee); }
  if (req.query.team) { where.push(`a.assignee_user_id IN (SELECT id FROM app_user WHERE team_id=$${i++})`); args.push(+req.query.team); }
  if (req.query.type !== undefined && req.query.type !== '') { where.push(`a.activity_type=$${i++}`); args.push(+req.query.type); }
  if (req.query.search) { where.push(`(a.detail ILIKE $${i} OR c.name ILIKE $${i} OR p.name ILIKE $${i})`); args.push('%' + req.query.search + '%'); i++; }
  if (req.query.bucket === 'today') where.push('a.due_at::date = CURRENT_DATE');
  if (req.query.bucket === 'upcoming') where.push('a.due_at::date > CURRENT_DATE');
  if (req.query.bucket === 'overdue') where.push("a.due_at::date < CURRENT_DATE AND a.status='pending'");
  const order = req.query.sort === 'priority' ? 'a.priority_id DESC NULLS LAST' : 'COALESCE(a.due_at,a.activity_at) ASC';
  const rows = await q(`${SELECT} WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ${num(req.query.limit, 200)}`, args);
  const buckets = await q(
    `SELECT count(*) FILTER (WHERE due_at::date=CURRENT_DATE)::int today,
            count(*) FILTER (WHERE due_at::date>CURRENT_DATE)::int upcoming,
            count(*) FILTER (WHERE due_at::date<CURRENT_DATE AND status='pending')::int overdue,
            count(*)::int all FROM activity WHERE company_id=$1`, [cid]);
  res.json({ rows: rows.rows, buckets: buckets.rows[0] });
}));

async function setTagsMentions(id, b, cid) {
  await q('DELETE FROM activity_tag WHERE activity_id=$1', [id]);
  for (const t of (b.tag_ids || [])) await q('INSERT INTO activity_tag (activity_id,tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [id, t]);
  await q('DELETE FROM activity_mention WHERE activity_id=$1', [id]);
  for (const u of (b.mentions || [])) await q('INSERT INTO activity_mention (activity_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [id, u]);
}

router.post('/', wrap(async (req, res) => {
  const b = req.body; const cid = req.user.company_id;
  const r = await q(
    `INSERT INTO activity (company_id,customer_id,contact_id,project_id,stage_id,direction,activity_type,activity_time,contact_method_id,
       activity_at,detail,image_url,is_follow_up,due_at,status,priority_id,assignee_user_id,created_by,check_in_at,check_out_at)
     VALUES ($1,$2,$3,$4,$5,COALESCE($6,'outbound'),$7,$8,$9,COALESCE($10,now()),$11,$12,COALESCE($13,false),$14,COALESCE($15,'done'),$16,$17,$18,$19,$20) RETURNING *`,
    [cid, b.customer_id, b.contact_id, b.project_id, b.stage_id, b.direction, b.activity_type, b.activity_time, b.contact_method_id,
     b.activity_at, b.detail, b.image_url, b.is_follow_up, b.due_at, b.status, b.priority_id, b.assignee_user_id || req.user.id, req.user.id, b.check_in_at || null, b.check_out_at || null]);
  await setTagsMentions(r.rows[0].id, b, cid);
  if (b.customer_id) await q('UPDATE customer SET last_activity_id=$1, updated_at=now() WHERE id=$2 AND company_id=$3', [r.rows[0].id, b.customer_id, cid]);
  res.status(201).json(r.rows[0]);
}));

router.put('/:id', wrap(async (req, res) => {
  const b = req.body;
  const r = await q(
    `UPDATE activity SET customer_id=$3,contact_id=$4,project_id=$5,stage_id=$6,direction=$7,activity_type=$8,activity_time=$9,
       contact_method_id=$10,activity_at=$11,detail=$12,image_url=$13,is_follow_up=$14,due_at=$15,status=$16,priority_id=$17,assignee_user_id=$18,check_in_at=$19,check_out_at=$20
     WHERE id=$1 AND company_id=$2 RETURNING *`,
    [req.params.id, req.user.company_id, b.customer_id, b.contact_id, b.project_id, b.stage_id, b.direction, b.activity_type, b.activity_time,
     b.contact_method_id, b.activity_at, b.detail, b.image_url, b.is_follow_up, b.due_at, b.status, b.priority_id, b.assignee_user_id, b.check_in_at || null, b.check_out_at || null]);
  if (!r.rows[0]) return res.status(404).json({ error: 'not found' });
  await setTagsMentions(req.params.id, b, req.user.company_id);
  res.json(r.rows[0]);
}));

router.patch('/:id', wrap(async (req, res) => {
  const r = await q('UPDATE activity SET status=COALESCE($3,status) WHERE id=$1 AND company_id=$2 RETURNING *',
    [req.params.id, req.user.company_id, req.body.status]);
  res.json(r.rows[0] || {});
}));

router.delete('/:id', wrap(async (req, res) => {
  await q('DELETE FROM activity WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
  res.json({ ok: true });
}));

module.exports = router;
