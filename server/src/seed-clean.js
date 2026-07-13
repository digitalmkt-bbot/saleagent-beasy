// seed สะอาด: สร้างเฉพาะบริษัท + admin 1 คน + ค่าตั้งต้น (ไม่มีเอเจ้นท์/โครงการตัวอย่าง)
// ตั้งค่าได้ผ่าน env: COMPANY_NAME, ADMIN_EMAIL, ADMIN_PASSWORD
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, q } = require('./db');

async function main() {
  const companyName = process.env.COMPANY_NAME || 'บริษัท เลิฟ ไอแลนด์ จำกัด';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@loveandaman.com';
  const adminPass = process.env.ADMIN_PASSWORD || 'password';
  console.log('Clean seed for:', companyName);
  await q(`TRUNCATE company, app_user, team, team_member, priority, project_type, contact_role,
    chat_channel, contact_method, tag, pipeline_stage, customer, customer_branch, contact, customer_tag,
    project, project_related_customer, project_attachment, activity, activity_tag, activity_mention,
    sales_target, quotation, quotation_item, sale_order RESTART IDENTITY CASCADE`);

  const co = (await q(`INSERT INTO company (name,country_code,province) VALUES ($1,'TH','ภูเก็ต') RETURNING id`, [companyName])).rows[0].id;
  const team = (await q(`INSERT INTO team (company_id,name) VALUES ($1,'ทีมขายหลัก') RETURNING id`, [co])).rows[0].id;
  const admin = (await q(`INSERT INTO app_user (company_id,display_name,email,password_hash,role,team_id) VALUES ($1,'ผู้ดูแลระบบ',$2,$3,'admin',$4) RETURNING id`,
    [co, adminEmail, bcrypt.hashSync(adminPass, 10), team])).rows[0].id;
  await q('INSERT INTO team_member (team_id,user_id) VALUES ($1,$2)', [team, admin]);

  await q(`INSERT INTO priority (id,label) VALUES (1,'ต่ำ'),(2,'ปานกลาง'),(3,'สูง'),(4,'สูงมาก'),(5,'ด่วนที่สุด')`);
  await q(`INSERT INTO project_type (company_id,name) VALUES ($1,'แพ็กเกจทัวร์'),($1,'จองรายวัน'),($1,'อีเวนต์/กรุ๊ป'),($1,'อื่น ๆ')`, [co]);
  await q(`INSERT INTO contact_role (company_id,name) VALUES ($1,'ผู้มีอำนาจตัดสินใจ'),($1,'ผู้ประสานงาน'),($1,'ฝ่ายจัดซื้อ')`, [co]);
  await q(`INSERT INTO chat_channel (name) VALUES ('LINE'),('Facebook'),('WhatsApp'),('WeChat')`);
  await q(`INSERT INTO contact_method (company_id,name) VALUES ($1,'โทร'),($1,'อีเมล'),($1,'เข้าพบ'),($1,'LINE'),($1,'ประชุมออนไลน์')`, [co]);

  const stages = ['เอเจ้นท์ติดต่อเข้ามา/ เซลล์ติดต่อหาเอเจ้นท์','ทำนัดนำเสนอบริการ','เข้าพบ/ นำเสนอบริการ','สร้างและส่งใบเสนอราคา','ติดตามการขาย','เอเจ้นท์ตกลงซื้อบริการ','ติดตามการชำระเงิน','ปิดการขาย'];
  for (let i = 0; i < stages.length; i++)
    await q('INSERT INTO pipeline_stage (id,company_id,seq,name,is_won) VALUES ($1,$2,$3,$4,$5)', [i + 1, co, i + 1, stages[i], i === 7]);

  const custTags = [['1.Connection','source'],['1.Facebook','source'],['1.Referral','source'],['1.Website','source'],['1.เซลล์หาเอง','source'],['2.บริษัททัวร์','type'],['2.รีสอร์ต','type'],['2.โรงแรม','type'],['A ส่งประจำ ส่งเยอะ','grade'],['B ส่งประจำแต่ไม่เยอะ','grade'],['C ส่งบ้างไม่ส่งบ้าง','grade'],['D เจ้าใหม่ / ส่งน้อย','grade'],['Tour Desk','other']];
  for (const [name, grp] of custTags) await q('INSERT INTO tag (company_id,name,tag_group,scope) VALUES ($1,$2,$3,\'customer\')', [co, name, grp]);
  for (const name of ['สนใจ','ขอใบเสนอราคา','ขอคิดดูก่อน','ต่อรองราคา','ปิดการขาย','ไม่สนใจ']) await q('INSERT INTO tag (company_id,name,scope) VALUES ($1,$2,\'activity\')', [co, name]);

  console.log(`เสร็จ! เข้าระบบด้วย ${adminEmail} / ${adminPass}`);
  console.log('ค่าตั้งต้นพร้อม (ไปป์ไลน์ 8 ขั้น, แท็ก, วิธีติดต่อ) — ยังไม่มีเอเจ้นท์/โครงการ');
  console.log('นำเข้าเอเจ้นท์ได้ด้วย: npm run import:customers -- path/to/customers.csv');
}
module.exports = { run: main };
if (require.main === module) {
  main().then(() => pool.end()).catch(e => { console.error(e); pool.end(); process.exit(1); });
}
