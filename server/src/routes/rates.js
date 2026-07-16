const router = require('express').Router();
const { wrap } = require('./_util');
const { rq, rateReady } = require('../rate-db');
const { q } = require('../db');
const { isStaff } = require('./_scope');

const ZMAP = { PK: 'pk', KL: 'kl', NoTransfer: 'notransfer' };
const PAX = ['adult_thai', 'adult_fr', 'child_thai', 'child_fr', 'infant_thai', 'infant_fr'];

router.get('/status', (req, res) => res.json({ ready: rateReady() }));

// admin/manager -> {all:true}. staff -> match CRM email กับ sb_sales.email ได้ code เซลส์ (หรือ unmatched)
async function scopeFor(req) {
  if (!isStaff(req.user)) return { all: true };
  const u = (await q('SELECT email, display_name FROM app_user WHERE id=$1', [req.user.id])).rows[0];
  if (!u || !u.email) return { all: false, code: null, name: u ? u.display_name : '' };
  const s = (await rq('SELECT id, name, fullname FROM operation_schemas.sb_sales WHERE lower(email)=lower($1) LIMIT 1', [u.email])).rows[0];
  return s ? { all: false, code: s.id, name: s.name || s.fullname } : { all: false, code: null, name: null, email: u.email };
}

router.get('/routes', wrap(async (req, res) => {
  const rows = (await rq(`SELECT id, name, islands, pier, sort FROM operation_schemas.routes ORDER BY sort NULLS LAST, id`)).rows;
  res.json({ rows });
}));

router.get('/agents', wrap(async (req, res) => {
  const sc = await scopeFor(req);
  if (!sc.all && !sc.code) return res.json({ rows: [], scope: sc });
  const where = sc.all ? '' : 'WHERE a.sales = $1';
  const args = sc.all ? [] : [sc.code];
  const rows = (await rq(`SELECT a.id, a.code, a.name, a.market, a.sales, a.ratetypeid,
      rt.name AS rate_type_name, rt.code AS rate_type_code
    FROM operation_schemas.sb_agents a
    LEFT JOIN operation_schemas.sb_rate_types rt ON rt.id = a.ratetypeid
    ${where}
    ORDER BY a.name`, args)).rows;
  res.json({ rows, scope: sc });
}));

function nest(rows) {
  const out = {};
  for (const r of rows) {
    out[r.key] = { route_name: r.route_name };
    for (const [Z, z] of Object.entries(ZMAP)) {
      out[r.key][Z] = {};
      for (const px of PAX) out[r.key][Z][px] = Number(r[`${z}_${px}`] || 0);
    }
  }
  return out;
}

router.get('/agent/:id', wrap(async (req, res) => {
  const a = (await rq(`SELECT a.id, a.code, a.name, a.market, a.sales, a.ratetypeid,
      rt.name AS rate_type_name, rt.code AS rate_type_code, rt.validfrom, rt.validto
    FROM operation_schemas.sb_agents a
    LEFT JOIN operation_schemas.sb_rate_types rt ON rt.id = a.ratetypeid
    WHERE a.id = $1`, [req.params.id])).rows[0];
  if (!a) return res.status(404).json({ error: 'agent not found' });
  const sc = await scopeFor(req);
  if (!sc.all && a.sales !== sc.code) return res.status(403).json({ error: 'ไม่มีสิทธิ์ดูเรตของเอเจ้นท์รายนี้' });
  const sr = (await rq(`SELECT s.*, r.name AS route_name
    FROM operation_schemas.sb_rate_types__seatrates s
    LEFT JOIN operation_schemas.routes r ON r.id = s.key
    WHERE s.sb_rate_types_id = $1 ORDER BY s.key`, [a.ratetypeid])).rows;
  res.json({
    agent: { id: a.id, code: a.code, name: a.name, market: a.market, sales: a.sales, ratetypeid: a.ratetypeid },
    rateType: { id: a.ratetypeid, name: a.rate_type_name, code: a.rate_type_code, validfrom: a.validfrom, validto: a.validto, seatRates: nest(sr) },
  });
}));

// นำเข้าเอเจ้นท์จากระบบ rate (sb_agents) มาเป็นเอเจ้นท์ใน CRM + map เจ้าของตามเซลส์ (อีเมล)  [admin]
router.post('/import-agents', wrap(async (req, res) => {
  if (String(req.user.role || '').toLowerCase() !== 'admin') return res.status(403).json({ error: 'เฉพาะผู้ดูแลระบบ (admin)' });
  const cid = req.user.company_id;
  const agents = (await rq(`SELECT id, code, name, sales, email, phone, ratetypeid FROM operation_schemas.sb_agents WHERE name IS NOT NULL AND name <> '' ORDER BY name`)).rows;
  const sales = (await rq(`SELECT id, email FROM operation_schemas.sb_sales`)).rows;
  const salesEmail = {}; sales.forEach(x => { if (x.email) salesEmail[x.id] = String(x.email).toLowerCase().trim(); });
  const users = (await q('SELECT id, lower(email) AS email FROM app_user WHERE company_id=$1', [cid])).rows;
  const userByEmail = {}; users.forEach(u => { userByEmail[u.email] = u.id; });
  let created = 0, updated = 0;
  for (const a of agents) {
    const code = (a.code || a.id || '').toString().trim() || null;
    const owner = userByEmail[salesEmail[a.sales]] || null;
    const existing = code ? (await q('SELECT id FROM customer WHERE company_id=$1 AND ref_code=$2 LIMIT 1', [cid, code])).rows[0] : null;
    if (existing) {
      await q(`UPDATE customer SET name=$2, phone=COALESCE($3,phone), email=COALESCE($4,email), owner_user_id=COALESCE($5,owner_user_id), updated_at=now() WHERE id=$1`,
        [existing.id, a.name, a.phone || null, a.email || null, owner]);
      updated++;
    } else {
      await q(`INSERT INTO customer (company_id,name,ref_code,phone,email,priority_id,owner_user_id,lifecycle_stage,is_followed,created_by)
        VALUES ($1,$2,$3,$4,$5,3,$6,'regular',true,$7)`,
        [cid, a.name, code, a.phone || null, a.email || null, owner, req.user.id]);
      created++;
    }
  }
  res.json({ created, updated, total: agents.length });
}));

module.exports = router;
