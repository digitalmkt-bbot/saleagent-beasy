const router = require('express').Router();
const { q } = require('../db');
const { wrap } = require('./_util');

router.get('/agent-sales-7m', wrap(async (req, res) => {
const { agent, program } = req.query;
const where = ['1=1'];
const args = [];
let i = 1;
if (agent) {
where.push(`(r.agent_code = $${i} OR r.agent_id = $${i} OR r.agent_name ILIKE '%'||$${i}||'%' OR r.source_name ILIKE '%'||$${i}||'%')`);
args.push(agent); i++;
}
if (program) { where.push(`r.program = $${i}`); args.push(program); i++; }
const W = where.join(' AND ');
const [tot, byProg, topAg, progs] = await Promise.all([
q(`SELECT COALESCE(sum(amount_7m),0)::float total, count(DISTINCT COALESCE(agent_id, source_name))::int agents, count(DISTINCT program)::int programs, count(*)::int rows FROM report_agent_sales_7m_2026 r WHERE ${W}`, args),
q(`SELECT program, sum(amount_7m)::float amount FROM report_agent_sales_7m_2026 r WHERE ${W} GROUP BY program ORDER BY amount DESC`, args),
q(`SELECT COALESCE(r.agent_id, r.source_name) AS key, max(r.agent_id) AS agent_id, max(COALESCE(a.code, r.agent_code)) AS code, max(COALESCE(a.name, r.agent_name, r.source_name)) AS name, max(COALESCE(a.market, r.agent_market)) AS market, max(r.match_status) AS match_status, sum(r.amount_7m)::float AS total, count(DISTINCT r.program)::int AS programs FROM report_agent_sales_7m_2026 r LEFT JOIN sb_agents a ON a.id = r.agent_id WHERE ${W} GROUP BY COALESCE(r.agent_id, r.source_name) ORDER BY total DESC`, args),
q(`SELECT DISTINCT program FROM report_agent_sales_7m_2026 ORDER BY program`, []),
]);
res.json({ total: tot.rows[0], byProgram: byProg.rows, topAgents: topAg.rows, programs: progs.rows.map((x) => x.program) });
}));

module.exports = router;
