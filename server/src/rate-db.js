// การเชื่อมต่อแบบอ่านอย่างเดียวไปยัง DB ระบบ rate (operation_schemas) — คนละระบบกับ CRM
// ตั้งค่าใน Railway ผ่าน env: RATE_DATABASE_URL (ไม่เก็บรหัสในโค้ด)
const { Pool } = require('pg');
let pool = null;
function getPool() {
  const url = process.env.RATE_DATABASE_URL;
  if (!url) return null;
  if (!pool) pool = new Pool({ connectionString: url, max: 3, idleTimeoutMillis: 30000,
    ssl: /sslmode=require/.test(url) ? { rejectUnauthorized: false } : false });
  return pool;
}
const rateReady = () => !!process.env.RATE_DATABASE_URL;
async function rq(sql, args = []) {
  const p = getPool();
  if (!p) { const e = new Error('ยังไม่ได้ตั้งค่า RATE_DATABASE_URL (เชื่อมระบบ rate ไม่ได้)'); e.status = 503; throw e; }
  return p.query(sql, args);
}
module.exports = { rq, rateReady };
