const router = require('express').Router();
const { q } = require('../db');
const { wrap } = require('./_util');
const { isStaff, OWNED } = require('./_scope');
const cid = (req) => req.user.company_id;

const ACTIVITY_TYPES = ['โทรติดตาม','นัดหมาย','เข้าพบ/นำเสนอ','ส่งสัญญา','ติดตามชำระเงิน','อื่นๆ'];

router.get('/pipeline-stages', wrap(async (req, res) =>
  res.json({ rows: (await q('SELECT * FROM pipeline_stage WHERE company_id=$1 ORDER BY seq', [cid(req)])).rows })));

router.get('/teams', wrap(async (req, res) =>
  res.json({ rows: (await q('SELECT * FROM team WHERE company_id=$1 ORDER BY name', [cid(req)])).rows })));

router.get('/users', wrap(async (req, res) =>
  res.json({ rows: (await q('SELECT id,display_name,email,role,team_id FROM app_user WHERE company_id=$1 AND is_active ORDER BY display_name', [cid(req)])).rows })));

router.get('/activity-types', wrap(async (req, res) => res.json({ rows: ACTIVITY_TYPES })));

router.get('/lookups', wrap(async (req, res) => {
  const c = cid(req);
  const [priority, ptype, crole, cmethod, chat] = await Promise.all([
    q('SELECT * FROM priority ORDER BY id'),
    q('SELECT * FROM project_type WHERE company_id=$1 ORDER BY id', [c]),
    q('SELECT * FROM contact_role WHERE company_id=$1 ORDER BY name', [c]),
    q('SELECT * FROM contact_method WHERE company_id=$1 ORDER BY id', [c]),
    q('SELECT * FROM chat_channel ORDER BY name'),
  ]);
  res.json({ priority: priority.rows, project_type: ptype.rows, contact_role: crole.rows, contact_method: cmethod.rows, chat_channel: chat.rows, activity_types: ACTIVITY_TYPES });
}));

router.get('/notifications', wrap(async (req, res) => {
  const staff = isStaff(req.user);
  const rows = await q(
    `SELECT a.id, a.detail, a.due_at, a.status, c.name AS customer_name, u.display_name AS assignee_name,
       (a.due_at::date < CURRENT_DATE) AS overdue
     FROM activity a LEFT JOIN customer c ON c.id=a.customer_id LEFT JOIN app_user u ON u.id=a.assignee_user_id
     WHERE a.company_id=$1 AND a.status='pending' AND a.due_at::date <= CURRENT_DATE
       ${staff ? `AND (a.assignee_user_id=$2 OR a.customer_id IN ${OWNED})` : ''}
     ORDER BY a.due_at ASC LIMIT 50`,
    staff ? [cid(req), req.user.id] : [cid(req)]);
  res.json({ rows: rows.rows, count: rows.rows.length });
}));

router.get('/dashboard', wrap(async (req, res) => {
  const c = cid(req);
  const staff = isStaff(req.user);
  const A = staff ? [c, req.user.id] : [c];
  const CUST = staff ? 'AND owner_user_id=$2' : '';
  const PROJ = staff ? `AND customer_id IN ${OWNED}` : '';
  const ACT  = staff ? `AND (assignee_user_id=$2 OR customer_id IN ${OWNED})` : '';
  const PJOIN = staff ? `AND p.customer_id IN ${OWNED}` : '';
  const cust = await q(`SELECT count(*)::int total, count(*) FILTER (WHERE lifecycle_stage='new')::int new FROM customer WHERE company_id=$1 ${CUST}`, A);
  const proj = await q(`SELECT count(*)::int total, count(*) FILTER (WHERE is_open)::int open,
     COALESCE(sum(estimated_value) FILTER (WHERE is_open),0) pipeline_value,
     COALESCE(sum(estimated_value) FILTER (WHERE NOT is_open),0) won_value FROM project WHERE company_id=$1 ${PROJ}`, A);
  const act = await q(`SELECT count(*) FILTER (WHERE status='pending')::int pending,
     count(*) FILTER (WHERE due_at::date<CURRENT_DATE AND status='pending')::int overdue FROM activity WHERE company_id=$1 ${ACT}`, A);
  const byStage = await q(`SELECT s.seq, s.name, count(p.id)::int cnt, COALESCE(sum(p.estimated_value),0) value
     FROM pipeline_stage s LEFT JOIN project p ON p.stage_id=s.id AND p.is_open ${PJOIN}
     WHERE s.company_id=$1 GROUP BY s.seq,s.name ORDER BY s.seq`, A);
  res.json({ customers: cust.rows[0], projects: proj.rows[0], activities: act.rows[0], funnel: byStage.rows });
}));

router.get('/targets', wrap(async (req, res) =>
  res.json({ rows: (await q(`SELECT * FROM sales_target WHERE company_id=$1 AND period_date=CURRENT_DATE`, [cid(req)])).rows })));

module.exports = router;
