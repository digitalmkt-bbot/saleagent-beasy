const router = require('express').Router();
const { q, tx } = require('../db');
const { wrap, num } = require('./_util');
const { isStaff } = require('./_scope');

router.get('/', wrap(async (req, res) => {
  const cid = req.user.company_id;
  const page = num(req.query.page, 1), limit = num(req.query.limit, 50);
  const off = (page - 1) * limit;
  const where = ['c.company_id = $1']; const args = [cid]; let i = 2;
  if (isStaff(req.user)) { where.push(`c.owner_user_id = $${i++}`); args.push(req.user.id); }
  if (req.query.search) { where.push(`(c.name ILIKE $${i} OR c.tax_id ILIKE $${i} OR EXISTS(SELECT 1 FROM contact ct WHERE ct.customer_id=c.id AND ct.name ILIKE $${i}))`); args.push('%' + req.query.search + '%'); i++; }
  if (req.query.followed === 'true') where.push('c.is_followed = true');
  if (req.query.followed === 'false') where.push('c.is_followed = false');
  if (req.query.owner) { where.push(`c.owner_user_id = $${i++}`); args.push(+req.query.owner); }
  if (req.query.team) { where.push(`c.owner_team_id = $${i++}`); args.push(+req.query.team); }
  if (req.query.lifecycle) { where.push(`c.lifecycle_stage = $${i++}`); args.push(req.query.lifecycle); }
  if (req.query.priority) { where.push(`c.priority_id = $${i++}`); args.push(+req.query.priority); }
  if (req.query.province) { where.push(`c.province = $${i++}`); args.push(req.query.province); }
  if (req.query.tag) { where.push(`EXISTS(SELECT 1 FROM customer_tag ct WHERE ct.customer_id=c.id AND ct.tag_id=$${i++})`); args.push(+req.query.tag); }
  const W = where.join(' AND ');
  const order = req.query.sort === 'rank'
    ? '(SELECT count(*) FROM activity a WHERE a.customer_id=c.id) DESC'
    : 'c.updated_at DESC';
  const list = await q(
    `SELECT c.*, u.display_name AS owner_name, pr.label AS priority_label,
       (SELECT ct.name FROM contact ct WHERE ct.customer_id=c.id AND ct.is_primary LIMIT 1) AS primary_contact,
       la.detail AS last_activity_detail, la.due_at AS last_activity_date,
       COALESCE((SELECT array_agg(t.name) FROM activity_tag at JOIN tag t ON t.id=at.tag_id WHERE at.activity_id=c.last_activity_id),'{}') AS last_activity_tags,
       COALESCE((SELECT array_agg(t.name) FROM customer_tag cct JOIN tag t ON t.id=cct.tag_id WHERE cct.customer_id=c.id),'{}') AS tags
     FROM customer c LEFT JOIN app_user u ON u.id=c.owner_user_id
       LEFT JOIN priority pr ON pr.id=c.priority_id
       LEFT JOIN activity la ON la.id=c.last_activity_id
     WHERE ${W} ORDER BY ${order} LIMIT ${limit} OFFSET ${off}`, args);
  const cnt = await q(`SELECT count(*) FROM customer c WHERE ${W}`, args);
  const stats = await q(
    `SELECT count(*)::int total,
       count(*) FILTER (WHERE lifecycle_stage='target')::int target,
       count(*) FILTER (WHERE lifecycle_stage='new')::int new,
       count(*) FILTER (WHERE lifecycle_stage='regular')::int regular,
       count(*) FILTER (WHERE lifecycle_stage='lapsed')::int lapsed,
       count(*) FILTER (WHERE is_followed)::int followed
     FROM customer WHERE company_id=$1`, [cid]);
  res.json({ rows: list.rows, total: +cnt.rows[0].count, page, limit, stats: stats.rows[0] });
}));

router.get('/:id', wrap(async (req, res) => {
  const cid = req.user.company_id;
  const c = await q(`SELECT c.*, u.display_name AS owner_name, tm.name AS team_name, pr.label AS priority_label
    FROM customer c LEFT JOIN app_user u ON u.id=c.owner_user_id LEFT JOIN team tm ON tm.id=c.owner_team_id
    LEFT JOIN priority pr ON pr.id=c.priority_id WHERE c.id=$1 AND c.company_id=$2`, [req.params.id, cid]);
  if (!c.rows[0]) return res.status(404).json({ error: 'not found' });
  if (isStaff(req.user) && c.rows[0].owner_user_id !== req.user.id) return res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึงเอเจ้นท์รายนี้' });
  const [contacts, branches, tags, projects, activities] = await Promise.all([
    q('SELECT * FROM contact WHERE customer_id=$1 ORDER BY is_primary DESC, id', [req.params.id]),
    q('SELECT * FROM customer_branch WHERE customer_id=$1 ORDER BY id', [req.params.id]),
    q('SELECT t.* FROM tag t JOIN customer_tag ct ON ct.tag_id=t.id WHERE ct.customer_id=$1', [req.params.id]),
    q('SELECT p.*, s.name AS stage_name, s.seq AS stage_seq FROM project p LEFT JOIN pipeline_stage s ON s.id=p.stage_id WHERE p.customer_id=$1 ORDER BY p.updated_at DESC', [req.params.id]),
    q(`SELECT a.*, cm.name AS method_name,
        COALESCE((SELECT array_agg(t.name) FROM activity_tag at JOIN tag t ON t.id=at.tag_id WHERE at.activity_id=a.id),'{}') AS tags
       FROM activity a LEFT JOIN contact_method cm ON cm.id=a.contact_method_id
       WHERE a.customer_id=$1 ORDER BY a.activity_at DESC LIMIT 50`, [req.params.id]),
  ]);
  res.json({ ...c.rows[0], contacts: contacts.rows, branches: branches.rows, tags: tags.rows, projects: projects.rows, activities: activities.rows });
}));

router.post('/', wrap(async (req, res) => {
  const cid = req.user.company_id; const b = req.body;
  const out = await tx(async (cl) => {
    const cr = await cl.query(
      `INSERT INTO customer (company_id,name,ref_code,tax_id,phone,phone_ext,email,country_code,address,province,district,priority_id,owner_user_id,owner_team_id,lifecycle_stage,is_followed,note,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,'TH'),$9,$10,$11,$12,$13,$14,COALESCE($15,'target'),COALESCE($16,true),$17,$18) RETURNING *`,
      [cid, b.name, b.ref_code, b.tax_id, b.phone, b.phone_ext, b.email, b.country_code, b.address, b.province, b.district, b.priority_id, b.owner_user_id, b.owner_team_id, b.lifecycle_stage, b.is_followed, b.note, req.user.id]);
    const cust = cr.rows[0];
    for (const ct of (b.contacts || []))
      await cl.query(`INSERT INTO contact (customer_id,name,is_primary,phone,phone_ext,position,role_id,email,chat_channel_id,chat_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [cust.id, ct.name, !!ct.is_primary, ct.phone, ct.phone_ext, ct.position, ct.role_id, ct.email, ct.chat_channel_id, ct.chat_id]);
    for (const br of (b.branches || []))
      await cl.query(`INSERT INTO customer_branch (customer_id,branch_name,address,country_code,province,district,is_registered) VALUES ($1,$2,$3,COALESCE($4,'TH'),$5,$6,$7)`,
        [cust.id, br.branch_name, br.address, br.country_code, br.province, br.district, !!br.is_registered]);
    for (const tid of (b.tag_ids || [])) await cl.query('INSERT INTO customer_tag (customer_id,tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [cust.id, tid]);
    return cust;
  });
  res.status(201).json(out);
}));

router.put('/:id', wrap(async (req, res) => {
  const b = req.body;
  const r = await q(
    `UPDATE customer SET name=COALESCE($3,name), ref_code=$4, tax_id=$5, phone=$6, email=$7, address=$8, province=$9, district=$10,
       priority_id=$11, owner_user_id=$12, owner_team_id=$13, lifecycle_stage=COALESCE($14,lifecycle_stage),
       is_followed=COALESCE($15,is_followed), note=$16, updated_at=now() WHERE id=$1 AND company_id=$2 RETURNING *`,
    [req.params.id, req.user.company_id, b.name, b.ref_code, b.tax_id, b.phone, b.email, b.address, b.province, b.district, b.priority_id, b.owner_user_id, b.owner_team_id, b.lifecycle_stage, b.is_followed, b.note]);
  if (!r.rows[0]) return res.status(404).json({ error: 'not found' });
  if (Array.isArray(b.tag_ids)) {
    await q('DELETE FROM customer_tag WHERE customer_id=$1', [req.params.id]);
    for (const tid of b.tag_ids) await q('INSERT INTO customer_tag (customer_id,tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.params.id, tid]);
  }
  res.json(r.rows[0]);
}));

router.delete('/:id', wrap(async (req, res) => {
  await q('DELETE FROM customer WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
  res.json({ ok: true });
}));

module.exports = router;
