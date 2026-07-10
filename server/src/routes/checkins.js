const router = require('express').Router();
const { q } = require('../db');
const { wrap } = require('./_util');

const SELECT = `SELECT ck.*, c.name AS customer_name, u.display_name AS user_name
  FROM checkin ck
  LEFT JOIN customer c ON c.id = ck.customer_id
  LEFT JOIN app_user u ON u.id = ck.user_id`;

// ประวัติเช็คอิน (mine=1 = เฉพาะของฉัน)
router.get('/', wrap(async (req, res) => {
  const where = ['ck.company_id=$1']; const args = [req.user.company_id]; let i = 2;
  if (req.query.mine === '1') { where.push(`ck.user_id=$${i++}`); args.push(req.user.id); }
  if (req.query.customer_id) { where.push(`ck.customer_id=$${i++}`); args.push(+req.query.customer_id); }
  const rows = (await q(`${SELECT} WHERE ${where.join(' AND ')} ORDER BY ck.check_in_at DESC LIMIT 200`, args)).rows;
  res.json({ rows });
}));

// เช็คอินที่ยังไม่เช็คเอาท์ของผู้ใช้ปัจจุบัน
router.get('/active', wrap(async (req, res) => {
  const r = await q(`${SELECT} WHERE ck.company_id=$1 AND ck.user_id=$2 AND ck.check_out_at IS NULL ORDER BY ck.check_in_at DESC LIMIT 1`,
    [req.user.company_id, req.user.id]);
  res.json(r.rows[0] || null);
}));

// เช็คอิน
router.post('/', wrap(async (req, res) => {
  const b = req.body;
  const r = await q(`INSERT INTO checkin (company_id,customer_id,user_id,check_in_at,check_in_lat,check_in_lng,note)
    VALUES ($1,$2,$3,now(),$4,$5,$6) RETURNING *`,
    [req.user.company_id, b.customer_id || null, req.user.id, b.lat ?? null, b.lng ?? null, b.note || null]);
  res.status(201).json(r.rows[0]);
}));

// เช็คเอาท์
router.put('/:id/checkout', wrap(async (req, res) => {
  const b = req.body;
  const r = await q(`UPDATE checkin SET check_out_at=now(),check_out_lat=$3,check_out_lng=$4
    WHERE id=$1 AND company_id=$2 AND check_out_at IS NULL RETURNING *`,
    [req.params.id, req.user.company_id, b.lat ?? null, b.lng ?? null]);
  if (!r.rows[0]) return res.status(404).json({ error: 'not found or already checked out' });
  res.json(r.rows[0]);
}));

module.exports = router;
