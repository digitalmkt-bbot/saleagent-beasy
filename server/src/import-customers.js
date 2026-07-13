// นำเข้าเอเจ้นท์จากไฟล์ CSV -> npm run import:customers -- customers.csv
// คอลัมน์: name,ref_code,tax_id,phone,email,province,contact_name,contact_phone,contact_email
require('dotenv').config();
const fs = require('fs');
const { pool, q } = require('./db');

function parseCSV(text) {
  const rows = []; let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQ = false;
      else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') { if (field !== '' || row.length) { row.push(field); rows.push(row); row = []; field = ''; } if (ch === '\r' && text[i + 1] === '\n') i++; }
    else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function main() {
  const file = process.argv[2] || 'customers.csv';
  if (!fs.existsSync(file)) { console.error('ไม่พบไฟล์:', file); process.exit(1); }
  const rows = parseCSV(fs.readFileSync(file, 'utf8')).filter(r => r.some(c => c.trim() !== ''));
  const header = rows.shift().map(h => h.trim());
  const idx = (k) => header.indexOf(k);
  const co = (await q('SELECT id FROM company ORDER BY id LIMIT 1')).rows[0];
  if (!co) { console.error('ยังไม่มีบริษัท — รัน npm run seed:clean ก่อน'); process.exit(1); }
  let n = 0;
  for (const r of rows) {
    const g = (k) => { const i = idx(k); return i >= 0 ? (r[i] || '').trim() : null; };
    if (!g('name')) continue;
    const c = (await q(`INSERT INTO customer (company_id,name,ref_code,tax_id,phone,email,province,lifecycle_stage,is_followed)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'target',true) RETURNING id`,
      [co.id, g('name'), g('ref_code'), g('tax_id'), g('phone'), g('email'), g('province')])).rows[0];
    if (g('contact_name'))
      await q(`INSERT INTO contact (customer_id,name,is_primary,phone,email) VALUES ($1,$2,true,$3,$4)`,
        [c.id, g('contact_name'), g('contact_phone'), g('contact_email')]);
    n++;
  }
  console.log(`นำเข้าเอเจ้นท์ ${n} ราย เรียบร้อย`);
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
