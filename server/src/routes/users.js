const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { q } = require('../db');
const { wrap } = require('./_util');

// เฉพาะ admin เท่านั้น
router.use((req, res, next) => {
  if (String(req.user.role || '').toLowerCase() !== 'admin') return res.status(403).json({ error: 'เฉพาะผู้ดูแลระบบ (admin) เท่านั้น' });
  next();
});

router.get('/', wrap(async (req, res) => {
  const rows = (await q(`SELECT u.id, u.display_name, u.email, u.phone, u.role, u.is_active, u.team_id, t.name AS team_name, u.created_at
    FROM app_user u LEFT JOIN team t ON t.id=u.team_id
    WHERE u.company_id=$1 ORDER BY u.is_active DESC, u.display_name`, [req.user.company_id])).rows;
  res.json({ rows });
}));

router.post('/', wrap(async (req, res) => {
  const b = req.body;
  if (!b.display_name || !b.email) return res.status(400).json({ error: 'ต้องมีชื่อและอีเมล' });
  const hash = bcrypt.hashSync(b.password || 'loveandaman123', 10);
  try {
    const r = await q(`INSERT INTO app_user (company_id,display_name,email,phone,password_hash,role,team_id,is_active)
      VALUES ($1,$2,$3,$4,$5,COALESCE($6,'sales'),$7,true) RETURNING id,display_name,email,phone,role,is_active,team_id`,
      [req.user.company_id, b.display_name, String(b.email).toLowerCase().trim(), b.phone || null, hash, b.role || null, b.team_id || null]);
    res.status(201).json(r.rows[0]);
  } catch (e) {
    if (String(e.message).includes('unique') || e.code === '23505') return res.status(409).json({ error: 'อีเมลนี้ถูกใช้แล้ว' });
    throw e;
  }
}));

router.put('/:id', wrap(async (req, res) => {
  const b = req.body; const id = +req.params.id;
  if (id === req.user.id && b.is_active === false) return res.status(400).json({ error: 'ปิดใช้งานบัญชีตัวเองไม่ได้' });
  if (id === req.user.id && b.role && b.role !== 'admin') return res.status(400).json({ error: 'ลดสิทธิ์ตัวเองไม่ได้' });
  const r = await q(`UPDATE app_user SET display_name=$3, email=$4, phone=$5, role=$6, team_id=$7, is_active=$8
    WHERE id=$1 AND company_id=$2 RETURNING id,display_name,email,phone,role,is_active,team_id`,
    [id, req.user.company_id, b.display_name, String(b.email).toLowerCase().trim(), b.phone || null, b.role || 'sales', b.team_id || null, b.is_active !== false]);
  if (!r.rows[0]) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
  res.json(r.rows[0]);
}));

router.put('/:id/password', wrap(async (req, res) => {
  const pw = req.body.password;
  if (!pw || pw.length < 6) return res.status(400).json({ error: 'รหัสผ่านอย่างน้อย 6 ตัวอักษร' });
  const hash = bcrypt.hashSync(pw, 10);
  const r = await q('UPDATE app_user SET password_hash=$3 WHERE id=$1 AND company_id=$2 RETURNING id', [+req.params.id, req.user.company_id, hash]);
  if (!r.rows[0]) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
  res.json({ ok: true });
}));

router.delete('/:id', wrap(async (req, res) => {
  const id = +req.params.id;
  if (id === req.user.id) return res.status(400).json({ error: 'ลบบัญชีตัวเองไม่ได้' });
  const u = (await q('SELECT id FROM app_user WHERE id=$1 AND company_id=$2', [id, req.user.company_id])).rows[0];
  if (!u) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
  await q('DELETE FROM team_member WHERE user_id=$1', [id]);
  try {
    await q('DELETE FROM app_user WHERE id=$1 AND company_id=$2', [id, req.user.company_id]);
    res.json({ ok: true });
  } catch (e) {
    if (e.code === '23503') return res.status(409).json({ error: 'ผู้ใช้นี้มีข้อมูลผูกอยู่ (เอเจ้นท์/งาน/เช็คอิน) ลบไม่ได้ — ให้ปิดใช้งานแทน' });
    throw e;
  }
}));

module.exports = router;
