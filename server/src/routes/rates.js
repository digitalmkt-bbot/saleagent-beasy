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
  const u = (await q('SELECT email, display_name, user_code FROM app_user WHERE id=$1', [req.user.id])).rows[0];
  if (!u) return { all: false, code: null, name: '' };
  const email = String(u.email || '').toLowerCase().trim();
  const uc = String(u.user_code || '').trim();
  // จับคู่กับเซลส์ในระบบ rate ด้วย "อีเมล" หรือ "user_code" (= id / code / name ของ sb_sales)
  const s = (await rq(`SELECT id, name, fullname FROM operation_schemas.sb_sales
    WHERE ($1 <> '' AND lower(email) = $1)
       OR ($2 <> '' AND (id = $2 OR lower(code) = lower($2) OR lower(name) = lower($2)))
    LIMIT 1`, [email, uc])).rows[0];
  return s ? { all: false, code: s.id, name: s.name || s.fullname } : { all: false, code: null, name: null, email: u.email, user_code: uc };
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

// ===== ข้อมูลสำหรับสร้างสัญญา (ContractWizard) — รวมจากระบบ rate =====
function nestSeatContract(rows) {
  const ZM = { PK: 'pk', KL: 'kl', NoTransfer: 'notransfer' };
  const PX = [['adult-thai', 'adult_thai'], ['child-thai', 'child_thai'], ['adult-fr', 'adult_fr'], ['child-fr', 'child_fr'], ['infant-thai', 'infant_thai'], ['infant-fr', 'infant_fr']];
  const out = {};
  for (const r of rows) {
    out[r.key] = {};
    for (const [Z, z] of Object.entries(ZM)) {
      const cell = {}; let any = false;
      for (const [hk, col] of PX) { const v = Number(r[`${z}_${col}`] || 0); cell[hk] = v; if (v) any = true; }
      if (any) out[r.key][Z] = cell;
    }
  }
  return out;
}
function nestCharter(rows) {
  const out = {};
  for (const r of rows) {
    const o = {};
    if (Number(r.speedboat_starterprice)) o.speedboat = { starterPrice: Number(r.speedboat_starterprice), starterIncludes: Number(r.speedboat_starterincludes || 4), extraPerPax: Number(r.speedboat_extraperpax || 0) };
    if (Number(r.catamaran_starterprice)) o.catamaran = { starterPrice: Number(r.catamaran_starterprice), starterIncludes: Number(r.catamaran_starterincludes || 4), extraPerPax: Number(r.catamaran_extraperpax || 0) };
    if (Object.keys(o).length) out[r.key] = o;
  }
  return out;
}

router.get('/contract/:code', wrap(async (req, res) => {
  const code = req.params.code;
  const a = (await rq(`SELECT * FROM operation_schemas.sb_agents WHERE code=$1 OR id=$1 LIMIT 1`, [code])).rows[0];
  if (!a) return res.status(404).json({ error: 'ไม่พบเอเจ้นท์นี้ในระบบ rate (รหัสอ้างอิงไม่ตรง)' });
  const sc = await scopeFor(req);
  if (!sc.all && a.sales !== sc.code) return res.status(403).json({ error: 'ไม่มีสิทธิ์สร้างสัญญาของเอเจ้นท์รายนี้' });
  const agent = {
    id: a.id, name: a.name, code: a.code, email: a.email, sales: a.sales,
    payType: a.paytype, creditDays: a.creditdays, creditLimit: a.creditlimit,
    contractStart: a.contractstart, contractEnd: a.contractend, contractVersion: a.contractversion,
    companyInfo: { legalName: a.companyinfo_legalname, tatLicense: a.companyinfo_tatlicense, address: a.companyinfo_address, tel: a.companyinfo_tel, hotline: a.companyinfo_hotline, fax: a.companyinfo_fax, website: a.companyinfo_website, taxId: a.companyinfo_taxid },
    agentSignatory: { name: a.agentsignatory_name, designation: a.agentsignatory_designation, tel: a.agentsignatory_tel, signedDate: a.agentsignatory_signeddate },
    bookingChannel: { method: a.bookingchannel_method, cutoff: a.bookingchannel_cutoff, cancelPolicy: a.bookingchannel_cancelpolicy, email: a.bookingchannel_email, phone: a.bookingchannel_phone },
    programPeriods: [],
  };
  const pp = (await rq(`SELECT routeid, bookfrom, bookto, travelfrom, travelto, note FROM operation_schemas.sb_agents__programperiods WHERE sb_agents_id=$1 ORDER BY idx`, [a.id])).rows;
  agent.programPeriods = pp.map(p => ({ routeId: p.routeid, bookFrom: p.bookfrom, bookTo: p.bookto, travelFrom: p.travelfrom, travelTo: p.travelto, note: p.note }));

  let rateType = null;
  if (a.ratetypeid) {
    const rt = (await rq(`SELECT id,code,name,note,validfrom,validto FROM operation_schemas.sb_rate_types WHERE id=$1`, [a.ratetypeid])).rows[0];
    if (rt) {
      const sr = (await rq(`SELECT * FROM operation_schemas.sb_rate_types__seatrates WHERE sb_rate_types_id=$1`, [rt.id])).rows;
      const routesArr = (await rq(`SELECT value FROM operation_schemas.sb_rate_types__routes WHERE sb_rate_types_id=$1 ORDER BY idx`, [rt.id])).rows.map(r => r.value);
      const rvRows = (await rq(`SELECT key, "from", "to" FROM operation_schemas.sb_rate_types__routevalidity WHERE sb_rate_types_id=$1`, [rt.id])).rows;
      const chRows = (await rq(`SELECT * FROM operation_schemas.sb_rate_types__charterrates WHERE sb_rate_types_id=$1`, [rt.id])).rows;
      const routeValidity = {}; rvRows.forEach(x => { routeValidity[x.key] = { from: x.from, to: x.to }; });
      rateType = {
        id: rt.id, code: rt.code, name: rt.name, note: rt.note, validFrom: rt.validfrom, validTo: rt.validto,
        routes: routesArr.length ? routesArr : Object.keys(nestSeatContract(sr)),
        seatRates: nestSeatContract(sr), routeValidity, charterRates: nestCharter(chRows), addOns: {},
      };
    }
  }
  if (!agent.programPeriods.length && rateType) agent.programPeriods = rateType.routes.map(rid => ({ routeId: rid }));

  const routes = (await rq(`SELECT id, name, pier FROM operation_schemas.routes ORDER BY sort NULLS LAST, id`)).rows;
  const salesRows = (await rq(`SELECT id, code, name, fullname, designation, tel, email, signature FROM operation_schemas.sb_sales`)).rows;
  const sales = {}; salesRows.forEach(x => { sales[x.id] = { code: x.code, name: x.name, fullName: x.fullname, designation: x.designation, tel: x.tel, email: x.email, signature: x.signature }; });
  res.json({ agent, rateType, routes, sales });
}));

// รายงาน 3: ลำดับเอเจ้นท์ตามยอดที่ส่งให้บริษัท (จากบุ๊กกิ้งที่ confirmed)
router.get('/report/agent-volume', wrap(async (req, res) => {
  const { from, to } = req.query;
  const sc = await scopeFor(req);
  if (!sc.all && !sc.code) return res.json({ rows: [] });
  const where = ["b.status='confirmed'"]; const args = []; let i = 1;
  if (from) { where.push(`COALESCE(NULLIF(b.bookingdate,''),b.createdat) >= $${i++}`); args.push(from); }
  if (to) { where.push(`COALESCE(NULLIF(b.bookingdate,''),b.createdat) <= $${i++}`); args.push(to); }
  if (!sc.all) { where.push(`a.sales = $${i++}`); args.push(sc.code); }
  where.push("a.sales IS NOT NULL AND EXISTS (SELECT 1 FROM operation_schemas.sb_sales s WHERE s.id = a.sales)");
  const rows = (await rq(`SELECT b.agentid, a.name, a.code, count(*)::int bookings, COALESCE(sum(b.total),0)::bigint revenue
    FROM operation_schemas.sb_bookings b
    LEFT JOIN operation_schemas.sb_agents a ON a.id=b.agentid
    WHERE ${where.join(' AND ')}
    GROUP BY b.agentid,a.name,a.code ORDER BY revenue DESC NULLS LAST LIMIT 100`, args)).rows;
  res.json({ rows });
}));

// รายงาน 4: Top 10 Product (เส้นทาง) ตามยอด
router.get('/report/product-volume', wrap(async (req, res) => {
  const { from, to } = req.query;
  const sc = await scopeFor(req);
  if (!sc.all && !sc.code) return res.json({ rows: [] });
  const where = ["b.status='confirmed'"]; const args = []; let i = 1;
  if (from) { where.push(`COALESCE(NULLIF(b.bookingdate,''),b.createdat) >= $${i++}`); args.push(from); }
  if (to) { where.push(`COALESCE(NULLIF(b.bookingdate,''),b.createdat) <= $${i++}`); args.push(to); }
  if (!sc.all) { where.push(`b.agentid IN (SELECT id FROM operation_schemas.sb_agents WHERE sales=$${i++})`); args.push(sc.code); }
  where.push("EXISTS (SELECT 1 FROM operation_schemas.sb_agents a JOIN operation_schemas.sb_sales s ON s.id=a.sales WHERE a.id=b.agentid)");
  const rows = (await rq(`SELECT t.routeid, r.name, count(DISTINCT t.sb_bookings_id)::int bookings,
      COALESCE(sum(t.subtotal),0)::bigint revenue
    FROM operation_schemas.sb_bookings__trips t
    JOIN operation_schemas.sb_bookings b ON b.id=t.sb_bookings_id
    LEFT JOIN operation_schemas.routes r ON r.id=t.routeid
    WHERE ${where.join(' AND ')}
    GROUP BY t.routeid,r.name ORDER BY revenue DESC NULLS LAST LIMIT 10`, args)).rows;
  res.json({ rows });
}));

// ยอดขายตามผู้รับผิดชอบ (เซลส์) — จากยอดบุ๊กกิ้งจริงของเอเจ้นท์ที่แต่ละคนดูแล
router.get('/report/sales-volume', wrap(async (req, res) => {
  const { from, to } = req.query;
  const sc = await scopeFor(req);
  if (!sc.all && !sc.code) return res.json({ rows: [] });
  const where = ["b.status='confirmed'"]; const args = []; let i = 1;
  if (from) { where.push(`COALESCE(NULLIF(b.bookingdate,''),b.createdat) >= $${i++}`); args.push(from); }
  if (to) { where.push(`COALESCE(NULLIF(b.bookingdate,''),b.createdat) <= $${i++}`); args.push(to); }
  if (!sc.all) { where.push(`a.sales = $${i++}`); args.push(sc.code); }
  const rows = (await rq(`SELECT a.sales AS sales_id, s.name, s.fullname, count(*)::int bookings, COALESCE(sum(b.total),0)::bigint revenue
    FROM operation_schemas.sb_bookings b
    JOIN operation_schemas.sb_agents a ON a.id=b.agentid
    JOIN operation_schemas.sb_sales s ON s.id=a.sales
    WHERE ${where.join(' AND ')}
    GROUP BY a.sales,s.name,s.fullname ORDER BY revenue DESC NULLS LAST`, args)).rows;
  res.json({ rows });
}));

router.get('/report/winrate', wrap(async (req, res) => {
  const { from, to } = req.query;
  const sc = await scopeFor(req);
  if (!sc.all && !sc.code) return res.json({ won: 0, total: 0, won_value: 0 });
  const where = []; const args = []; let i = 1;
  if (from) { where.push(`COALESCE(NULLIF(b.bookingdate,''),b.createdat) >= $${i++}`); args.push(from); }
  if (to) { where.push(`COALESCE(NULLIF(b.bookingdate,''),b.createdat) <= $${i++}`); args.push(to); }
  if (!sc.all) { where.push(`a.sales = $${i++}`); args.push(sc.code); }
  where.push("EXISTS (SELECT 1 FROM operation_schemas.sb_sales s WHERE s.id = a.sales)");
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const r = (await rq(`SELECT count(*) FILTER (WHERE b.status='confirmed')::int won, count(*)::int total,
      COALESCE(sum(b.total) FILTER (WHERE b.status='confirmed'),0)::bigint won_value,
      COALESCE(sum(b.total),0)::bigint total_value
    FROM operation_schemas.sb_bookings b LEFT JOIN operation_schemas.sb_agents a ON a.id=b.agentid ${w}`, args)).rows[0];
  res.json(r);
}));

router.get('/report/monthly', wrap(async (req, res) => {
  const { from, to } = req.query;
  const sc = await scopeFor(req);
  if (!sc.all && !sc.code) return res.json({ rows: [] });
  const where = ["b.status='confirmed'"]; const args = []; let i = 1;
  if (from) { where.push(`COALESCE(NULLIF(b.bookingdate,''),b.createdat) >= $${i++}`); args.push(from); }
  if (to) { where.push(`COALESCE(NULLIF(b.bookingdate,''),b.createdat) <= $${i++}`); args.push(to); }
  if (!sc.all) { where.push(`a.sales = $${i++}`); args.push(sc.code); }
  where.push("EXISTS (SELECT 1 FROM operation_schemas.sb_sales s WHERE s.id = a.sales)");
  const rows = (await rq(`SELECT LEFT(COALESCE(NULLIF(b.bookingdate,''), b.createdat::text), 7) AS month,
      count(*)::int deals, COALESCE(sum(b.total),0)::bigint value
    FROM operation_schemas.sb_bookings b LEFT JOIN operation_schemas.sb_agents a ON a.id=b.agentid
    WHERE ${where.join(' AND ')} GROUP BY 1 ORDER BY 1`, args)).rows;
  res.json({ rows });
}));

module.exports = router;module.exports = router;
