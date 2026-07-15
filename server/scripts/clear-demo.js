// clear-demo.js — ล้างข้อมูลธุรกิจ
//   โหมด seed  (ค่าเริ่มต้น): ลบเฉพาะ demo REF1001–REF1005 (ข้ามลูกค้าที่มีเช็คอินจริง เว้นแต่ใส่ --all)
//   โหมด wipe  (--wipe-all): ลบข้อมูลธุรกิจ "ทั้งหมด" — ลูกค้า/โครงการ/งานติดตาม/เช็คอิน/สัญญา/เป้า
//   เก็บไว้เสมอ: บริษัท, ผู้ใช้(admin+users), ทีม, ค่าตั้งต้น (ไปป์ไลน์/แท็ก/วิธีติดต่อ/ความสำคัญ)
//   ปลอดภัย: ค่าเริ่มต้นเป็น DRY-RUN ไม่ลบ ต้องใส่ --confirm ถึงจะลบจริง
//
// รันใน Railway backend Console:
//   node scripts/clear-demo.js                       → รายงาน demo (ไม่ลบ)
//   node scripts/clear-demo.js --confirm             → ลบ demo จริง
//   node scripts/clear-demo.js --wipe-all            → รายงานล้างทั้งหมด (ไม่ลบ)
//   node scripts/clear-demo.js --wipe-all --confirm  → ล้างทั้งหมดจริง
const { pool, q } = require('../src/db');
const SEED_REFS = ['REF1001', 'REF1002', 'REF1003', 'REF1004', 'REF1005'];
const CONFIRM = process.argv.includes('--confirm');
const ALL = process.argv.includes('--all');
const WIPE = process.argv.includes('--wipe-all');
const n1 = async (sql, a) => (await q(sql, a)).rows[0].n;

async function wipeAll() {
  console.log(`\n=== ล้างข้อมูลทั้งหมด (${CONFIRM ? 'ลบจริง' : 'DRY-RUN ไม่ลบ'}) ===\n`);
  const tables = ['customer', 'contact', 'customer_branch', 'project', 'activity', 'checkin', 'quotation', 'sale_order', 'sales_target'];
  console.log('จำนวนที่จะลบ:');
  for (const t of tables) console.log(`  ${t}: ${await n1(`SELECT count(*)::int n FROM ${t}`)}`);
  console.log('\nเก็บไว้ (ไม่ลบ): company, app_user, team, team_member, priority, project_type, contact_role, chat_channel, contact_method, tag, pipeline_stage');

  if (!CONFIRM) { console.log('\n👉 DRY-RUN ยังไม่ลบ ถ้าโอเครันซ้ำ  --wipe-all --confirm'); return; }

  console.log('\nกำลังล้าง...');
  await q('UPDATE customer SET last_activity_id=NULL');
  await q('DELETE FROM sale_order');
  await q('DELETE FROM quotation');   // -> quotation_item cascade
  await q('DELETE FROM checkin');     // ลบก่อน activity/project/customer (มี FK ไปหาพวกนั้น)
  await q('DELETE FROM activity');    // -> activity_tag / activity_mention cascade
  await q('DELETE FROM project');     // -> project_related_customer / project_attachment cascade
  await q('DELETE FROM customer');    // -> contact / customer_branch / customer_tag cascade
  await q('DELETE FROM sales_target');
  console.log('🎉 ล้างข้อมูลธุรกิจทั้งหมดแล้ว — ระบบสะอาด พร้อมเริ่มกรอกจริง (ล็อกอิน/ค่าตั้งต้นยังอยู่ครบ)');
}

async function clearSeed() {
  console.log(`\n=== ลบ demo (${CONFIRM ? 'ลบจริง' : 'DRY-RUN ไม่ลบ'}${ALL ? ' +ALL' : ''}) ===\n`);
  const all = (await q(`SELECT c.id, c.name, c.ref_code,
      (SELECT count(*) FROM project x WHERE x.customer_id=c.id)::int projects,
      (SELECT count(*) FROM activity x WHERE x.customer_id=c.id)::int activities,
      (SELECT count(*) FROM checkin x WHERE x.customer_id=c.id)::int checkins
    FROM customer c ORDER BY c.ref_code NULLS LAST, c.id`)).rows;
  console.log('ลูกค้าทั้งหมด:');
  all.forEach(r => console.log(`  [${r.id}] ${r.name} (${r.ref_code || '-'}) ${SEED_REFS.includes(r.ref_code) ? '⟵ DEMO' : ''} · proj:${r.projects} act:${r.activities} checkin:${r.checkins}`));
  const seed = all.filter(r => SEED_REFS.includes(r.ref_code));
  const del = [], skip = [];
  for (const c of seed) (c.checkins > 0 && !ALL ? skip : del).push(c);
  console.log(`\nจะลบ: ${del.map(c => c.name).join(', ') || '-'}`);
  console.log(`ข้าม (มีเช็คอิน): ${skip.map(c => c.name).join(', ') || '-'}`);
  if (!CONFIRM) { console.log('\n👉 DRY-RUN ยังไม่ลบ ถ้าโอเครันซ้ำ --confirm (หรือลบหมดใช้ --wipe-all)'); return; }
  for (const c of del) {
    await q('DELETE FROM sale_order WHERE customer_id=$1', [c.id]);
    await q('UPDATE customer SET last_activity_id=NULL WHERE id=$1', [c.id]);
    await q('DELETE FROM quotation WHERE customer_id=$1', [c.id]);
    await q('DELETE FROM checkin WHERE customer_id=$1', [c.id]);
    await q('DELETE FROM activity WHERE customer_id=$1', [c.id]);
    await q('DELETE FROM project WHERE customer_id=$1', [c.id]);
    await q('DELETE FROM customer WHERE id=$1', [c.id]);
    console.log(`  ✓ ลบ ${c.name}`);
  }
  await q('DELETE FROM sales_target');
  console.log(`🎉 เสร็จ! ลบ ${del.length}, ข้าม ${skip.length}`);
}

(WIPE ? wipeAll() : clearSeed()).then(() => pool.end()).catch(e => { console.error('ERROR:', e.message); pool.end(); process.exit(1); });
