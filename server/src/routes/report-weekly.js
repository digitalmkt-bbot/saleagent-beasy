// report-weekly.js — เปรียบเทียบยอด Agent รายสัปดาห์ จากยอด booking จริงในระบบ rate
// (คนละแหล่งกับยอด import รายเดือน — ตัวเลขอาจไม่ตรงกับหน้ารายเดือนเป๊ะ)
const router = require('express').Router();
const { wrap } = require('./_util');
const { rq, rateReady } = require('../rate-db');
const { rateScopeFor } = require('../rate-scope');

const isDate = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s : '');

router.get('/agent-performance-weekly', wrap(async (req, res) => {
  if (!rateReady()) return res.status(503).json({ error: 'ยังไม่ได้ตั้งค่า RATE_DATABASE_URL (เชื่อมระบบ rate ไม่ได้)' });
  const aFrom = isDate(req.query.aFrom), aTo = isDate(req.query.aTo);
  const bFrom = isDate(req.query.bFrom), bTo = isDate(req.query.bTo);
  if (!aFrom || !aTo || !bFrom || !bTo)
    return res.json({ rows: [], summary: {}, labelA: '', labelB: '', weekly: true });
  const agent = (req.query.agent || '').trim();

  const scope = await rateScopeFor(req.user);          // {all:true} หรือ {all:false, code: salesId}
  if (!scope.all && !scope.code) return res.json({ rows: [], summary: {}, labelA: `${aFrom}~${aTo}`, labelB: `${bFrom}~${bTo}`, weekly: true });

  // ยอด booking ต่อ agent ในหนึ่งช่วงสัปดาห์ (นับเฉพาะ confirmed) — รูปแบบเดียวกับ /rates report/agent-volume
  async function weekAgents(from, to) {
    const where = ["b.status='confirmed'",
      "COALESCE(NULLIF(b.bookingdate,''),b.createdat) >= $1",
      "COALESCE(NULLIF(b.bookingdate,''),b.createdat) <= $2"];
    const args = [from, to]; let i = 3;
    if (!scope.all) { where.push(`a.sales = $${i++}`); args.push(scope.code); }
    if (agent) { where.push(`(a.name ILIKE '%'||$${i}||'%' OR a.code ILIKE '%'||$${i}||'%' OR CAST(b.agentid AS text)=$${i})`); args.push(agent); i++; }
    const rows = (await rq(`SELECT b.agentid, max(a.name) AS name, max(a.code) AS code,
        max(s.fullname) AS owner_name, count(*)::int bookings, COALESCE(sum(b.total),0)::bigint revenue
      FROM operation_schemas.sb_bookings b
      LEFT JOIN operation_schemas.sb_agents a ON a.id=b.agentid
      LEFT JOIN operation_schemas.sb_sales s ON s.id=a.sales
      WHERE ${where.join(' AND ')}
      GROUP BY b.agentid`, args)).rows;
    return rows;
  }

  const [wa, wb] = await Promise.all([weekAgents(aFrom, aTo), weekAgents(bFrom, bTo)]);
  const map = new Map();
  const put = (r, key) => {
    const k = String(r.agentid);
    if (!map.has(k)) map.set(k, { agent_key: k, agent_name: r.name || ('#' + k), rate_agent_id: r.code || '', owner_name: r.owner_name || 'Unassigned', program: '', amount_a: 0, amount_b: 0 });
    const o = map.get(k);
    o[key] = +r.revenue || 0;
    if (r.name) o.agent_name = r.name;
    if (r.owner_name) o.owner_name = r.owner_name;
    if (r.code) o.rate_agent_id = r.code;
  };
  wa.forEach(r => put(r, 'amount_a'));
  wb.forEach(r => put(r, 'amount_b'));

  const rows = [...map.values()].map(o => {
    const diff = o.amount_b - o.amount_a;
    return { ...o, difference: diff, change_pct: o.amount_a ? Math.round((diff / o.amount_a) * 1000) / 10 : null };
  }).sort((x, y) => (y.amount_b || 0) - (x.amount_b || 0) || (y.amount_a || 0) - (x.amount_a || 0));

  const amountA = rows.reduce((n, x) => n + (+x.amount_a || 0), 0);
  const amountB = rows.reduce((n, x) => n + (+x.amount_b || 0), 0);
  res.json({
    weekly: true, labelA: `${aFrom}~${aTo}`, labelB: `${bFrom}~${bTo}`, rows,
    summary: { amountA, amountB, difference: amountB - amountA, changePct: amountA ? Math.round((amountB - amountA) / amountA * 1000) / 10 : null, agents: rows.length },
  });
}));

module.exports = router;
