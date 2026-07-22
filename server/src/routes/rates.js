const router = require('express').Router();
const { wrap } = require('./_util');
const { rq, rateReady } = require('../rate-db');
const { isAdmin } = require('./_scope');
const { rateScopeFor } = require('../rate-scope');
const { importAgentsFor } = require('../agent-import');

const ZMAP = { PK: 'pk', KL: 'kl', NoTransfer: 'notransfer' };
const PAX = ['adult_thai', 'adult_fr', 'child_thai', 'child_fr', 'infant_thai', 'infant_fr'];

router.get('/status', (req, res) => res.json({ ready: rateReady() }));

// admin-only: list all tables in operation_schemas that contain 'rate_type' — for schema discovery
router.get('/schema-probe', wrap(async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: 'admin only' });
  const tables = (await rq(`SELECT table_name FROM information_schema.tables WHERE table_schema='operation_schemas' ORDER BY table_name`)).rows.map(r => r.table_name);
  const sample = {};
  for (const t of tables.filter(n => n.includes('rate_type'))) {
    const cols = (await rq(`SELECT column_name FROM information_schema.columns WHERE table_schema='operation_schemas' AND table_name=$1 ORDER BY ordinal_position`, [t])).rows.map(r => r.column_name);
    const row = (await rq(`SELECT * FROM operation_schemas.${t} LIMIT 1`)).rows[0] || null;
    sample[t] = { cols, sample: row };
  }
  res.json({ tables, sample });
}));

// admin/manager -> {all:true}. staff -> จับคู่กับ sb_sales (อีเมล/user_code) ได้ id เซลส์ (หรือ unmatched)
const scopeFor = (req) => rateScopeFor(req.user);

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

// นำเข้าเอเจ้นท์จากระบบ rate (sb_agents) มาเป็นเอเจ้นท์ใน CRM + map เจ้าของตามเซลส์
// admin/manager นำเข้าทั้งหมด, เซลส์นำเข้าเฉพาะเอเจ้นท์ที่ master setting ระบุให้ตัวเอง
// (ลอจิกอยู่ใน agent-import.js — ใช้ร่วมกับ auto-sync ตอนล็อกอิน)
router.post('/import-agents', wrap(async (req, res) => {
  const r = await importAgentsFor(req.user);
  if (r.error) return res.status(400).json({ error: r.error });
  res.json(r);
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
    market: a.market,
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
      const routeValidity = {};
      rvRows.forEach(x => {
        if (!routeValidity[x.key]) routeValidity[x.key] = [];
        routeValidity[x.key].push({ from: x.from, to: x.to });
      });
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
  // start from sb_sales so every sales rep shows (even 0 bookings), then LEFT JOIN bookings via their agents
  const bc = ["b.status='confirmed'"]; const args = []; let i = 1;
  if (from) { bc.push(`COALESCE(NULLIF(b.bookingdate,''),b.createdat) >= $${i++}`); args.push(from); }
  if (to) { bc.push(`COALESCE(NULLIF(b.bookingdate,''),b.createdat) <= $${i++}`); args.push(to); }
  const uc = [];
  if (!sc.all) { uc.push(`s.id = $${i++}`); args.push(sc.code); }
  const whereU = uc.length ? 'WHERE ' + uc.join(' AND ') : '';
  const rows = (await rq(`SELECT s.id AS sales_id, s.name, s.fullname,
      count(b.id)::int bookings, COALESCE(sum(b.total),0)::bigint revenue
    FROM operation_schemas.sb_sales s
    LEFT JOIN operation_schemas.sb_agents a ON a.sales = s.id
    LEFT JOIN operation_schemas.sb_bookings b ON b.agentid = a.id AND ${bc.join(' AND ')}
    ${whereU}
    GROUP BY s.id, s.name, s.fullname
    ORDER BY revenue DESC NULLS LAST, s.name`, args)).rows;
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

router.get('/agent-bookings/:code', wrap(async (req, res) => {
  const code = req.params.code;
  const a = (await rq(`SELECT id, code, name, sales FROM operation_schemas.sb_agents WHERE code=$1 OR id=$1 LIMIT 1`, [code])).rows[0];
  if (!a) return res.json({ rows: [], total: 0 });
  const sc = await scopeFor(req);
  if (!sc.all && a.sales !== sc.code) return res.status(403).json({ error: 'ไม่มีสิทธิ์' });
  const page = Math.max(1, +(req.query.page || 1));
  const limit = 20;
  const off = (page - 1) * limit;
  const rows = (await rq(
    `SELECT b.id, b.status, COALESCE(NULLIF(b.bookingdate,''), b.createdat::text) AS date, b.total
     FROM operation_schemas.sb_bookings b
     WHERE b.agentid = $1
     ORDER BY COALESCE(NULLIF(b.bookingdate,''), b.createdat::text) DESC NULLS LAST
     LIMIT $2 OFFSET $3`, [a.id, limit, off])).rows;
  const total = +(await rq(`SELECT count(*)::int FROM operation_schemas.sb_bookings WHERE agentid=$1`, [a.id])).rows[0].count;
  res.json({ rows, total, page });
}));

module.exports = router;
