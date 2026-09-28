const router = require('express').Router();
const { q } = require('../db');
const { wrap } = require('./_util');
const { LIVE_FROM, isLiveMonth, liveMonths, liveMonthRows } = require('../live-performance');

// Interactive agent × program × month comparison, linked to the CRM sales owner.
// Months from LIVE_FROM on are read from live bookings in the rate system; earlier months
// come from the Excel import (agent_program_monthly_performance). See live-performance.js.
router.get('/agent-performance-monthly', wrap(async (req, res) => {
  const companyId = req.user.company_id;
  const monthResult = await q(`SELECT DISTINCT to_char(month,'YYYY-MM') AS month
    FROM agent_program_monthly_performance WHERE company_id=$1 ORDER BY month`, [companyId]);
  const imported = monthResult.rows.map(x => x.month).filter(m => !isLiveMonth(m));
  const months = [...new Set([...imported, ...await liveMonths()])].sort();
  const requestedA = /^\d{4}-\d{2}$/.test(req.query.monthA || '') ? req.query.monthA : '';
  const requestedB = /^\d{4}-\d{2}$/.test(req.query.monthB || '') ? req.query.monthB : '';
  const monthA = requestedA && months.includes(requestedA) ? requestedA : (months.at(-2) || months.at(-1) || '');
  const monthB = requestedB && months.includes(requestedB) ? requestedB : (months.at(-1) || '');

  const ownerFilter = req.user.role === 'sales' ? String(req.user.id)
    : req.query.owner === 'unassigned' ? 'unassigned'
    : /^\d+$/.test(req.query.owner || '') ? req.query.owner : '';
  const agentQ = String(req.query.agent || '').trim().toLowerCase();

  async function importedRows(month) {
    const where = ['m.company_id=$1', 'm.month=$2::date'];
    const args = [companyId, `${month}-01`];
    let i = 3;
    if (req.query.program) { where.push(`p.name=$${i++}`); args.push(req.query.program); }
    if (agentQ) {
      where.push(`(COALESCE(c.name,m.source_name) ILIKE '%'||$${i}||'%' OR COALESCE(m.rate_agent_id,'') ILIKE '%'||$${i}||'%')`);
      args.push(agentQ); i++;
    }
    // Sales users only see their own assigned agents. Managers/admins can select any owner.
    if (ownerFilter === 'unassigned') where.push('c.owner_user_id IS NULL');
    else if (ownerFilter) { where.push(`c.owner_user_id=$${i++}`); args.push(+ownerFilter); }
    return (await q(`SELECT COALESCE(m.customer_id::text,NULLIF(m.rate_agent_id,''),'name:'||lower(trim(m.source_name))) AS agent_key,
        max(NULLIF(m.rate_agent_id,'')) AS rate_agent_id, max(COALESCE(c.name,m.source_name)) AS agent_name,
        max(c.owner_user_id) AS owner_id, max(COALESCE(u.display_name,'Unassigned')) AS owner_name,
        p.name AS program, sum(m.sales_amount)::float AS amount
      FROM agent_program_monthly_performance m
      JOIN performance_program p ON p.id=m.program_id
      LEFT JOIN customer c ON c.id=m.customer_id
      LEFT JOIN app_user u ON u.id=c.owner_user_id
      WHERE ${where.join(' AND ')}
      GROUP BY 1,p.name`, args)).rows;
  }
  async function liveRows(month) {
    return (await liveMonthRows(companyId, month)).filter(r =>
      (!req.query.program || r.program === req.query.program) &&
      (!agentQ || [r.agent_name, r.agent_code, r.rate_agent_id].some(v => String(v || '').toLowerCase().includes(agentQ))) &&
      (ownerFilter === 'unassigned' ? !r.owner_id : !ownerFilter || String(r.owner_id) === ownerFilter));
  }
  const monthRows = m => !m ? [] : isLiveMonth(m) ? liveRows(m) : importedRows(m);

  const [rowsA, rowsB] = await Promise.all([monthRows(monthA), monthB === monthA ? [] : monthRows(monthB)]);
  const merged = new Map();
  const put = (r, key) => {
    const k = `${r.agent_key}|${r.program}`;
    if (!merged.has(k)) merged.set(k, { agent_key: r.agent_key, rate_agent_id: r.rate_agent_id || null, agent_name: r.agent_name,
      owner_id: r.owner_id || null, owner_name: r.owner_name || 'Unassigned', program: r.program, amount_a: null, amount_b: null });
    const o = merged.get(k);
    o[key] = (o[key] || 0) + (+r.amount || 0);
    if (!o.rate_agent_id && r.rate_agent_id) o.rate_agent_id = r.rate_agent_id;
    if (!o.owner_id && r.owner_id) { o.owner_id = r.owner_id; o.owner_name = r.owner_name; }
  };
  rowsA.forEach(r => put(r, 'amount_a'));
  (monthB === monthA ? rowsA : rowsB).forEach(r => put(r, 'amount_b'));
  const rows = [...merged.values()].map(o => {
    const a = o.amount_a || 0, b = o.amount_b || 0;
    return { ...o, difference: b - a, change_pct: a ? Math.round((b - a) / a * 1000) / 10 : null };
  }).sort((x, y) => (y.amount_b || 0) - (x.amount_b || 0) || (y.amount_a || 0) - (x.amount_a || 0)
    || String(x.agent_name).localeCompare(String(y.agent_name)));

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
    liveFrom: isLiveMonth(LIVE_FROM) ? LIVE_FROM : null,
    sources: { [monthA]: isLiveMonth(monthA) ? 'live' : 'import', [monthB]: isLiveMonth(monthB) ? 'live' : 'import' },
    rows, summary: { amountA, amountB, difference: amountB - amountA,
      changePct: amountA ? Math.round((amountB - amountA) / amountA * 1000) / 10 : null,
      agents: new Set(rows.map(x => x.agent_key)).size },
  });
}));

router.get('/agent-sales-7m', wrap(async (req, res) => {
  const companyId = req.user.company_id;
  const { agent, program } = req.query;
  const tier = /^[ABCD]$/.test(req.query.tier || '') ? req.query.tier : '';

  // Every imported month is selectable; the default range covers all of them.
  const monthResult = await q(`SELECT DISTINCT to_char(month,'YYYY-MM') AS month
    FROM agent_program_monthly_performance WHERE company_id=$1 ORDER BY month`, [companyId]);
  const months = monthResult.rows.map(x => x.month);
  const requested = key => /^\d{4}-\d{2}$/.test(req.query[key] || '') && months.includes(req.query[key]) ? req.query[key] : '';
  let from = requested('from') || months[0] || '';
  let to = requested('to') || months.at(-1) || '';
  if (from > to) [from, to] = [to, from];
  if (!months.length) {
    return res.json({ months, from, to, total: { total: 0, agents: 0, programs: 0, rows: 0 },
      byProgram: [], topAgents: [], tierSummary: [], programs: [],
      tierMethod: { type: 'cumulative_revenue', A: 70, B: 20, C: 8, D: 2 } });
  }

  const args = [companyId, `${from}-01`, `${to}-01`];
  let i = 4;
  const baseWhere = [];
  if (program) { baseWhere.push(`p.name = $${i++}`); args.push(program); }

  const selectedWhere = [];
  if (agent) {
    selectedWhere.push(`(agent_code = $${i} OR agent_id = $${i} OR agent_name ILIKE '%'||$${i}||'%' OR source_name ILIKE '%'||$${i}||'%')`);
    args.push(agent); i++;
  }
  if (tier) { selectedWhere.push(`tier = $${i++}`); args.push(tier); }

  // Revenue-contribution tiers within the selected program. Agents are sorted
  // high-to-low; the row crossing a boundary remains in the tier it helped fill.
  // A = first 70%, B = next 20%, C = next 8%, D = remaining 2%.
  const cte = `WITH base AS (
    SELECT p.name AS program, m.sales_amount::float AS amount,
      COALESCE(m.customer_id::text,NULLIF(m.rate_agent_id,''),'name:'||lower(trim(m.source_name))) AS agent_key,
      NULLIF(m.rate_agent_id,'') AS agent_id,
      COALESCE(NULLIF(m.rate_agent_id,''),c.ref_code) AS agent_code,
      c.name AS agent_name, m.source_name, m.market AS agent_market,
      CASE WHEN NULLIF(m.rate_agent_id,'') IS NOT NULL THEN 'matched'
        WHEN m.customer_id IS NOT NULL THEN 'name-matched' ELSE 'unmatched' END AS match_status
    FROM agent_program_monthly_performance m
    JOIN performance_program p ON p.id = m.program_id
    LEFT JOIN customer c ON c.id = m.customer_id
    WHERE m.company_id = $1 AND m.month BETWEEN $2::date AND $3::date
      ${baseWhere.length ? `AND ${baseWhere.join(' AND ')}` : ''}
  ), agent_totals AS (
    SELECT b.agent_key AS key, max(b.agent_id) AS agent_id,
      max(b.agent_code) AS code,
      max(COALESCE(b.agent_name, b.source_name)) AS name,
      max(b.agent_code) AS agent_code, max(b.agent_name) AS agent_name,
      max(b.source_name) AS source_name, max(b.agent_market) AS market,
      max(b.match_status) AS match_status, sum(b.amount)::float AS total,
      count(DISTINCT b.program)::int AS programs
    FROM base b
    GROUP BY b.agent_key
  ), revenue_ranked AS (
    SELECT agent_totals.*,
      COALESCE(sum(total) OVER (ORDER BY total DESC, key ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0) AS revenue_before,
      sum(total) OVER () AS revenue_all
    FROM agent_totals
  ), ranked AS (
    SELECT revenue_ranked.*,
      CASE WHEN revenue_all <= 0 THEN 'D'
        WHEN revenue_before / revenue_all < 0.70 THEN 'A'
        WHEN revenue_before / revenue_all < 0.90 THEN 'B'
        WHEN revenue_before / revenue_all < 0.98 THEN 'C'
        ELSE 'D' END AS tier
    FROM revenue_ranked
  ), selected AS (
    SELECT * FROM ranked ${selectedWhere.length ? `WHERE ${selectedWhere.join(' AND ')}` : ''}
  )`;

  const [tot, byProg, topAg, tierSummary, progs] = await Promise.all([
    q(`${cte}, filtered AS (SELECT b.* FROM base b JOIN selected s ON s.key=b.agent_key)
      SELECT COALESCE(sum(amount),0)::float total,
        count(DISTINCT agent_key)::int agents, count(DISTINCT program)::int programs,
        count(*)::int rows FROM filtered`, args),
    q(`${cte}, filtered AS (SELECT b.* FROM base b JOIN selected s ON s.key=b.agent_key)
      SELECT program, sum(amount)::float amount FROM filtered GROUP BY program ORDER BY amount DESC`, args),
    q(`${cte} SELECT key, agent_id, code, name, market, match_status, total, programs, tier
      FROM selected ORDER BY total DESC, name`, args),
    q(`${cte} SELECT tier, count(*)::int agents, sum(total)::float total
      FROM ranked GROUP BY tier ORDER BY tier`, args),
    q(`SELECT DISTINCT p.name AS program FROM performance_program p
      JOIN agent_program_monthly_performance m ON m.program_id = p.id
      WHERE m.company_id = $1 ORDER BY 1`, [companyId]),
  ]);

  res.json({
    months, from, to,
    total: tot.rows[0],
    byProgram: byProg.rows,
    topAgents: topAg.rows,
    tierSummary: tierSummary.rows,
    programs: progs.rows.map((x) => x.program),
    tierMethod: { type: 'cumulative_revenue', A: 70, B: 20, C: 8, D: 2 },
  });
}));

module.exports = router;
