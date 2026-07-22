// นำเข้าเอเจ้นท์จากระบบ rate (sb_agents) มาเป็นเอเจ้นท์ใน CRM + map เจ้าของตามเซลส์
// admin/manager นำเข้าทั้งหมด, เซลส์นำเข้าเฉพาะเอเจ้นท์ที่ master setting ระบุให้ตัวเอง
// ใช้ร่วมกัน: POST /rates/import-agents (ปุ่ม ⤓ ดึงจากระบบ Rate) และ auto-sync หลังล็อกอิน
const { q } = require('./db');
const { rq, rateReady } = require('./rate-db');
const { rateScopeFor } = require('./rate-scope');

function buildNote(a) {
  const lines = [];
  if (a.companyinfo_legalname) lines.push(`ชื่อนิติบุคคล: ${a.companyinfo_legalname}`);
  if (a.companyinfo_tatlicense) lines.push(`ใบอนุญาต TAT: ${a.companyinfo_tatlicense}`);
  if (a.companyinfo_tel) lines.push(`โทร (สำนักงาน): ${a.companyinfo_tel}`);
  if (a.companyinfo_hotline) lines.push(`Hotline: ${a.companyinfo_hotline}`);
  if (a.companyinfo_fax) lines.push(`Fax: ${a.companyinfo_fax}`);
  if (a.companyinfo_website) lines.push(`เว็บไซต์: ${a.companyinfo_website}`);
  if (a.market) lines.push(`Market: ${a.market}`);
  if (a.paytype) lines.push(`รูปแบบชำระ: ${a.paytype}`);
  if (a.creditdays) lines.push(`เครดิต: ${a.creditdays} วัน`);
  if (a.creditlimit) lines.push(`วงเงินเครดิต: ${a.creditlimit}`);
  if (a.contractstart || a.contractend) lines.push(`สัญญา: ${a.contractstart || ''} – ${a.contractend || ''}${a.contractversion ? ` (v${a.contractversion})` : ''}`);
  if (a.bookingchannel_method) lines.push(`Booking channel: ${a.bookingchannel_method}`);
  if (a.bookingchannel_cutoff) lines.push(`Cutoff: ${a.bookingchannel_cutoff}`);
  if (a.bookingchannel_cancelpolicy) lines.push(`Cancel policy: ${a.bookingchannel_cancelpolicy}`);
  if (a.bookingchannel_email) lines.push(`Booking email: ${a.bookingchannel_email}`);
  if (a.bookingchannel_phone) lines.push(`Booking โทร: ${a.bookingchannel_phone}`);
  return lines.length ? lines.join('\n') : null;
}

// user = { id, company_id, role } (รูปเดียวกับ req.user จาก JWT)
async function importAgentsFor(user) {
  const cid = user.company_id;
  const sc = await rateScopeFor(user);
  if (!sc.all && !sc.code) return { error: 'จับคู่บัญชีเซลส์ในระบบ rate ไม่ได้ (ตรวจสอบอีเมล/รหัสผู้ใช้กับผู้ดูแลระบบ)' };
  const agents = (await rq(`
    SELECT id, code, name, sales, email, phone,
      companyinfo_taxid, companyinfo_address, companyinfo_legalname, companyinfo_tatlicense,
      companyinfo_tel, companyinfo_hotline, companyinfo_fax, companyinfo_website,
      market, paytype, creditdays, creditlimit, contractstart, contractend, contractversion,
      agentsignatory_name, agentsignatory_designation, agentsignatory_tel,
      bookingchannel_method, bookingchannel_cutoff, bookingchannel_cancelpolicy, bookingchannel_email, bookingchannel_phone
    FROM operation_schemas.sb_agents WHERE name IS NOT NULL AND name <> ''${sc.all ? '' : ' AND sales = $1'}
    ORDER BY name`, sc.all ? [] : [sc.code])).rows;
  // map เซลส์ระบบ rate -> ผู้ใช้ CRM ด้วย "อีเมล" หรือ "user_code" (= id / code / name ของ sb_sales) — กติกาเดียวกับ rateScopeFor
  const sales = (await rq(`SELECT id, code, name, email FROM operation_schemas.sb_sales`)).rows;
  const users = (await q('SELECT id, lower(email) AS email, lower(trim(coalesce(user_code,\'\'))) AS user_code FROM app_user WHERE company_id=$1', [cid])).rows;
  const ownerBySales = {};
  for (const s of sales) {
    const se = String(s.email || '').toLowerCase().trim();
    const keys = [s.id, s.code, s.name].map(x => String(x || '').toLowerCase().trim()).filter(Boolean);
    const u = users.find(u => (se && u.email === se) || (u.user_code && keys.includes(u.user_code)));
    if (u) ownerBySales[s.id] = u.id;
  }

  let created = 0, updated = 0;
  for (const a of agents) {
    const code = (a.code || a.id || '').toString().trim() || null;
    const owner = ownerBySales[a.sales] || null;
    const note = buildNote(a);
    const existing = code ? (await q('SELECT id FROM customer WHERE company_id=$1 AND ref_code=$2 LIMIT 1', [cid, code])).rows[0] : null;
    let custId;
    if (existing) {
      custId = existing.id;
      await q(`UPDATE customer SET name=$2, phone=COALESCE($3,phone), email=COALESCE($4,email), owner_user_id=COALESCE($5,owner_user_id), tax_id=COALESCE($6,tax_id), address=COALESCE($7,address), note=COALESCE($8,note), updated_at=now() WHERE id=$1`,
        [custId, a.name, a.phone || null, a.email || null, owner, a.companyinfo_taxid || null, a.companyinfo_address || null, note]);
      updated++;
    } else {
      const r = await q(`INSERT INTO customer (company_id,name,ref_code,phone,email,tax_id,address,note,priority_id,owner_user_id,lifecycle_stage,is_followed,created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,3,$9,'regular',true,$10) RETURNING id`,
        [cid, a.name, code, a.phone || null, a.email || null, a.companyinfo_taxid || null, a.companyinfo_address || null, note, owner, user.id]);
      custId = r.rows[0].id;
      created++;
    }
    if (a.agentsignatory_name) {
      const ec = (await q('SELECT id FROM contact WHERE customer_id=$1 AND name=$2 LIMIT 1', [custId, a.agentsignatory_name])).rows[0];
      if (ec) {
        await q('UPDATE contact SET position=$2, phone=$3 WHERE id=$1', [ec.id, a.agentsignatory_designation || null, a.agentsignatory_tel || null]);
      } else {
        await q('INSERT INTO contact (customer_id,name,is_primary,position,phone) VALUES ($1,$2,true,$3,$4)', [custId, a.agentsignatory_name, a.agentsignatory_designation || null, a.agentsignatory_tel || null]);
      }
    }
  }
  return { created, updated, total: agents.length };
}

// auto-sync หลังล็อกอิน: ไม่บล็อกการตอบกลับ (ทำงานเบื้องหลัง) + throttle ต่อผู้ใช้
// กันล็อกอินถี่/หลายเครื่องยิง import ซ้อนกันใส่ rate DB
const lastSync = new Map(); // user_id -> timestamp
const SYNC_TTL_MS = 10 * 60 * 1000;
function syncAgentsOnLogin(user) {
  if (!rateReady()) return;
  const at = lastSync.get(user.id);
  if (at && Date.now() - at < SYNC_TTL_MS) return;
  lastSync.set(user.id, Date.now());
  importAgentsFor(user)
    .then(r => {
      if (r.error) console.warn(`[agent-sync] user ${user.id}: ${r.error}`);
      else if (r.created || r.updated) console.log(`[agent-sync] user ${user.id}: created ${r.created}, updated ${r.updated} (total ${r.total})`);
    })
    .catch(e => console.error(`[agent-sync] user ${user.id}:`, e.message));
}

module.exports = { importAgentsFor, syncAgentsOnLogin };
