// notify.js — ระบบแจ้งเตือน + webhook สำหรับ Sales Plan
// - บันทึกลง sales_plan_notification (in-app feed / audit)
// - ส่ง webhook ไปยัง WEBHOOK_URL ถ้าตั้งค่าไว้ (มิฉะนั้นข้าม)
// - ส่ง LINE Notify ถ้าตั้ง LINE_NOTIFY_TOKEN (มิฉะนั้นข้าม)
// ทั้งหมดทำงานแบบ fire-and-forget ไม่หน่วง/ไม่ทำให้ request ล้ม
const { q } = require('./db');

function log(...a) { console.log('[notify]', ...a); }

async function record(companyId, n = {}) {
  try {
    await q(
      `INSERT INTO sales_plan_notification (company_id,user_id,sales_plan_id,sales_plan_activity_id,event,title,body,level)
       VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,'info'))`,
      [companyId, n.user_id || null, n.plan_id || null, n.activity_id || null, n.event, n.title || null, n.body || null, n.level]);
  } catch (e) { log('record failed: ' + e.message); }
}

async function sendWebhook(event, payload) {
  const url = process.env.WEBHOOK_URL;
  if (!url || typeof fetch !== 'function') return;
  try {
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event, payload, ts: Date.now() }) });
  } catch (e) { log('webhook failed: ' + e.message); }
}

async function sendLine(message) {
  const token = process.env.LINE_NOTIFY_TOKEN;
  if (!token || typeof fetch !== 'function' || !message) return;
  try {
    await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ message }).toString(),
    });
  } catch (e) { log('line failed: ' + e.message); }
}

async function sendPush(event, payload) {
  const url = process.env.PUSH_WEBHOOK_URL;
  if (!url || typeof fetch !== 'function') return;
  try {
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event, payload, ts: Date.now() }) });
  } catch (e) { log('push failed: ' + e.message); }
}

// dispatch: บันทึก in-app + ยิง webhook/LINE/push พร้อมกัน (ไม่ await ใน caller ก็ได้)
function dispatch(companyId, event, n = {}) {
  const line = n.title ? (n.title + (n.body ? '\n' + n.body : '')) : (n.body || event);
  // ไม่บล็อก request: ทำงานเบื้องหลัง
  Promise.allSettled([
    record(companyId, { ...n, event }),
    sendWebhook(event, { company_id: companyId, ...n }),
    sendLine(line),
    sendPush(event, { company_id: companyId, ...n }),
  ]).catch(() => {});
}

module.exports = { dispatch, record, sendWebhook, sendLine, sendPush };
