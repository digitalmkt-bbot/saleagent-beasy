// live-performance.js — ยอดขาย Agent × โปรแกรม × เดือน จาก booking จริงในระบบ rate (RATE_DATABASE_URL)
// สูตรเดียวกับ Data sheet ในไฟล์ "สรุปยอดขาย" ที่เคย import: นับตาม "วันเดินทาง" (trip date) เฉพาะ confirmed
// และแบ่ง b.total ลงแต่ละ trip line ตามสัดส่วน subtotal (สูตรเดียวกับ /reports/b2b-dashboard)
// ตรวจกับไฟล์ ก.ค. 2026 แล้ว: ยอดรายโปรแกรมต่างกันไม่เกิน ~1%
const { q } = require('./db');
const { rq, rateReady } = require('./rate-db');

// route name -> performance_program.code (the 7 programs of the Excel workbook); other routes
// (transfers, shows, parks) are not in the workbook either and are left out.
// Match on the code, never the name: the display name differs between environments (prod calls
// whale-shark "Whale Shark (PP+Maiton)"), and the page filters and merges rows by that exact name.
// Order matters: Whale Shark is a Phi Phi trip, and the Khao Lak airport transfer mentions Phang Nga.
const PROGRAM_RULES = [
  [/whale|maiton/i, 'whale-shark', 'Phi Phi Maiton (Whale Shark)'],
  [/similan/i, 'similan', 'Similan'],
  [/phi ?phi/i, 'phi-phi-special', 'Phi Phi Special'],
  [/surin/i, 'surin', 'Surin'],
  [/krabi/i, 'krabi-phang-nga', 'Krabi + Phang Nga'],
  [/nyaung/i, 'nyaung-oo-phee', 'Nyaung Oo Phee'],
  [/se ?la ?va/i, 'se-la-va', 'Se La Va'],
];
const programRule = route => PROGRAM_RULES.find(([re]) => re.test(route || '')) || null;

// Trips booked ahead would otherwise make a future month the default comparison.
const bangkokMonth = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 7);
const nextMonth = m => { const [y, mo] = m.split('-').map(Number); return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`; };

// Months that have confirmed trips, from fromMonth up to the current month.
async function liveMonths(fromMonth) {
  if (!rateReady()) return [];
  const { rows } = await rq(`SELECT DISTINCT substr(t.date,1,7) AS m
    FROM operation_schemas.sb_bookings b
    JOIN operation_schemas.sb_bookings__trips t ON t.sb_bookings_id = b.id
    WHERE b.status = 'confirmed' AND t.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      AND substr(t.date,1,7) BETWEEN $1 AND $2
    ORDER BY 1`, [fromMonth, bangkokMonth()]);
  return rows.map(r => r.m);
}

// Live sales per agent × program over fromMonth..toMonth (inclusive), in the row shape of the
// import queries in report7m.js. The revenue split is computed over every trip of a booking before
// the month filter, so a booking whose trips fall in two months is shared between them, not doubled.
async function liveRows(companyId, fromMonth, toMonth = fromMonth) {
  const [{ rows }, customers, programs] = await Promise.all([
    rq(`WITH x AS (
        SELECT b.agentid, COALESCE(b.total,0)::numeric AS total, t.routeid, t.date,
          COALESCE(t.subtotal,0)::numeric AS sub,
          SUM(COALESCE(t.subtotal,0)) OVER (PARTITION BY b.id) AS sumsub,
          COUNT(*) OVER (PARTITION BY b.id) AS n
        FROM operation_schemas.sb_bookings b
        JOIN operation_schemas.sb_bookings__trips t ON t.sb_bookings_id = b.id
        WHERE b.status = 'confirmed')
      SELECT x.agentid, max(a.name) AS name, max(a.code) AS code, r.name AS route,
        sum(CASE WHEN x.n = 1 THEN x.total WHEN x.sumsub > 0 THEN x.total * x.sub / x.sumsub ELSE x.total / x.n END)::float AS amount
      FROM x
      LEFT JOIN operation_schemas.sb_agents a ON a.id = x.agentid
      LEFT JOIN operation_schemas.routes r ON r.id = x.routeid
      WHERE x.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' AND x.date >= $1 AND x.date < $2
      GROUP BY x.agentid, r.name`, [`${fromMonth}-01`, `${nextMonth(toMonth)}-01`]),
    // Same matching order as import-agency-performance.js: rate_agent_id (= sb_agents.id), then ref_code (= code).
    q(`SELECT c.id, c.name, c.rate_agent_id, c.ref_code, c.owner_user_id, u.display_name
       FROM customer c LEFT JOIN app_user u ON u.id = c.owner_user_id WHERE c.company_id = $1`, [companyId]),
    q('SELECT code, name FROM performance_program WHERE company_id = $1', [companyId]),
  ]);
  const programName = new Map(programs.rows.map(p => [p.code, p.name]));
  const byExternal = new Map();
  for (const c of customers.rows) if (c.rate_agent_id) byExternal.set(String(c.rate_agent_id), c);
  for (const c of customers.rows) if (c.ref_code && !byExternal.has(String(c.ref_code))) byExternal.set(String(c.ref_code), c);

  const out = new Map();
  for (const r of rows) {
    const rule = programRule(r.route);
    if (!rule || !r.agentid) continue;
    const program = programName.get(rule[1]) || rule[2];
    const c = byExternal.get(String(r.agentid)) || (r.code ? byExternal.get(String(r.code)) : null);
    // Key matches report7m's import key (customer id first, then rate agent id) so months line up.
    const agentKey = c ? String(c.id) : String(r.agentid);
    const k = `${agentKey}|${program}`;
    if (!out.has(k)) out.set(k, {
      agent_key: agentKey, customer_id: c?.id || null, rate_agent_id: String(r.agentid), agent_code: r.code || '',
      agent_name: c?.name || r.name || String(r.agentid), source_name: r.name || String(r.agentid), owner_id: c?.owner_user_id || null,
      owner_name: c?.display_name || 'Unassigned', program, amount: 0,
    });
    out.get(k).amount += +r.amount || 0;
  }
  return [...out.values()];
}

module.exports = { rateReady, nextMonth, liveMonths, liveRows };
