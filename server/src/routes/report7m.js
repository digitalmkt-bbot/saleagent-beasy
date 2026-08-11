const router = require('express').Router();
const { q } = require('../db');
const { wrap } = require('./_util');

router.get('/agent-sales-7m', wrap(async (req, res) => {
  const { agent, program } = req.query;
  const tier = /^[ABCD]$/.test(req.query.tier || '') ? req.query.tier : '';
  const args = [];
  let i = 1;
  const baseWhere = [];
  if (program) { baseWhere.push(`r.program = $${i++}`); args.push(program); }

  const selectedWhere = [];
  if (agent) {
    selectedWhere.push(`(agent_code = $${i} OR agent_id = $${i} OR agent_name ILIKE '%'||$${i}||'%' OR source_name ILIKE '%'||$${i}||'%')`);
    args.push(agent); i++;
  }
  if (tier) { selectedWhere.push(`tier = $${i++}`); args.push(tier); }

  // Tiers are equal-size revenue quartiles within the selected program:
  // A = highest quartile through D = lowest quartile.
  const cte = `WITH base AS (
    SELECT r.*, COALESCE(r.agent_id, r.source_name) AS agent_key
    FROM report_agent_sales_7m_2026 r
    ${baseWhere.length ? `WHERE ${baseWhere.join(' AND ')}` : ''}
  ), agent_totals AS (
    SELECT b.agent_key AS key, max(b.agent_id) AS agent_id,
      max(COALESCE(a.code, b.agent_code)) AS code,
      max(COALESCE(a.name, b.agent_name, b.source_name)) AS name,
      max(b.agent_code) AS agent_code, max(b.agent_name) AS agent_name,
      max(b.source_name) AS source_name,
      max(COALESCE(a.market, b.agent_market)) AS market,
      max(b.match_status) AS match_status, sum(b.amount_7m)::float AS total,
      count(DISTINCT b.program)::int AS programs
    FROM base b LEFT JOIN sb_agents a ON a.id = b.agent_id
    GROUP BY b.agent_key
  ), quartiles AS (
    SELECT agent_totals.*, ntile(4) OVER (ORDER BY total DESC, key) AS quartile
    FROM agent_totals
  ), ranked AS (
    SELECT quartiles.*, CASE quartile WHEN 1 THEN 'A' WHEN 2 THEN 'B' WHEN 3 THEN 'C' ELSE 'D' END AS tier
    FROM quartiles
  ), selected AS (
    SELECT * FROM ranked ${selectedWhere.length ? `WHERE ${selectedWhere.join(' AND ')}` : ''}
  )`;

  const [tot, byProg, topAg, tierSummary, progs] = await Promise.all([
    q(`${cte}, filtered AS (SELECT b.* FROM base b JOIN selected s ON s.key=b.agent_key)
      SELECT COALESCE(sum(amount_7m),0)::float total,
        count(DISTINCT agent_key)::int agents, count(DISTINCT program)::int programs,
        count(*)::int rows FROM filtered`, args),
    q(`${cte}, filtered AS (SELECT b.* FROM base b JOIN selected s ON s.key=b.agent_key)
      SELECT program, sum(amount_7m)::float amount FROM filtered GROUP BY program ORDER BY amount DESC`, args),
    q(`${cte} SELECT key, agent_id, code, name, market, match_status, total, programs, tier
      FROM selected ORDER BY total DESC, name`, args),
    q(`${cte} SELECT tier, count(*)::int agents, sum(total)::float total
      FROM ranked GROUP BY tier ORDER BY tier`, args),
    q('SELECT DISTINCT program FROM report_agent_sales_7m_2026 ORDER BY program'),
  ]);

  res.json({
    total: tot.rows[0],
    byProgram: byProg.rows,
    topAgents: topAg.rows,
    tierSummary: tierSummary.rows,
    programs: progs.rows.map((x) => x.program),
  });
}));

module.exports = router;
