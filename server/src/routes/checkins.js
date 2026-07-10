const router = require('express').Router();
const { q } = require('../db');
const { wrap } = require('./_util');

const SELECT = `SELECT ck.*, c.name AS customer_name, u.display_name AS user_name, p.name AS project_name
  FROM checkin ck
  LEFT JOIN customer c ON c.id = ck.customer_id
  LEFT JOIN app_user u ON u.id = ck.user_id
  LEFT JOIN project p ON p.id = ck.project_id`;

const bkk = (d) => new Date(d).toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' });
const durTxt = (a, b) => { const m = Math.max(0, Math.floor((new Date(b) - new Date(a)) / 60000)); return (m >= 60 ? Math.floor(m / 60) + ' ชม. ' : '') + (m % 60) + ' นาที'; };

router.get('/', wrap(async (req, res) => {
  const where = ['ck.company_id=$1']; const args = [req.user.company_id]; let i = 2;
  if (req.query.mine === '1') { where.push(`ck.user_id=$${i++}`); args.push(req.user.id); }
  if (req.query.customer_id) { where.push(`ck.customer_id=$${i++}`); args.push(+req.query.customer_id); }
  const rows = (await q(`${SELECT} WHERE ${where.join(' AND ')} ORDER BY ck.check_in_at DESC LIMIT 200`, args)).rows;
  res.json({ rows });
}));

router.get('/active', wrap(async (req, res) => {
  const r = await q(`${SELECT} WHERE ck.company_id=$1 AND ck.user_id=$2 AND ck.check_out_at IS NULL ORDER BY ck.check_in_at DESC LIMIT 1`,
    [req.user.company_id, req.user.id]);
  res.json(r.rows[0] || null);
}));

// เช็คอิน + สร้างรายการ activity เชื่อมกับลูกค้า/โครงการ ให้ขึ้นใน Timeline
router.post('/', wrap(async (req, res) => {
  const b = req.body; const cid = req.user.company_id; const uid = req.user.id;
  const ck = (await q(`INSERT INTO checkin (company_id,customer_id,project_id,user_id,check_in_at,check_in_lat,check_in_lng,note,image_url)
    VALUES ($1,$2,$3,$4,now(),$5,$6,$7,$8) RETURNING *`,
    [cid, b.customer_id || null, b.project_id || null, uid, b.lat ?? null, b.lng ?? null, b.note || null, b.image_url || null])).rows[0];
  const detail = '📍 เช็คอิน' + (b.note ? (' — ' + b.note) : '');
  const act = (await q(`INSERT INTO activity (company_id,customer_id,project_id,direction,activity_at,activity_time,detail,status,assignee_user_id,created_by,image_url)
    VALUES ($1,$2,$3,'inbound',$4,$5,$6,'done',$7,$7,$8) RETURNING id`,
    [cid, ck.customer_id, ck.project_id, ck.check_in_at, bkk(ck.check_in_at), detail, uid, ck.image_url])).rows[0];
  await q('UPDATE checkin SET activity_id=$1 WHERE id=$2', [act.id, ck.id]);
  if (ck.customer_id) await q('UPDATE customer SET last_activity_id=$1, updated_at=now() WHERE id=$2 AND company_id=$3', [act.id, ck.customer_id, cid]);
  res.status(201).json({ ...ck, activity_id: act.id });
}));

// เช็คเอาท์ + อัปเดตรายการ activity เดิมให้มีเวลาออก + ระยะเวลา
router.put('/:id/checkout', wrap(async (req, res) => {
  const b = req.body; const cid = req.user.company_id;
  const ck = (await q(`UPDATE checkin SET check_out_at=now(),check_out_lat=$3,check_out_lng=$4
    WHERE id=$1 AND company_id=$2 AND check_out_at IS NULL RETURNING *`,
    [req.params.id, cid, b.lat ?? null, b.lng ?? null])).rows[0];
  if (!ck) return res.status(404).json({ error: 'not found or already checked out' });
  if (ck.activity_id) {
    const detail = `📍 เยี่ยมลูกค้า (${bkk(ck.check_in_at)}–${bkk(ck.check_out_at)}, ${durTxt(ck.check_in_at, ck.check_out_at)})` + (ck.note ? (' — ' + ck.note) : '');
    await q('UPDATE activity SET detail=$1 WHERE id=$2 AND company_id=$3', [detail, ck.activity_id, cid]);
  }
  res.json(ck);
}));

module.exports = router;
