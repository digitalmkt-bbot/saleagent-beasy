// Import Agency_x_Trip_Performance workbook into normalized monthly performance tables.
// Usage: node src/import-performance.js <xlsx> [--company=1] [--user=1] [--replace] [--dry-run]
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ExcelJS = require('exceljs');
const { pool, q, tx } = require('./db');
const { ensurePerformanceSchema } = require('./performance-init');

const PROGRAMS = [
  { sheet: 'Similan', code: 'similan', name: 'Similan' },
  { sheet: 'Phi Phi Special', code: 'phi-phi-special', name: 'Phi Phi Special' },
  { sheet: 'Whale Shark', code: 'whale-shark', name: 'Whale Shark (PP+Maiton)' },
  { sheet: 'Surin', code: 'surin', name: 'Surin' },
  { sheet: 'Krabi-Phang Nga', code: 'krabi-phang-nga', name: 'Krabi + Phang Nga' },
  { sheet: 'Nyaung Oo Phee', code: 'nyaung-oo-phee', name: 'Nyaung Oo Phee' },
  { sheet: 'Se La Va', code: 'se-la-va', name: 'Se La Va' },
];

function arg(name) {
  const p = process.argv.slice(2).find(x => x.startsWith(`--${name}=`));
  return p ? p.slice(name.length + 3) : null;
}
function flag(name) { return process.argv.slice(2).includes(`--${name}`); }
function normalizedName(value) {
  return String(value || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
}
function number(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function integer(value) {
  const n = number(value);
  return n == null ? null : Math.round(n);
}
function isoMonth(year, monthIndex) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
}
function cellValue(value) {
  if (value && typeof value === 'object') {
    if ('result' in value) return value.result;
    if (Array.isArray(value.richText)) return value.richText.map(x => x.text).join('');
    if ('text' in value) return value.text;
  }
  return value;
}
function sheetRows(ws) {
  const rows = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const out = [];
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => { out[columnNumber - 1] = cellValue(cell.value); });
    rows[rowNumber - 1] = out;
  });
  return rows;
}

async function main() {
  const fileArg = process.argv.slice(2).find(x => !x.startsWith('--'));
  if (!fileArg) throw new Error('Usage: node src/import-performance.js <xlsx> [--company=1] [--user=1] [--replace] [--dry-run]');
  const file = path.resolve(fileArg);
  if (!fs.existsSync(file)) throw new Error(`File not found: ${file}`);

  await ensurePerformanceSchema();
  let companyId = +(arg('company') || 0);
  if (!companyId) {
    const companies = (await q('SELECT id FROM company ORDER BY id')).rows;
    if (companies.length !== 1) throw new Error('Specify --company=<id> when the database has more than one company');
    companyId = +companies[0].id;
  }
  let userId = +(arg('user') || 0) || null;
  if (!userId) {
    userId = (await q("SELECT id FROM app_user WHERE company_id=$1 ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END,id LIMIT 1", [companyId])).rows[0]?.id || null;
  }

  const bytes = fs.readFileSync(file);
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bytes);
  const workbookText = wb.worksheets.map(ws => sheetRows(ws).slice(0, 8).flat().filter(Boolean).join(' ')).join(' ');
  const year = +(arg('year') || (workbookText.match(/20\d{2}/) || [])[0] || 0);
  if (!year) throw new Error('Could not determine report year; pass --year=YYYY');
  const periodStart = `${year}-01-01`;
  const periodEnd = `${year}-07-31`;

  const existingBatch = (await q('SELECT id,status FROM performance_import_batch WHERE company_id=$1 AND file_hash=$2', [companyId, hash])).rows[0];
  if (existingBatch && !flag('replace')) {
    console.log(JSON.stringify({ skipped: true, reason: 'file already imported', batchId: existingBatch.id, status: existingBatch.status }, null, 2));
    return;
  }

  const sourceMap = new Map();
  if ((await q("SELECT to_regclass('public.report_agent_sales_7m_2026') AS t")).rows[0].t) {
    const source = (await q(`SELECT id,sheet_row,source_name,program,NULLIF(agent_id,'') agent_id,match_status,amount_7m
      FROM report_agent_sales_7m_2026`)).rows;
    for (const r of source) {
      const key = `${r.program}|${normalizedName(r.source_name)}`;
      if (!sourceMap.has(key)) sourceMap.set(key, []);
      sourceMap.get(key).push(r);
    }
  }
  const customers = (await q(`SELECT id,name,rate_agent_id,ref_code FROM customer WHERE company_id=$1`, [companyId])).rows;
  const customerByExternalId = new Map();
  const customerByName = new Map();
  for (const c of customers) {
    if (c.rate_agent_id) customerByExternalId.set(String(c.rate_agent_id), c);
    if (c.ref_code && !customerByExternalId.has(String(c.ref_code))) customerByExternalId.set(String(c.ref_code), c);
    const n = normalizedName(c.name);
    if (!customerByName.has(n)) customerByName.set(n, []);
    customerByName.get(n).push(c);
  }

  const parsed = [];
  const mismatches = [];
  for (const config of PROGRAMS) {
    const ws = wb.getWorksheet(config.sheet);
    if (!ws) throw new Error(`Missing sheet: ${config.sheet}`);
    const rows = sheetRows(ws);
    for (let i = 3; i < rows.length; i++) {
      const row = rows[i];
      const sourceName = String(row[0] || '').trim();
      const total = number(row[2]);
      if (!sourceName || ['รวม', 'total'].includes(normalizedName(sourceName)) || total == null || total <= 0) continue;
      const sourceRow = i + 1;
      const priorCandidates = sourceMap.get(`${config.name}|${normalizedName(sourceName)}`) || [];
      const amountMatches = priorCandidates.filter(x => Math.abs(Number(x.amount_7m) - total) <= 0.02);
      const sameAgent = amountMatches.length > 1 && new Set(amountMatches.map(x => x.agent_id || '')).size === 1;
      const prior = amountMatches.length === 1 || sameAgent ? amountMatches[0] : (priorCandidates.length === 1 ? priorCandidates[0] : null);
      if (prior && Math.abs(Number(prior.amount_7m) - total) > 0.02) {
        mismatches.push(`${config.sheet}!${sourceRow}: source report ${prior.amount_7m} != workbook total ${total}`);
      }
      const externalId = prior?.agent_id || null;
      let customer = externalId ? customerByExternalId.get(String(externalId)) : null;
      if (!customer) {
        const exact = customerByName.get(normalizedName(sourceName)) || [];
        if (exact.length === 1) customer = exact[0];
      }
      const monthly = [];
      for (let monthIndex = 0; monthIndex < 7; monthIndex++) {
        const amount = number(row[9 + monthIndex]);
        if (amount != null && amount !== 0) monthly.push({ month: isoMonth(year, monthIndex), amount });
      }
      const monthlyTotal = monthly.reduce((sum, x) => sum + x.amount, 0);
      if (Math.abs(monthlyTotal - total) > 0.02) {
        mismatches.push(`${config.sheet}!${sourceRow}: monthly ${monthlyTotal} != total ${total}`);
      }
      parsed.push({
        config, sourceRow, sourceName, market: row[1] == null ? null : String(row[1]), total,
        routeShare: number(row[3]), bookings: integer(row[4]), pax: integer(row[5]),
        averagePerPax: number(row[6]), cancelledBookings: integer(row[7]), cancelledAmount: number(row[8]),
        externalId, customerId: customer?.id || null, matchStatus: prior?.match_status || (customer ? 'name-matched' : 'unmatched'), monthly,
      });
    }
  }
  if (mismatches.length) throw new Error(`Import validation failed (${mismatches.length}):\n${mismatches.slice(0, 20).join('\n')}`);

  const summary = {
    dryRun: flag('dry-run'), companyId, year, sourceRows: parsed.length,
    monthlyRows: parsed.reduce((n, r) => n + r.monthly.length, 0),
    total: parsed.reduce((n, r) => n + r.total, 0),
    matchedToCustomer: parsed.filter(r => r.customerId).length,
    withRateAgentId: parsed.filter(r => r.externalId).length,
    unmatched: parsed.filter(r => !r.customerId && !r.externalId).length,
  };
  if (flag('dry-run')) { console.log(JSON.stringify(summary, null, 2)); return; }

  const batchId = await tx(async client => {
    if (existingBatch) await client.query('DELETE FROM performance_import_batch WHERE id=$1', [existingBatch.id]);
    const batch = (await client.query(`INSERT INTO performance_import_batch
      (company_id,file_name,file_hash,period_start,period_end,imported_by,status)
      VALUES ($1,$2,$3,$4,$5,$6,'processing') RETURNING id`,
      [companyId, path.basename(file), hash, periodStart, periodEnd, userId])).rows[0];
    const programIds = new Map();
    for (const p of PROGRAMS) {
      const record = (await client.query(`INSERT INTO performance_program(company_id,code,name,source_sheet)
        VALUES ($1,$2,$3,$4) ON CONFLICT (company_id,code) DO UPDATE SET name=EXCLUDED.name,source_sheet=EXCLUDED.source_sheet
        RETURNING id`, [companyId, p.code, p.name, p.sheet])).rows[0];
      programIds.set(p.code, record.id);
    }
    // Bulk operations keep remote imports fast and atomic.
    const aliasMap = new Map();
    for (const r of parsed) {
      const key = normalizedName(r.sourceName);
      const old = aliasMap.get(key);
      if (!old || (!old.customer_id && r.customerId) || (!old.rate_agent_id && r.externalId)) {
        aliasMap.set(key, { normalized_name: key, source_name: r.sourceName, customer_id: r.customerId,
          rate_agent_id: r.externalId, match_status: r.matchStatus });
      }
    }
    await client.query(`INSERT INTO agent_name_alias(company_id,normalized_name,source_name,customer_id,rate_agent_id,match_status)
      SELECT $1,x.normalized_name,x.source_name,x.customer_id,x.rate_agent_id,x.match_status
      FROM jsonb_to_recordset($2::jsonb) AS x(normalized_name text,source_name text,customer_id bigint,rate_agent_id text,match_status text)
      ON CONFLICT (company_id,normalized_name) DO UPDATE SET
        source_name=EXCLUDED.source_name,
        customer_id=COALESCE(EXCLUDED.customer_id,agent_name_alias.customer_id),
        rate_agent_id=COALESCE(EXCLUDED.rate_agent_id,agent_name_alias.rate_agent_id),
        match_status=CASE WHEN EXCLUDED.customer_id IS NOT NULL OR EXCLUDED.rate_agent_id IS NOT NULL THEN EXCLUDED.match_status ELSE agent_name_alias.match_status END,
        updated_at=now()`, [companyId, JSON.stringify([...aliasMap.values()])]);

    const periodRows = parsed.map(r => ({ program_id: programIds.get(r.config.code), customer_id: r.customerId,
      rate_agent_id: r.externalId, source_name: r.sourceName, source_sheet: r.config.sheet, source_row: r.sourceRow,
      market: r.market, sales_amount: r.total, route_share: r.routeShare, bookings: r.bookings, pax: r.pax,
      average_per_pax: r.averagePerPax, cancelled_bookings: r.cancelledBookings,
      cancelled_amount: r.cancelledAmount, match_status: r.matchStatus }));
    const insertedPeriods = (await client.query(`INSERT INTO agent_program_period_performance
      (company_id,import_batch_id,program_id,customer_id,rate_agent_id,source_name,source_sheet,source_row,market,
       period_start,period_end,sales_amount,route_share,bookings,pax,average_per_pax,cancelled_bookings,cancelled_amount,match_status)
      SELECT $1,$2,x.program_id,x.customer_id,x.rate_agent_id,x.source_name,x.source_sheet,x.source_row,x.market,
        $3,$4,x.sales_amount,x.route_share,x.bookings,x.pax,x.average_per_pax,x.cancelled_bookings,x.cancelled_amount,x.match_status
      FROM jsonb_to_recordset($5::jsonb) AS x(program_id bigint,customer_id bigint,rate_agent_id text,source_name text,
        source_sheet text,source_row integer,market text,sales_amount numeric,route_share numeric,bookings integer,pax integer,
        average_per_pax numeric,cancelled_bookings integer,cancelled_amount numeric,match_status text)
      RETURNING id,program_id,source_sheet,source_row`,
      [companyId,batch.id,periodStart,periodEnd,JSON.stringify(periodRows)])).rows;
    const periodIds = new Map(insertedPeriods.map(x => [`${x.program_id}|${x.source_sheet}|${x.source_row}`, x.id]));

    const monthRows = parsed.flatMap(r => r.monthly.map(m => ({
      period_performance_id: periodIds.get(`${programIds.get(r.config.code)}|${r.config.sheet}|${r.sourceRow}`),
      program_id: programIds.get(r.config.code), customer_id: r.customerId, rate_agent_id: r.externalId,
      source_name: r.sourceName, market: r.market, month: m.month, sales_amount: m.amount,
    })));
    await client.query(`INSERT INTO agent_program_monthly_performance
      (company_id,import_batch_id,period_performance_id,program_id,customer_id,rate_agent_id,source_name,market,month,sales_amount)
      SELECT $1,$2,x.period_performance_id,x.program_id,x.customer_id,x.rate_agent_id,x.source_name,x.market,x.month,x.sales_amount
      FROM jsonb_to_recordset($3::jsonb) AS x(period_performance_id bigint,program_id bigint,customer_id bigint,
        rate_agent_id text,source_name text,market text,month date,sales_amount numeric)`,
      [companyId,batch.id,JSON.stringify(monthRows)]);
    await client.query(`UPDATE performance_import_batch SET source_rows=$2,monthly_rows=$3,status='completed' WHERE id=$1`,
      [batch.id, summary.sourceRows, summary.monthlyRows]);
    return batch.id;
  });
  console.log(JSON.stringify({ ...summary, batchId }, null, 2));
}

main().catch(e => { console.error(e.stack || e.message); process.exitCode = 1; }).finally(() => pool.end());
