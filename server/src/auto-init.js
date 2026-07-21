// auto-init.js — ตั้งค่าฐานข้อมูลอัตโนมัติตอนเซิร์ฟเวอร์บูตครั้งแรก
// ใช้กับ Railway / managed Postgres: ไม่ต้องรันคำสั่ง db แยกอีกต่อไป
//
// พฤติกรรม (idempotent — รันซ้ำได้ปลอดภัย):
//   1) รอ Postgres พร้อมรับการเชื่อมต่อ (retry)
//   2) ถ้ายังไม่มีตาราง app_user  -> สร้างตารางทั้งหมดจาก db/schema.sql
//   3) ถ้ายังไม่มีผู้ใช้เลย        -> ใส่ข้อมูลตั้งต้น (seed)
//        - ค่าเริ่มต้น = seed แบบสะอาด (บริษัท + admin + master data)
//        - ตั้ง SEED_DEMO=true เพื่อใส่ข้อมูลตัวอย่าง (ลูกค้า/กลุ่มเป้าหมาย) แทน
//
// ปิดการทำงานได้ด้วย  AUTO_INIT=false
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool, q } = require('./db');

function log(...a) { console.log('[auto-init]', ...a); }

async function waitForDb(retries = 30, delayMs = 2000) {
  for (let i = 1; i <= retries; i++) {
    try { await q('SELECT 1'); return; }
    catch (e) {
      log(`รอฐานข้อมูลพร้อม... (${i}/${retries}) ${e.code || e.message}`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw new Error('เชื่อมต่อฐานข้อมูลไม่สำเร็จหลังจากรอครบกำหนด');
}

async function tableExists(name) {
  const r = await q('SELECT to_regclass($1) AS t', [name]);
  return !!r.rows[0].t;
}

async function ensureSchema() {
  if (await tableExists('app_user')) { log('พบตารางอยู่แล้ว ข้ามการสร้าง schema'); return false; }
  const candidates = [
    path.join(__dirname, '../../db/schema.sql'),
    path.join(__dirname, '../db/schema.sql'),
    path.join(process.cwd(), 'db/schema.sql'),
    'db/schema.sql',
  ];
  const file = candidates.find(f => fs.existsSync(f));
  if (!file) throw new Error('ไม่พบไฟล์ db/schema.sql');
  const sql = fs.readFileSync(file, 'utf8');
  await pool.query(sql);
  log('สร้างตารางทั้งหมดเรียบร้อยจาก', file);
  return true;
}

async function ensureSeed() {
  const r = await q('SELECT count(*)::int AS c FROM app_user');
  if (r.rows[0].c > 0) { log('มีข้อมูลผู้ใช้อยู่แล้ว ข้ามการ seed'); return false; }
  const demo = String(process.env.SEED_DEMO || '').toLowerCase() === 'true';
  if (demo) {
    log('SEED_DEMO=true -> ใส่ข้อมูลตัวอย่าง (demo)');
    await require('./seed').run();
  } else {
    log('ใส่ข้อมูลตั้งต้นแบบสะอาด (clean)');
    await require('./seed-clean').run();
  }
  return true;
}

async function runMigrations() {
  // ปรับคอลัมน์ที่เคยเป็น VARCHAR(500) ให้เก็บรูป base64 ได้ (idempotent)
  try {
    await q("ALTER TABLE activity ALTER COLUMN image_url TYPE TEXT");
    log('migration: activity.image_url -> TEXT');
    await q("ALTER TABLE activity ADD COLUMN IF NOT EXISTS check_in_at TIMESTAMPTZ");
    await q("ALTER TABLE activity ADD COLUMN IF NOT EXISTS check_out_at TIMESTAMPTZ");
    log('migration: activity check_in_at/check_out_at ensured');
    await q(`CREATE TABLE IF NOT EXISTS checkin (
      id BIGSERIAL PRIMARY KEY,
      company_id BIGINT NOT NULL REFERENCES company(id),
      customer_id BIGINT REFERENCES customer(id),
      user_id BIGINT REFERENCES app_user(id),
      check_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      check_in_lat DOUBLE PRECISION,
      check_in_lng DOUBLE PRECISION,
      check_out_at TIMESTAMPTZ,
      check_out_lat DOUBLE PRECISION,
      check_out_lng DOUBLE PRECISION,
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`);
    await q("ALTER TABLE checkin ADD COLUMN IF NOT EXISTS project_id BIGINT");
    await q("ALTER TABLE checkin ADD COLUMN IF NOT EXISTS activity_id BIGINT");
    await q("ALTER TABLE checkin ADD COLUMN IF NOT EXISTS image_url TEXT");
    await q("ALTER TABLE checkin ADD COLUMN IF NOT EXISTS checkout_note TEXT");
    await q("UPDATE pipeline_stage SET name = replace(name, 'ลูกค้า', 'เอเจ้นท์') WHERE name LIKE '%ลูกค้า%'");
    log('migration: rename ลูกค้า -> เอเจ้นท์ in pipeline_stage');
    await q("UPDATE pipeline_stage SET name = replace(name, 'ใบเสนอราคา', 'สัญญา') WHERE name LIKE '%ใบเสนอราคา%'");
    await q("UPDATE tag SET name = replace(name, 'ใบเสนอราคา', 'สัญญา') WHERE name LIKE '%ใบเสนอราคา%'");
    log('migration: rename ใบเสนอราคา -> สัญญา in pipeline_stage/tag');
    await q("CREATE INDEX IF NOT EXISTS idx_checkin_company ON checkin(company_id)");
    log('migration: checkin table ensured');
    await q("ALTER TABLE app_user ADD COLUMN IF NOT EXISTS user_code VARCHAR(50)");
    await q("CREATE UNIQUE INDEX IF NOT EXISTS ux_app_user_code ON app_user(company_id, user_code) WHERE user_code IS NOT NULL");
    log('migration: app_user.user_code ensured');
    // ข้อมูลจากระบบ rate ยาวกว่าที่คอลัมน์เดิมรองรับ (เช่น เบอร์โทรหลายเบอร์, เลขภาษีมีวงเล็บสาขา)
    await q("ALTER TABLE customer ALTER COLUMN phone TYPE TEXT");
    await q("ALTER TABLE customer ALTER COLUMN tax_id TYPE VARCHAR(120)");
    await q("ALTER TABLE contact ALTER COLUMN phone TYPE TEXT");
    log('migration: widen customer.phone/tax_id + contact.phone');
  } catch (e) { log('migration skipped/failed: ' + e.message); }
}

async function autoInit() {
  if (String(process.env.AUTO_INIT || '').toLowerCase() === 'false') {
    log('AUTO_INIT=false — ข้ามการตั้งค่าอัตโนมัติ');
    return;
  }
  await waitForDb();
  const created = await ensureSchema();
  const seeded = await ensureSeed();
  await runMigrations();
  log(`เสร็จสิ้น (สร้างตาราง: ${created ? 'ใช่' : 'ไม่'}, seed: ${seeded ? 'ใช่' : 'ไม่'})`);
}

module.exports = { autoInit };
