// Import the Agency Performance dataset from the annual sales-summary workbook.
// The Agency Performance sheet defines the agent totals; Data is used to retain program × month detail.
// Usage: node src/import-agency-performance.js <xlsx> [--company=1] [--user=1] [--dry-run] [--replace-period]
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ExcelJS = require('exceljs');
const { pool, q, tx } = require('./db');
const { ensurePerformanceSchema } = require('./performance-init');

const PROGRAMS = new Map([
  ['Similan', { code: 'similan', name: 'Similan' }],
  ['Phi Phi Special', { code: 'phi-phi-special', name: 'Phi Phi Special' }],
  ['Whale Shark (PP+Maiton)', { code: 'whale-shark', name: 'Whale Shark (PP+Maiton)' }],
  ['Surin', { code: 'surin', name: 'Surin' }],
  ['Krabi + Phang Nga', { code: 'krabi-phang-nga', name: 'Krabi + Phang Nga' }],
  ['Nyaung Oo Phee', { code: 'nyaung-oo-phee', name: 'Nyaung Oo Phee' }],
  ['Se La Va', { code: 'se-la-va', name: 'Se La Va' }],
]);
const THAI_MONTH = new Map([['ม.ค.',1],['ก.พ.',2],['มี.ค.',3],['เม.ย.',4],['พ.ค.',5],['มิ.ย.',6],['ก.ค.',7],['ส.ค.',8],['ก.ย.',9],['ต.ค.',10],['พ.ย.',11],['ธ.ค.',12]]);
const argv = process.argv.slice(2);
const flag = name => argv.includes(`--${name}`);
const arg = name => argv.find(x => x.startsWith(`--${name}=`))?.slice(name.length + 3) || null;
const norm = value => String(value || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
// Excel SUMIFS is case-insensitive but does not collapse internal spaces.
const excelName = value => String(value || '').normalize('NFKC').trim().toLowerCase();
const num = value => { const n = Number(value); return value == null || value === '' || !Number.isFinite(n) ? null : n; };
const primitive = value => value && typeof value === 'object' && 'result' in value ? value.result : value;
function parseMonth(value) {
  const text = String(value || '').trim();
  const token = [...THAI_MONTH.keys()].find(x => text.startsWith(x));
  const year = +(text.match(/20\d{2}/) || [])[0];
  if (!token || !year) return null;
  return `${year}-${String(THAI_MONTH.get(token)).padStart(2, '0')}-01`;
}
function monthEnd(iso) { const [y,m] = iso.split('-').map(Number); return new Date(Date.UTC(y,m,0)).toISOString().slice(0,10); }

async function main() {
  const fileArg = argv.find(x => !x.startsWith('--'));
  if (!fileArg) throw new Error('Usage: node src/import-agency-performance.js <xlsx> [--company=1] [--user=1] [--dry-run] [--replace-period]');
  const file = path.resolve(fileArg);
  if (!fs.existsSync(file)) throw new Error(`File not found: ${file}`);
  await ensurePerformanceSchema();

  let companyId = +(arg('company') || 0);
  if (!companyId) {
    const companies = (await q('SELECT id FROM company ORDER BY id')).rows;
    if (companies.length !== 1) throw new Error('Specify --company=<id>');
    companyId = +companies[0].id;
  }
  let userId = +(arg('user') || 0) || null;
  if (!userId) userId = (await q("SELECT id FROM app_user WHERE company_id=$1 ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END,id LIMIT 1", [companyId])).rows[0]?.id || null;

  const bytes = fs.readFileSync(file);
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  const wb = new ExcelJS.Workbook(); await wb.xlsx.load(bytes);
  const dataSheet = wb.getWorksheet('Data');
  const agencySheet = wb.getWorksheet('Agency Performance');
  if (!dataSheet || !agencySheet) throw new Error('Workbook must contain Data and Agency Performance sheets');

  // Agency Performance is the control total and supplies stable source row references.
  const agencyRows = new Map(), agencyControls = [];
  for (let rowNo=2; rowNo<=agencySheet.rowCount; rowNo++) {
    const row = agencySheet.getRow(rowNo);
    const name = String(primitive(row.getCell(1).value) || '').trim();
    const total = num(primitive(row.getCell(2).value));
    if (!name || ['รวม','total'].includes(norm(name))) continue;
    if (agencyRows.has(name)) throw new Error(`Duplicate exact agent name in Agency Performance: ${name}`);
    agencyRows.set(name, { rowNo });
    if (total != null && total > 0) agencyControls.push({ name, rowNo, total });
  }

  // Group raw booking rows to retain program detail while reproducing Agency Performance exactly.
  const groups = new Map();
  const sourceTotals = new Map();
  const months = new Set();
  for (let rowNo=2; rowNo<=dataSheet.rowCount; rowNo++) {
    const row = dataSheet.getRow(rowNo);
    const month = parseMonth(primitive(row.getCell(1).value));
    const programName = String(primitive(row.getCell(3).value) || '').trim();
    const sourceName = String(primitive(row.getCell(6).value) || '').trim();
    const market = String(primitive(row.getCell(7).value) || '').trim() || null;
    const pax = num(primitive(row.getCell(14).value)) || 0;
    const amount = num(primitive(row.getCell(15).value)) || 0;
    const status = String(primitive(row.getCell(16).value) || '').trim().toUpperCase();
    if (!month || !sourceName || !PROGRAMS.has(programName) || !['OK','CXL'].includes(status)) continue;
    months.add(month);
    const key = `${programName}\u0000${sourceName}`;
    if (!groups.has(key)) groups.set(key, { program: PROGRAMS.get(programName), sourceName, marketCounts: new Map(), monthly: new Map(), sales: 0, bookings: 0, pax: 0, cancelledBookings: 0, cancelledAmount: 0 });
    const g = groups.get(key);
    if (market) g.marketCounts.set(market, (g.marketCounts.get(market) || 0) + 1);
    if (status === 'OK') {
      g.sales += amount; g.bookings++; g.pax += pax;
      g.monthly.set(month, (g.monthly.get(month) || 0) + amount);
      sourceTotals.set(sourceName, (sourceTotals.get(sourceName) || 0) + amount);
    } else { g.cancelledBookings++; g.cancelledAmount += amount; }
  }
  const sortedMonths = [...months].sort();
  if (!sortedMonths.length) throw new Error('No valid monthly rows found');
  const periodStart = sortedMonths[0], periodEnd = monthEnd(sortedMonths.at(-1));
  const programTotals = new Map();
  for (const g of groups.values()) if (g.sales > 0) programTotals.set(g.program.name, (programTotals.get(g.program.name) || 0) + g.sales);

  const mismatches = [], foldedTotals = new Map();
  for (const [name, amount] of sourceTotals) foldedTotals.set(excelName(name), (foldedTotals.get(excelName(name)) || 0) + amount);
  // Validate the formulas using Excel's case-insensitive name semantics. Case variants can
  // legitimately display the same control total on multiple Agency Performance rows.
  for (const control of agencyControls) {
    const rawTotal = foldedTotals.get(excelName(control.name)) || 0;
    if (Math.abs(rawTotal-control.total) > 0.02) mismatches.push(`${control.name}: Data ${rawTotal} != Agency Performance ${control.total}`);
  }
  for (const name of sourceTotals.keys()) if (!agencyRows.has(name) && (sourceTotals.get(name) || 0) > 0) mismatches.push(`${name}: present in Data but missing from Agency Performance`);
  if (mismatches.length) throw new Error(`Control-total validation failed (${mismatches.length}):\n${mismatches.slice(0,20).join('\n')}`);

  // Build matching sources from the previous reconciled report, aliases, and CRM customers.
  const reportRows = (await q(`SELECT program,source_name,NULLIF(agent_id,'') agent_id,match_status FROM report_agent_sales_7m_2026`)).rows;
  const reportByProgram = new Map(), reportGlobal = new Map();
  for (const r of reportRows) {
    const pkey = `${r.program}|${norm(r.source_name)}`, gkey = norm(r.source_name);
    if (!reportByProgram.has(pkey)) reportByProgram.set(pkey, []); reportByProgram.get(pkey).push(r);
    if (!reportGlobal.has(gkey)) reportGlobal.set(gkey, []); reportGlobal.get(gkey).push(r);
  }
  const aliases = new Map((await q('SELECT normalized_name,customer_id,rate_agent_id,match_status FROM agent_name_alias WHERE company_id=$1', [companyId])).rows.map(x => [x.normalized_name,x]));
  const customers = (await q('SELECT id,name,rate_agent_id,ref_code FROM customer WHERE company_id=$1', [companyId])).rows;
  const customerByExternal = new Map(), customerByName = new Map();
  for (const c of customers) {
    if (c.rate_agent_id) customerByExternal.set(String(c.rate_agent_id),c);
    if (c.ref_code && !customerByExternal.has(String(c.ref_code))) customerByExternal.set(String(c.ref_code),c);
    const key=norm(c.name); if(!customerByName.has(key))customerByName.set(key,[]); customerByName.get(key).push(c);
  }
  function uniqueExternal(candidates) { const ids=[...new Set(candidates.map(x=>x.agent_id).filter(Boolean))]; return ids.length===1?ids[0]:null; }

  const parsed=[];
  for (const g of groups.values()) {
    if (g.sales <= 0) continue;
    const key=norm(g.sourceName), alias=aliases.get(key);
    let externalId=uniqueExternal(reportByProgram.get(`${g.program.name}|${key}`)||[]) || uniqueExternal(reportGlobal.get(key)||[]) || alias?.rate_agent_id || null;
    let customer=externalId?customerByExternal.get(String(externalId)):null;
    if(!customer&&alias?.customer_id)customer=customers.find(x=>String(x.id)===String(alias.customer_id));
    if(!customer){const exact=customerByName.get(key)||[];if(exact.length===1)customer=exact[0];}
    const source=agencyRows.get(g.sourceName);
    if (!source) throw new Error(`Agent '${g.sourceName}' is missing from Agency Performance`);
    const market=[...g.marketCounts].sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
    const matchStatus=externalId?'matched':customer?'name-matched':'unmatched';
    parsed.push({...g,sourceRow:source.rowNo,market,externalId,customerId:customer?.id||null,matchStatus,
      routeShare:g.sales/(programTotals.get(g.program.name)||1),averagePerPax:g.pax?g.sales/g.pax:null});
  }
  const total=parsed.reduce((n,x)=>n+x.sales,0), monthlyRows=parsed.reduce((n,x)=>n+[...x.monthly.values()].filter(v=>v!==0).length,0);
  const summary={dryRun:flag('dry-run'),file:path.basename(file),companyId,periodStart,periodEnd,sourceRows:parsed.length,monthlyRows,total,
    distinctSourceAgents:sourceTotals.size,matchedToCustomer:parsed.filter(x=>x.customerId).length,withRateAgentId:parsed.filter(x=>x.externalId).length,
    unmatched:parsed.filter(x=>!x.customerId&&!x.externalId).length};

  const exactBatch=(await q('SELECT id,status FROM performance_import_batch WHERE company_id=$1 AND file_hash=$2',[companyId,hash])).rows[0];
  if(exactBatch&&!flag('replace-period')){console.log(JSON.stringify({...summary,skipped:true,reason:'file already imported',batchId:exactBatch.id},null,2));return;}
  const overlaps=(await q(`SELECT b.id,b.file_name,to_char(b.period_start,'YYYY-MM-DD') period_start,to_char(b.period_end,'YYYY-MM-DD') period_end,coalesce(sum(s.sales_amount),0)::float total,count(s.id)::int rows
    FROM performance_import_batch b LEFT JOIN agent_program_period_performance s ON s.import_batch_id=b.id
    WHERE b.company_id=$1 AND b.status='completed' AND daterange(b.period_start,b.period_end,'[]') && daterange($2::date,$3::date,'[]')
    GROUP BY b.id ORDER BY b.id`,[companyId,periodStart,periodEnd])).rows;
  const logicalDuplicate=overlaps.find(x=>x.period_start===periodStart&&x.period_end===periodEnd&&Math.abs(+x.total-total)<=0.02&&+x.rows===parsed.length);
  if(logicalDuplicate&&!flag('replace-period')){console.log(JSON.stringify({...summary,skipped:true,reason:'same period, rows, and total already imported',existingBatchId:logicalDuplicate.id,existingFile:logicalDuplicate.file_name},null,2));return;}
  if(flag('dry-run')){console.log(JSON.stringify({...summary,overlappingBatches:overlaps},null,2));return;}
  if(overlaps.length&&!flag('replace-period'))throw new Error(`Import period overlaps existing batch(es): ${overlaps.map(x=>x.id).join(', ')}. Review and use --replace-period only when this file supersedes them.`);

  const batchId=await tx(async client=>{
    if(flag('replace-period')&&overlaps.length)await client.query('DELETE FROM performance_import_batch WHERE id=ANY($1::bigint[])',[overlaps.map(x=>x.id)]);
    const batch=(await client.query(`INSERT INTO performance_import_batch(company_id,file_name,file_hash,period_start,period_end,imported_by,status)
      VALUES($1,$2,$3,$4,$5,$6,'processing') RETURNING id`,[companyId,path.basename(file),hash,periodStart,periodEnd,userId])).rows[0];
    const programIds=new Map();
    for(const p of PROGRAMS.values()){const r=(await client.query(`INSERT INTO performance_program(company_id,code,name,source_sheet) VALUES($1,$2,$3,'Data')
      ON CONFLICT(company_id,code) DO UPDATE SET name=EXCLUDED.name RETURNING id`,[companyId,p.code,p.name])).rows[0];programIds.set(p.code,r.id);}
    const aliasMap=new Map();for(const r of parsed){const k=norm(r.sourceName),old=aliasMap.get(k);if(!old||(!old.customer_id&&r.customerId)||(!old.rate_agent_id&&r.externalId))aliasMap.set(k,{normalized_name:k,source_name:r.sourceName,customer_id:r.customerId,rate_agent_id:r.externalId,match_status:r.matchStatus});}
    await client.query(`INSERT INTO agent_name_alias(company_id,normalized_name,source_name,customer_id,rate_agent_id,match_status)
      SELECT $1,x.normalized_name,x.source_name,x.customer_id,x.rate_agent_id,x.match_status FROM jsonb_to_recordset($2::jsonb)
      AS x(normalized_name text,source_name text,customer_id bigint,rate_agent_id text,match_status text)
      ON CONFLICT(company_id,normalized_name) DO UPDATE SET source_name=EXCLUDED.source_name,customer_id=coalesce(EXCLUDED.customer_id,agent_name_alias.customer_id),
      rate_agent_id=coalesce(EXCLUDED.rate_agent_id,agent_name_alias.rate_agent_id),match_status=CASE WHEN EXCLUDED.customer_id IS NOT NULL OR EXCLUDED.rate_agent_id IS NOT NULL THEN EXCLUDED.match_status ELSE agent_name_alias.match_status END,updated_at=now()`,[companyId,JSON.stringify([...aliasMap.values()])]);
    const periodJson=parsed.map(r=>({program_id:programIds.get(r.program.code),customer_id:r.customerId,rate_agent_id:r.externalId,source_name:r.sourceName,source_row:r.sourceRow,market:r.market,sales_amount:r.sales,route_share:r.routeShare,bookings:r.bookings,pax:r.pax,average_per_pax:r.averagePerPax,cancelled_bookings:r.cancelledBookings,cancelled_amount:r.cancelledAmount,match_status:r.matchStatus}));
    const periods=(await client.query(`INSERT INTO agent_program_period_performance(company_id,import_batch_id,program_id,customer_id,rate_agent_id,source_name,source_sheet,source_row,market,period_start,period_end,sales_amount,route_share,bookings,pax,average_per_pax,cancelled_bookings,cancelled_amount,match_status)
      SELECT $1,$2,x.program_id,x.customer_id,x.rate_agent_id,x.source_name,'Agency Performance',x.source_row,x.market,$3,$4,x.sales_amount,x.route_share,x.bookings,x.pax,x.average_per_pax,x.cancelled_bookings,x.cancelled_amount,x.match_status
      FROM jsonb_to_recordset($5::jsonb) AS x(program_id bigint,customer_id bigint,rate_agent_id text,source_name text,source_row integer,market text,sales_amount numeric,route_share numeric,bookings integer,pax integer,average_per_pax numeric,cancelled_bookings integer,cancelled_amount numeric,match_status text)
      RETURNING id,program_id,source_row`,[companyId,batch.id,periodStart,periodEnd,JSON.stringify(periodJson)])).rows;
    const pids=new Map(periods.map(x=>[`${x.program_id}|${x.source_row}`,x.id]));
    const monthJson=parsed.flatMap(r=>[...r.monthly].filter(([,amount])=>amount!==0).map(([month,amount])=>({period_performance_id:pids.get(`${programIds.get(r.program.code)}|${r.sourceRow}`),program_id:programIds.get(r.program.code),customer_id:r.customerId,rate_agent_id:r.externalId,source_name:r.sourceName,market:r.market,month,sales_amount:amount})));
    await client.query(`INSERT INTO agent_program_monthly_performance(company_id,import_batch_id,period_performance_id,program_id,customer_id,rate_agent_id,source_name,market,month,sales_amount)
      SELECT $1,$2,x.period_performance_id,x.program_id,x.customer_id,x.rate_agent_id,x.source_name,x.market,x.month,x.sales_amount FROM jsonb_to_recordset($3::jsonb)
      AS x(period_performance_id bigint,program_id bigint,customer_id bigint,rate_agent_id text,source_name text,market text,month date,sales_amount numeric)`,[companyId,batch.id,JSON.stringify(monthJson)]);
    await client.query("UPDATE performance_import_batch SET source_rows=$2,monthly_rows=$3,status='completed',notes='Agency Performance control totals; program/month detail derived from Data sheet' WHERE id=$1",[batch.id,parsed.length,monthlyRows]);
    return batch.id;
  });
  console.log(JSON.stringify({...summary,batchId},null,2));
}
main().catch(e=>{console.error(e.stack||e.message);process.exitCode=1;}).finally(()=>pool.end());
