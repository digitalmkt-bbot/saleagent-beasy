// สร้างตารางทั้งหมดจาก db/schema.sql (ใช้กับ Railway/managed Postgres)
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');
async function main() {
  const candidates = [path.join(__dirname, '../../db/schema.sql'), path.join(__dirname, '../db/schema.sql'), 'db/schema.sql'];
  const file = candidates.find(f => fs.existsSync(f));
  if (!file) { console.error('ไม่พบ schema.sql'); process.exit(1); }
  const sql = fs.readFileSync(file, 'utf8');
  await pool.query(sql);
  console.log('สร้างตารางเรียบร้อยจาก', file);
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
