require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, q } = require('./db');
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

async function main() {
  console.log('Seeding...');
  await q(`TRUNCATE company, app_user, team, team_member, priority, project_type, contact_role,
    chat_channel, contact_method, tag, pipeline_stage, customer, customer_branch, contact, customer_tag,
    project, project_related_customer, project_attachment, activity, activity_tag, activity_mention,
    sales_target, quotation, quotation_item, sale_order RESTART IDENTITY CASCADE`);

  const co = (await q(`INSERT INTO company (name,phone,email,country_code,province)
    VALUES ('บริษัท เลิฟ ไอแลนด์ จำกัด','063-000-0000','digital.mkt@loveandaman.com','TH','ภูเก็ต') RETURNING id`)).rows[0].id;

  // teams
  const t1 = (await q(`INSERT INTO team (company_id,name) VALUES ($1,'ทีมขายหลัก') RETURNING id`, [co])).rows[0].id;
  const t2 = (await q(`INSERT INTO team (company_id,name) VALUES ($1,'ทีม MICE/กรุ๊ป') RETURNING id`, [co])).rows[0].id;

  // users (with team)
  const hash = bcrypt.hashSync('password', 10);
  const mkUser = async (name, email, role, team) => (await q(
    `INSERT INTO app_user (company_id,display_name,email,password_hash,role,team_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [co, name, email, hash, role, team])).rows[0].id;
  const admin = await mkUser('Admin Love', 'admin@loveandaman.com', 'admin', t1);
  const u2 = await mkUser('สมหญิง (เซลล์)', 'sales@loveandaman.com', 'sales', t1);
  const u3 = await mkUser('ก้อง (เซลล์)', 'kong@loveandaman.com', 'sales', t2);
  for (const [tm, us] of [[t1, [admin, u2]], [t2, [u3]]]) for (const u of us)
    await q('INSERT INTO team_member (team_id,user_id) VALUES ($1,$2)', [tm, u]);

  await q(`INSERT INTO priority (id,label) VALUES (1,'ต่ำ'),(2,'ปานกลาง'),(3,'สูง'),(4,'สูงมาก'),(5,'ด่วนที่สุด')`);
  await q(`INSERT INTO project_type (company_id,name) VALUES ($1,'แพ็กเกจทัวร์'),($1,'จองรายวัน'),($1,'อีเวนต์/กรุ๊ป'),($1,'อื่น ๆ')`, [co]);
  await q(`INSERT INTO contact_role (company_id,name) VALUES ($1,'ผู้มีอำนาจตัดสินใจ'),($1,'ผู้ประสานงาน'),($1,'ฝ่ายจัดซื้อ')`, [co]);
  await q(`INSERT INTO chat_channel (name) VALUES ('LINE'),('Facebook'),('WhatsApp'),('WeChat')`);
  await q(`INSERT INTO contact_method (company_id,name) VALUES ($1,'โทร'),($1,'อีเมล'),($1,'เข้าพบ'),($1,'LINE'),($1,'ประชุมออนไลน์')`, [co]);

  const stages = ['ลูกค้าติดต่อเข้ามา/ เซลล์ติดต่อหาลูกค้า','ทำนัดนำเสนอบริการ','เข้าพบ/ นำเสนอบริการ','สร้างและส่งใบเสนอราคา','ติดตามการขาย','ลูกค้าตกลงซื้อบริการ','ติดตามการชำระเงิน','ปิดการขาย'];
  for (let i = 0; i < stages.length; i++)
    await q('INSERT INTO pipeline_stage (id,company_id,seq,name,is_won) VALUES ($1,$2,$3,$4,$5)', [i + 1, co, i + 1, stages[i], i === 7]);

  const custTags = [['1.Connection','source'],['1.Facebook','source'],['1.Referral','source'],['1.Website','source'],['1.เซลล์หาเอง','source'],['2.บริษัททัวร์','type'],['2.รีสอร์ต','type'],['2.โรงแรม','type'],['A ส่งประจำ ส่งเยอะ','grade'],['B ส่งประจำแต่ไม่เยอะ','grade'],['C ส่งบ้างไม่ส่งบ้าง','grade'],['D เจ้าใหม่ / ส่งน้อย','grade'],['Tour Desk','other']];
  const tagId = {};
  for (const [name, grp] of custTags) tagId[name] = (await q('INSERT INTO tag (company_id,name,tag_group,scope) VALUES ($1,$2,$3,\'customer\') RETURNING id', [co, name, grp])).rows[0].id;
  const actTags = {};
  for (const name of ['สนใจ','ขอใบเสนอราคา','ขอคิดดูก่อน','ต่อรองราคา','ปิดการขาย','ไม่สนใจ'])
    actTags[name] = (await q('INSERT INTO tag (company_id,name,scope) VALUES ($1,$2,\'activity\') RETURNING id', [co, name])).rows[0].id;

  const custDefs = [
    { name:'บริษัท อันดามัน ทราเวล จำกัด', life:'regular', pri:4, owner:u2, team:t1, tags:['2.บริษัททัวร์','A ส่งประจำ ส่งเยอะ','1.Referral'] },
    { name:'ภูเก็ต บีช รีสอร์ท', life:'new', pri:3, owner:u2, team:t1, tags:['2.รีสอร์ต','C ส่งบ้างไม่ส่งบ้าง','1.Website'] },
    { name:'Grand Hotel Krabi', life:'target', pri:2, owner:u3, team:t2, tags:['2.โรงแรม','B ส่งประจำแต่ไม่เยอะ','1.Facebook'] },
    { name:'Sunrise Tours Co.', life:'regular', pri:5, owner:u3, team:t2, tags:['2.บริษัททัวร์','A ส่งประจำ ส่งเยอะ','1.Connection'] },
    { name:'Lanta Paradise Resort', life:'lapsed', pri:1, owner:u2, team:t1, tags:['2.รีสอร์ต','D เจ้าใหม่ / ส่งน้อย','1.เซลล์หาเอง'] },
  ];
  const custIds = [], contactIds = [];
  for (let i = 0; i < custDefs.length; i++) {
    const c = custDefs[i];
    const id = (await q(`INSERT INTO customer (company_id,name,ref_code,tax_id,phone,email,province,district,priority_id,owner_user_id,owner_team_id,lifecycle_stage,is_followed,created_by)
      VALUES ($1,$2,$3,$4,'076-000000',$5,'ภูเก็ต','เมือง',$6,$7,$8,$9,true,$7) RETURNING id`,
      [co, c.name, 'REF' + (1001 + i), '010' + (5550000 + i), 'info' + i + '@example.com', c.pri, c.owner, c.team, c.life])).rows[0].id;
    custIds.push(id);
    const ct = (await q(`INSERT INTO contact (customer_id,name,is_primary,phone,position,email,chat_channel_id,chat_id) VALUES ($1,$2,true,'081-2345678','ผู้จัดการฝ่ายขาย',$3,1,$4) RETURNING id`, [id, 'คุณสมชาย ' + (i + 1), 'contact' + i + '@example.com', '@cust' + i])).rows[0].id;
    contactIds.push(ct);
    await q(`INSERT INTO customer_branch (customer_id,branch_name,address,province,district,is_registered) VALUES ($1,'สำนักงานใหญ่','123 ถ.ทวีวงศ์','ภูเก็ต','เมือง',true)`, [id]);
    for (const t of c.tags) await q('INSERT INTO customer_tag (customer_id,tag_id) VALUES ($1,$2)', [id, tagId[t]]);
  }

  const pjDefs = [
    { name:'แพ็กเกจ 4 เกาะ กรุ๊ป 40 ท่าน', c:0, stage:4, val:120000, pri:4, type:1, open:true },
    { name:'ทริปดำน้ำ Similan 3D2N', c:1, stage:2, val:85000, pri:3, type:1, open:true },
    { name:'MICE group Krabi', c:2, stage:6, val:350000, pri:5, type:3, open:true },
    { name:'Speedboat charter รายเดือน', c:3, stage:8, val:500000, pri:4, type:4, open:false },
  ];
  const projIds = [];
  for (let i = 0; i < pjDefs.length; i++) {
    const p = pjDefs[i]; const c = custDefs[p.c];
    const code = 'PJ#' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + String(i + 1).padStart(4, '0');
    const id = (await q(`INSERT INTO project (company_id,code,name,customer_id,project_type_id,stage_id,estimated_value,start_date,end_date,is_open,priority_id,owner_user_id,owner_team_id,created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_DATE,$8,$9,$10,$11,$12,$11) RETURNING id`,
      [co, code, p.name, custIds[p.c], p.type, p.stage, p.val, addDays(30), p.open, p.pri, c.owner, c.team])).rows[0].id;
    projIds.push(id);
  }

  const aDefs = [
    { c:0, p:0, dir:'outbound', m:1, type:0, detail:'โทรติดตามใบเสนอราคา', due:addDays(0), status:'pending', stage:4, pri:4, tags:['ขอใบเสนอราคา'], assignee:u2 },
    { c:1, p:1, dir:'inbound', m:4, type:1, detail:'ลูกค้าสอบถามโปรแกรมทัวร์ทาง LINE', due:addDays(2), status:'pending', stage:2, pri:3, tags:['สนใจ'], assignee:u2 },
    { c:2, p:2, dir:'outbound', m:3, type:2, detail:'เข้าพบนำเสนอแพ็กเกจ MICE', due:addDays(-1), status:'pending', stage:3, pri:5, tags:['ต่อรองราคา'], assignee:u3 },
    { c:3, p:3, dir:'outbound', m:1, type:4, detail:'ปิดการขายเรียบร้อย ส่งสัญญา', due:null, status:'done', stage:8, pri:4, tags:['ปิดการขาย'], assignee:u3 },
  ];
  for (const a of aDefs) {
    const due = a.due === null ? null : `'${a.due}'`;
    const id = (await q(`INSERT INTO activity (company_id,customer_id,contact_id,project_id,stage_id,direction,activity_type,activity_time,contact_method_id,activity_at,detail,is_follow_up,due_at,status,priority_id,assignee_user_id,created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'10:30',$8,now(),$9,$10,${due},$11,$12,$13,$13) RETURNING id`,
      [co, custIds[a.c], contactIds[a.c], projIds[a.p], a.stage, a.dir, a.type, a.m, a.detail, a.status === 'pending', a.status, a.pri, a.assignee])).rows[0].id;
    for (const t of a.tags) await q('INSERT INTO activity_tag (activity_id,tag_id) VALUES ($1,$2)', [id, actTags[t]]);
    await q('UPDATE customer SET last_activity_id=$1 WHERE id=$2', [id, custIds[a.c]]);
  }

  for (const [m, tv, av] of [['new_customer',5,2],['opportunity',10,4],['sales',500000,120000],['profit',150000,40000]])
    await q(`INSERT INTO sales_target (company_id,user_id,team_id,period,period_date,metric,target_value,actual_value) VALUES ($1,$2,$3,'daily',CURRENT_DATE,$4,$5,$6)`, [co, u2, t1, m, tv, av]);

  const qh = (await q(`INSERT INTO quotation (company_id,code,project_id,customer_id,issue_date,subtotal,vat,grand_total,status,owner_user_id)
    VALUES ($1,'QT-1001',$2,$3,CURRENT_DATE,120000,8400,128400,'sent',$4) RETURNING id`, [co, projIds[0], custIds[0], u2])).rows[0].id;
  await q(`INSERT INTO quotation_item (quotation_id,description,qty,unit_price,amount) VALUES ($1,'แพ็กเกจ 4 เกาะ',40,3000,120000)`, [qh]);

  console.log('Seed complete. Login: admin@loveandaman.com / password');
}
module.exports = { run: main };
if (require.main === module) {
  main().then(() => pool.end()).catch(e => { console.error(e); pool.end(); process.exit(1); });
}
