const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { q } = require('./db');
const SECRET = process.env.JWT_SECRET || 'dev-secret';

async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email/password required' });
  const { rows } = await q(
    'SELECT id, company_id, display_name, role, password_hash FROM app_user WHERE email=$1 AND is_active=true',
    [email]);
  const u = rows[0];
  if (!u || !u.password_hash || !bcrypt.compareSync(password, u.password_hash))
    return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
  const token = jwt.sign({ id: u.id, company_id: u.company_id, role: u.role }, SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: u.id, name: u.display_name, role: u.role, company_id: u.company_id } });
}

function authMiddleware(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try { req.user = jwt.verify(token, SECRET); next(); }
  catch { return res.status(401).json({ error: 'invalid token' }); }
}

module.exports = { login, authMiddleware, SECRET };
