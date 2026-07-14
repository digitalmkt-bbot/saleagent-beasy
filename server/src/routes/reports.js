const router = require('express').Router();
const { q } = require('../db');
const { wrap } = require('./_util');
const { isStaff, OWNED } = require('./_scope');
const cid = (req) => req.user.company_id;

// สรุปภาพรวมทั้งหมดสำหรับหน้ารายงาน
router.get('/summary', wrap(async (req, res) => {
  const c = cid(req);
  const staff = isStaff(req.user);
  const A = staff ? [c, req.user.id] : [c];
  const PJ = staff ? `AND p.customer_id IN ${OWNED}` : '';
  const AC = staff ? `AND (a.assignee_user_id=$2 OR a.customer_id IN ${OWNED})` : '';
  const PW = staff ? `AND customer_id IN ${OWNED}` : '';
  const [funnel, byOwner, byTeam, actByUser, win, monthly] = await Promise.all([
    q(`SELECT s.seq, s.name, count(p.id)::int cnt, COALESCE(sum(p.estimated_value),0) value
       FROM pipeline_stage s LEFT JOIN project p ON p.stage_id=s.id AND p.company_id=$1 ${PJ}
       WHERE s.company_id=$1 GROUP BY s.seq,s.name ORDER BY s.seq`, A),
    q(`SELECT u.display_name AS name, count(p.id)::int deals,
         COALESCE(sum(p.estimated_value) FILTER (WHERE NOT p.is_open),0) won_value,
         COALESCE(sum(p.estimated_value) FILTER (WHERE p.is_open),0) open_value
       FROM app_user u LEFT JOIN project p ON p.owner_user_id=u.id ${PJ}
       WHERE u.company_id=$1 ${staff ? 'AND u.id=$2' : ''} GROUP BY u.display_name ORDER BY won_value DESC`, A),
    q(`SELECT t.name, count(p.id)::int deals, COALESCE(sum(p.estimated_value),0) value
       FROM team t LEFT JOIN project p ON p.owner_team_id=t.id ${PJ} WHERE t.company_id=$1 GROUP BY t.name ORDER BY value DESC`, A),
    q(`SELECT u.display_name AS name,
         count(a.id) FILTER (WHERE a.status='done')::int done,
         count(a.id) FILTER (WHERE a.status='pending')::int pending,
         count(a.id) FILTER (WHERE a.status='pending' AND a.due_at::date<CURRENT_DATE)::int overdue
       FROM app_user u LEFT JOIN activity a ON a.assignee_user_id=u.id ${staff ? `AND (a.assignee_user_id=$2 OR a.customer_id IN ${OWNED})` : ''}
       WHERE u.company_id=$1 ${staff ? 'AND u.id=$2' : ''} GROUP BY u.display_name ORDER BY done DESC`, A),
    q(`SELECT count(*) FILTER (WHERE NOT is_open)::int won, count(*) FILTER (WHERE is_open)::int open,
         COALESCE(sum(estimated_value) FILTER (WHERE NOT is_open),0) won_value,
         COALESCE(sum(estimated_value) FILTER (WHERE is_open),0) open_value FROM project WHERE company_id=$1 ${PW}`, A),
    q(`SELECT to_char(date_trunc('month',start_date),'YYYY-MM') AS month, count(*)::int deals, COALESCE(sum(estimated_value),0) value
       FROM project WHERE company_id=$1 AND start_date IS NOT NULL ${PW} GROUP BY 1 ORDER BY 1`, A),
  ]);
  const w = win.rows[0];
  const winRate = (w.won + w.open) ? Math.round(w.won / (w.won + w.open) * 100) : 0;
  res.json({ funnel: funnel.rows, byOwner: byOwner.rows, byTeam: byTeam.rows, activityByUser: actByUser.rows, win: { ...w, winRate }, monthly: monthly.rows });
}));

module.exports = router;
