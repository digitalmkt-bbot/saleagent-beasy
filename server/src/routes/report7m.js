const router = require('express').Router();
const { q } = require('../db');
const { wrap } = require('./_util');

// Interactive agent × program × month comparison, linked to the CRM sales owner.
router.get('/agent-performance-monthly', wrap(async (req, res) => {
  const companyId = req.user.company_id;
  const monthResult = await q(`SELECT DISTINCT to_char(month,'YYYY-MM') AS month
    FROM agent_program_monthly_performance WHERE company_id=$1 ORDER BY month`, [companyId]);
  const months = monthResult.rows.map(x => x.month);
  const requestedA = /^\d{4}-\d{2}$/.test(req.query.monthA || '') ? req.query.monthA : '';
  const requestedB = /^\d{4}-\d{2}$/.test(req.query.monthB || '') ? req.query.monthB : '';
  const monthA = requestedA && months.includes(requestedA) ? requestedA : (months.at(-2) || months.at(-1) || '');
  const monthB = requestedB && months.includes(requestedB) ? requestedB : (months.at(-1) || '');

  const where = ['m.company_id=$1'];
  const args = [companyId];
  let i = 2;
  if (req.query.program) { where.push(`p.name=$${i++}`); args.push(req.query.program); }
  if (req.query.agent) {
    where.push(`(COALESCE(c.name,m.source_name) ILIKE '%'||$${i}||'%' OR COALESCE(m.rate_agent_id,'') ILIKE '%'||$${i}||'%')`);
    args.push(req.query.agent); i++;
  }
  // Sales users only see their own assigned agents. Managers/admins can select any owner.
  if (req.user.role === 'sales') {
    where.push(`c.owner_user_id=$${i++}`); args.push(req.user.id);
  } else if (req.query.owner === 'unassigned') {
    where.push('c.owner_user_id IS NULL');
  } else if (/^\d+$/.test(req.query.owner || '')) {
    where.push(`c.owner_user_id=$${i++}`); args.push(+req.query.owner);
  }
  const monthAParam = i++; args.push(`${monthA}-01`);
  const monthBParam = i++; args.push(`${monthB}-01`);

  const rows = monthA && monthB ? (await q(`WITH compared AS (
    SELECT COALESCE(m.customer_id::text,NULLIF(m.rate_agent_id,''),'name:'||lower(trim(m.source_name))) AS agent_key,
      max(m.customer_id) AS customer_id, max(NULLIF(m.rate_agent_id,'')) AS rate_agent_id,
      max(COALESCE(c.name,m.source_name)) AS agent_name,
      max(c.owner_user_id) AS owner_id, max(COALESCE(u.display_name,'Unassigned')) AS owner_name,
      p.name AS program,
      sum(m.sales_amount) FILTER (WHERE m.month=$${monthAParam}::date)::float AS amount_a,
      sum(m.sales_amount) FILTER (WHERE m.month=$${monthBParam}::date)::float AS amount_b
    FROM agent_program_monthly_performance m
    JOIN performance_program p ON p.id=m.program_id
    LEFT JOIN customer c ON c.id=m.customer_id
    LEFT JOIN app_user u ON u.id=c.owner_user_id
    WHERE ${where.join(' AND ')} AND m.month IN ($${monthAParam}::date,$${monthBParam}::date)
    GROUP BY 1,p.name
  ) SELECT *, COALESCE(amount_b,0)-COALESCE(amount_a,0) AS difference,
      CASE WHEN COALESCE(amount_a,0)=0 THEN NULL
        ELSE round(((COALESCE(amount_b,0)-amount_a)/amount_a*100)::numeric,1)::float END AS change_pct
    FROM compared ORDER BY COALESCE(amount_b,0) DESC,COALESCE(amount_a,0) DESC,agent_name`, args)).rows : [];

  const [programResult, ownerResult] = await Promise.all([
    q('SELECT name FROM performance_program WHERE company_id=$1 AND is_active ORDER BY name', [companyId]),
    req.user.role === 'sales'
      ? q('SELECT id,display_name FROM app_user WHERE id=$1', [req.user.id])
      : q(`SELECT u.id,u.display_name,count(DISTINCT c.id)::int AS assigned_agents
          FROM app_user u LEFT JOIN customer c ON c.owner_user_id=u.id
          WHERE u.company_id=$1 AND u.role IN ('sales','manager')
          GROUP BY u.id ORDER BY u.display_name`, [companyId]),
  ]);
  const amountA = rows.reduce((n, x) => n + (+x.amount_a || 0), 0);
  const amountB = rows.reduce((n, x) => n + (+x.amount_b || 0), 0);
  res.json({
    months, monthA, monthB, programs: programResult.rows.map(x => x.name), owners: ownerResult.rows,
    rows, summary: { amountA, amountB, difference: amountB - amountA,
      changePct: amountA ? Math.round((amountB - amountA) / amountA * 1000) / 10 : null,
      agents: new Set(rows.map(x => x.agent_key)).size },
  });
}));

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
      max(b.agent_code) AS code,
      max(COALESCE(b.agent_name, b.source_name)) AS name,
      max(b.agent_code) AS agent_code, max(b.agent_name) AS agent_name,
      max(b.source_name) AS source_name, max(b.agent_market) AS market,
      max(b.match_status) AS match_status, sum(b.amount_7m)::float AS total,
      count(DISTINCT b.program)::int AS programs
    FROM base b
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
