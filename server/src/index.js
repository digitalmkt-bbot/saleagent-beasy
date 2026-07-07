require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { login, authMiddleware } = require('./auth');
const { autoInit } = require('./auto-init');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));
app.post('/api/login', login);

// protected routes
app.use('/api', authMiddleware);
app.use('/api/customers', require('./routes/customers'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/quotations', require('./routes/quotations'));
app.use('/api/saleorders', require('./routes/saleorders'));
app.use('/api/tags', require('./routes/tags'));
app.use('/api/meta', require('./routes/meta'));
app.use('/api/reports', require('./routes/reports'));

app.use((err, req, res, next) => { // eslint-disable-line
  console.error(err);
  res.status(500).json({ error: err.message || 'server error' });
});

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await autoInit();               // สร้างตาราง + ข้อมูลตั้งต้นอัตโนมัติ (ครั้งแรก)
  } catch (e) {
    console.error('[auto-init] ผิดพลาด:', e.message);
    // ไม่ล้มเซิร์ฟเวอร์: ปล่อยให้สตาร์ทต่อ เผื่อ DB ยังไม่พร้อมชั่วคราว
  }
  app.listen(PORT, () => console.log(`Jubili-clone API running on :${PORT}`));
}

start();
