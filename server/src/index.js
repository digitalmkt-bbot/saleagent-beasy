require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { login, authMiddleware } = require('./auth');

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
app.listen(PORT, () => console.log(`Jubili-clone API running on :${PORT}`));
