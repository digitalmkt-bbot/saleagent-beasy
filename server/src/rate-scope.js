// ขอบเขตข้อมูลตาม master setting (ระบบ rate): sb_agents.sales บอกว่าเอเจ้นท์คนไหนถูก assign ให้เซลส์คนไหน
const { q } = require('./db');
const { rq, rateReady } = require('./rate-db');
const { isStaff } = require('./routes/_scope');

// จับคู่ผู้ใช้ CRM กับเซลส์ในระบบ rate ด้วย "อีเมล" หรือ "user_code" (= id / code / name ของ sb_sales)
// admin/manager -> {all:true}. staff -> ได้ id เซลส์ (หรือ code:null ถ้าจับคู่ไม่ได้)
async function rateScopeFor(user) {
  if (!isStaff(user)) return { all: true };
  const u = (await q('SELECT email, display_name, user_code FROM app_user WHERE id=$1', [user.id])).rows[0];
  if (!u) return { all: false, code: null, name: '' };
  const email = String(u.email || '').toLowerCase().trim();
  const uc = String(u.user_code || '').trim();
  const s = (await rq(`SELECT id, name, fullname FROM operation_schemas.sb_sales
    WHERE ($1 <> '' AND lower(email) = $1)
       OR ($2 <> '' AND (id = $2 OR lower(code) = lower($2) OR lower(name) = lower($2)))
    LIMIT 1`, [email, uc])).rows[0];
  return s ? { all: false, code: s.id, name: s.name || s.fullname } : { all: false, code: null, name: null, email: u.email, user_code: uc };
}

// ref_code (= code หรือ id ของ sb_agents — สูตรเดียวกับ import-agents) ของเอเจ้นท์ที่ master setting
// ระบุให้เซลส์คนนี้ดูแล — คืน null ถ้าไม่ต้องกรองตาม master (admin/manager, ยังไม่ตั้งค่า RATE_DATABASE_URL,
// rate DB ล่ม หรือจับคู่เซลส์ไม่ได้) เพื่อให้ผู้เรียกถอยไปกรองตาม owner ใน CRM ตามเดิม
const cache = new Map(); // user_id -> { at, codes }
const TTL_MS = 60 * 1000;
async function assignedRefCodes(user) {
  if (!isStaff(user) || !rateReady()) return null;
  const hit = cache.get(user.id);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.codes;
  let codes = null;
  try {
    const sc = await rateScopeFor(user);
    if (!sc.all && sc.code) {
      const rows = (await rq('SELECT id, code FROM operation_schemas.sb_agents WHERE sales = $1', [sc.code])).rows;
      codes = rows.map(a => (a.code || a.id || '').toString().trim()).filter(Boolean);
    }
  } catch (e) { codes = null; }
  cache.set(user.id, { at: Date.now(), codes });
  return codes;
}

module.exports = { rateScopeFor, assignedRefCodes };
