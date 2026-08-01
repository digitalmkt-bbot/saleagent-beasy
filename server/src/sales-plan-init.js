// sales-plan-init.js — สร้างตารางและข้อมูลตั้งต้นของโมดูล Sales Plan
// idempotent: รันซ้ำได้ปลอดภัย (ใช้ CREATE TABLE IF NOT EXISTS / ตรวจก่อน seed)
// ถูกเรียกจาก auto-init.js (runMigrations) ทุกครั้งที่เซิร์ฟเวอร์บูต
const { q } = require('./db');

function log(...a) { console.log('[sales-plan-init]', ...a); }

// ---- ประเทศ/ตลาดตั้งต้น (ISO 3166-1 alpha-3 + WW) ----
const MARKETS = [
  ['THA', 'Thailand', 'ไทย', 'Asia', 'th', 'THB', 'Asia/Bangkok'],
  ['RUS', 'Russia', 'รัสเซีย', 'Europe', 'ru', 'RUB', 'Europe/Moscow'],
  ['CHN', 'China', 'จีน', 'Asia', 'zh', 'CNY', 'Asia/Shanghai'],
  ['IND', 'India', 'อินเดีย', 'Asia', 'hi', 'INR', 'Asia/Kolkata'],
  ['KOR', 'South Korea', 'เกาหลีใต้', 'Asia', 'ko', 'KRW', 'Asia/Seoul'],
  ['JPN', 'Japan', 'ญี่ปุ่น', 'Asia', 'ja', 'JPY', 'Asia/Tokyo'],
  ['GBR', 'United Kingdom', 'สหราชอาณาจักร', 'Europe', 'en', 'GBP', 'Europe/London'],
  ['USA', 'United States', 'สหรัฐอเมริกา', 'Americas', 'en', 'USD', 'America/New_York'],
  ['AUS', 'Australia', 'ออสเตรเลีย', 'Oceania', 'en', 'AUD', 'Australia/Sydney'],
  ['DEU', 'Germany', 'เยอรมนี', 'Europe', 'de', 'EUR', 'Europe/Berlin'],
  ['FRA', 'France', 'ฝรั่งเศส', 'Europe', 'fr', 'EUR', 'Europe/Paris'],
  ['ITA', 'Italy', 'อิตาลี', 'Europe', 'it', 'EUR', 'Europe/Rome'],
  ['ESP', 'Spain', 'สเปน', 'Europe', 'es', 'EUR', 'Europe/Madrid'],
  ['ISR', 'Israel', 'อิสราเอล', 'Asia', 'he', 'ILS', 'Asia/Jerusalem'],
  ['SAU', 'Saudi Arabia', 'ซาอุดีอาระเบีย', 'Asia', 'ar', 'SAR', 'Asia/Riyadh'],
  ['ARE', 'United Arab Emirates', 'สหรัฐอาหรับเอมิเรตส์', 'Asia', 'ar', 'AED', 'Asia/Dubai'],
  ['SGP', 'Singapore', 'สิงคโปร์', 'Asia', 'en', 'SGD', 'Asia/Singapore'],
  ['MYS', 'Malaysia', 'มาเลเซีย', 'Asia', 'ms', 'MYR', 'Asia/Kuala_Lumpur'],
  ['IDN', 'Indonesia', 'อินโดนีเซีย', 'Asia', 'id', 'IDR', 'Asia/Jakarta'],
  ['VNM', 'Vietnam', 'เวียดนาม', 'Asia', 'vi', 'VND', 'Asia/Ho_Chi_Minh'],
  ['WW', 'World Wide', 'ทั่วโลก', 'Global', 'en', '', ''],
];

// ---- ประเภทลูกค้า (Segment) ตั้งต้น ----
const SEGMENTS = [
  ['TA', 'Travel Agent', 'บริษัททัวร์/ตัวแทนจำหน่าย'],
  ['B2B', 'B2B', 'บริษัท คู่ค้า องค์กร ลูกค้าธุรกิจ'],
  ['OTA', 'Online Travel Agency', 'แพลตฟอร์มตัวแทนท่องเที่ยวออนไลน์'],
  ['HOTEL', 'Hotel', 'โรงแรม รีสอร์ต ที่พัก Concierge'],
  ['CTPK', 'Counter Tour Phuket', 'เคาน์เตอร์ทัวร์ภูเก็ต'],
  ['CORP', 'Corporate', 'ลูกค้าองค์กร'],
  ['MICE', 'MICE', 'ประชุม สัมมนา จัดเลี้ยง'],
  ['DMC', 'DMC', 'Destination Management Company'],
  ['DIRECT', 'Direct Customer', 'ลูกค้าตรง'],
  ['OTHER', 'Other', 'อื่น ๆ'],
];

// ---- ประเภทกิจกรรมการขาย ตั้งต้น ----
const ACTIVITY_TYPES = [
  ['VISIT', 'Sales Visit', 'เข้าพบลูกค้า/บริษัท/ตัวแทน/โรงแรม'],
  ['TELESALES', 'Telesales', 'ติดต่อขายทางโทรศัพท์'],
  ['EMAIL', 'Email', 'ส่งอีเมลนำเสนอ/ติดตาม'],
  ['LINE', 'LINE', 'ติดต่อผ่าน LINE'],
  ['WHATSAPP', 'WhatsApp', 'ติดต่อผ่าน WhatsApp'],
  ['WECHAT', 'WeChat', 'ติดต่อผ่าน WeChat'],
  ['VIDEO_CALL', 'Video Call', 'ประชุมทางวิดีโอ'],
  ['ONLINE_MEETING', 'Online Meeting', 'ประชุมออนไลน์'],
  ['NETWORKING', 'Networking Event', 'งานสร้างเครือข่าย'],
  ['TRADE_SHOW', 'Trade Show', 'งานแสดงสินค้า'],
  ['PRESENTATION', 'Product Presentation', 'นำเสนอสินค้า'],
  ['FOLLOW_UP', 'Follow-up', 'ติดตาม'],
  ['SITE_INSPECTION', 'Site Inspection', 'ตรวจพื้นที่'],
  ['PROPOSAL_PREP', 'Proposal Preparation', 'เตรียมข้อเสนอ'],
  ['PROPOSAL_PRES', 'Proposal Presentation', 'นำเสนอข้อเสนอ'],
  ['NEGOTIATION', 'Contract Negotiation', 'เจรจาสัญญา'],
  ['CONTRACT_SIGN', 'Contract Signing', 'ลงนามสัญญา'],
  ['ENTERTAINMENT', 'Customer Entertainment', 'รับรองลูกค้า'],
  ['AFTER_SALES', 'After-sales Follow-up', 'ติดตามหลังการขาย'],
  ['OTHER', 'Other', 'อื่น ๆ'],
];

// ---- วัตถุประสงค์ ตั้งต้น ----
const OBJECTIVES = [
  ['INTRO_COMPANY', 'Introduce Company', 'แนะนำบริษัท'],
  ['INTRO_PRODUCT', 'Introduce New Product', 'แนะนำผลิตภัณฑ์ใหม่'],
  ['PRESENT_TOUR', 'Present Tour Program', 'นำเสนอโปรแกรมทัวร์'],
  ['AGENT_RATE', 'Present Agent Rate', 'นำเสนอราคา Agent'],
  ['PROMOTION', 'Present Promotion', 'นำเสนอโปรโมชั่น'],
  ['OPEN_AGENT', 'Open New Agent Account', 'เปิดบัญชี Agent ใหม่'],
  ['GET_CONTACT', 'Get Contact Info', 'ขอข้อมูลผู้ติดต่อ'],
  ['FOLLOW_PROPOSAL', 'Follow-up Proposal', 'ติดตาม Proposal'],
  ['FOLLOW_CONTRACT', 'Follow-up Contract', 'ติดตาม Contract'],
  ['FOLLOW_PAYMENT', 'Follow-up Payment', 'ติดตามการชำระเงิน'],
  ['NEGOTIATE', 'Negotiate Price', 'เจรจาราคา'],
  ['GET_FORECAST', 'Request Sales Forecast', 'ขอ Forecast ยอดขาย'],
  ['MARKET_RESEARCH', 'Market Research', 'ตรวจสอบความต้องการของตลาด'],
  ['MAINTAIN', 'Maintain Relationship', 'รักษาความสัมพันธ์'],
  ['SITE_INSPECTION', 'Arrange Site Inspection', 'นัดหมาย Site Inspection'],
  ['CLOSE_SALE', 'Close Sale', 'ปิดการขาย'],
  ['FEEDBACK', 'Get Feedback', 'รับฟัง Feedback'],
  ['SOLVE_ISSUE', 'Solve Service Issue', 'แก้ไขปัญหาการให้บริการ'],
  ['BOOST_SALES', 'Boost Sales', 'กระตุ้นยอดขาย'],
  ['OTHER', 'Other', 'อื่น ๆ'],
];

// ---- เป้าหมายรายสัปดาห์ตั้งต้น (Target Template) ----
// target_type, ชื่อ, min, full, หน่วย, น้ำหนัก%
const DEFAULT_TARGETS = [
  ['sales_calls', 'Sales Calls', 10, 15, 'calls', 15],
  ['sales_visits', 'Sales Visits', 20, 25, 'visits', 25],
  ['new_prospect', 'New Prospect', 3, 5, 'prospects', 15],
  ['proposal_sent', 'Proposal Sent', 3, 5, 'proposals', 15],
  ['site_inspection', 'Site Inspection', 1, 3, 'inspections', 10],
  ['booking_closed', 'Booking Closed', 1, 2, 'bookings', 20],
];

async function ensureTables() {
  await q(`CREATE TABLE IF NOT EXISTS market (
    id BIGSERIAL PRIMARY KEY,
    market_code VARCHAR(8) UNIQUE NOT NULL,
    country_name VARCHAR(120) NOT NULL,
    country_name_th VARCHAR(120),
    region VARCHAR(60),
    primary_language VARCHAR(20),
    currency VARCHAR(10),
    time_zone VARCHAR(60),
    status VARCHAR(20) DEFAULT 'active',
    display_order INT DEFAULT 0
  )`);

  await q(`CREATE TABLE IF NOT EXISTS sales_segment (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES company(id),
    code VARCHAR(30) NOT NULL,
    name_th VARCHAR(120),
    name_en VARCHAR(120),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    display_order INT DEFAULT 0
  )`);

  await q(`CREATE TABLE IF NOT EXISTS sales_plan_activity_type (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES company(id),
    code VARCHAR(40) NOT NULL,
    name_th VARCHAR(120),
    name_en VARCHAR(120),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    display_order INT DEFAULT 0
  )`);

  await q(`CREATE TABLE IF NOT EXISTS sales_objective (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES company(id),
    code VARCHAR(40) NOT NULL,
    name_th VARCHAR(120),
    name_en VARCHAR(120),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    display_order INT DEFAULT 0
  )`);

  await q(`CREATE TABLE IF NOT EXISTS sales_plan (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES company(id),
    plan_number VARCHAR(40) NOT NULL,
    user_id BIGINT REFERENCES app_user(id),
    team_id BIGINT REFERENCES team(id),
    manager_id BIGINT REFERENCES app_user(id),
    week_number SMALLINT,
    year SMALLINT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    note TEXT,
    summary TEXT,
    issues TEXT,
    opportunities TEXT,
    next_week_plan TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by BIGINT REFERENCES app_user(id),
    completed_at TIMESTAMPTZ,
    created_by BIGINT REFERENCES app_user(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (company_id, plan_number)
  )`);
  await q(`CREATE INDEX IF NOT EXISTS idx_sales_plan_company ON sales_plan(company_id)`);
  await q(`CREATE INDEX IF NOT EXISTS idx_sales_plan_user ON sales_plan(user_id)`);

  await q(`CREATE TABLE IF NOT EXISTS sales_plan_activity (
    id BIGSERIAL PRIMARY KEY,
    sales_plan_id BIGINT NOT NULL REFERENCES sales_plan(id) ON DELETE CASCADE,
    activity_date DATE,
    day_of_week SMALLINT,
    start_time VARCHAR(5),
    end_time VARCHAR(5),
    all_day BOOLEAN DEFAULT FALSE,
    reminder_time VARCHAR(5),
    customer_id BIGINT REFERENCES customer(id),
    company_ref_id BIGINT REFERENCES customer(id),
    lead_id BIGINT,
    prospect_id BIGINT REFERENCES customer(id),
    client_name VARCHAR(255),
    contact_person VARCHAR(150),
    phone VARCHAR(120),
    email VARCHAR(255),
    primary_segment_id BIGINT REFERENCES sales_segment(id),
    primary_market_id BIGINT REFERENCES market(id),
    activity_type_id BIGINT REFERENCES sales_plan_activity_type(id),
    objective_type_id BIGINT REFERENCES sales_objective(id),
    objective_detail TEXT,
    expected_result TEXT,
    expected_value NUMERIC(15,2) DEFAULT 0,
    expected_pax INT DEFAULT 0,
    expected_closing_date DATE,
    priority_id SMALLINT REFERENCES priority(id),
    location VARCHAR(255),
    status VARCHAR(24) DEFAULT 'planned',
    actual_result TEXT,
    result_type VARCHAR(40),
    customer_feedback TEXT,
    interest_level VARCHAR(20),
    next_action TEXT,
    next_follow_up_at DATE,
    estimated_deal_value NUMERIC(15,2) DEFAULT 0,
    estimated_pax INT DEFAULT 0,
    closing_probability INT,
    quotation_id BIGINT REFERENCES quotation(id),
    proposal_id BIGINT,
    booking_id BIGINT,
    internal_note TEXT,
    completed_at TIMESTAMPTZ,
    created_by BIGINT REFERENCES app_user(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  )`);
  await q(`CREATE INDEX IF NOT EXISTS idx_spa_plan ON sales_plan_activity(sales_plan_id)`);
  await q(`CREATE INDEX IF NOT EXISTS idx_spa_date ON sales_plan_activity(activity_date)`);

  await q(`CREATE TABLE IF NOT EXISTS sales_plan_activity_segment (
    id BIGSERIAL PRIMARY KEY,
    sales_plan_activity_id BIGINT NOT NULL REFERENCES sales_plan_activity(id) ON DELETE CASCADE,
    segment_id BIGINT NOT NULL REFERENCES sales_segment(id),
    is_primary BOOLEAN DEFAULT FALSE
  )`);
  await q(`CREATE TABLE IF NOT EXISTS sales_plan_activity_market (
    id BIGSERIAL PRIMARY KEY,
    sales_plan_activity_id BIGINT NOT NULL REFERENCES sales_plan_activity(id) ON DELETE CASCADE,
    market_id BIGINT NOT NULL REFERENCES market(id),
    is_primary BOOLEAN DEFAULT FALSE
  )`);

  await q(`CREATE TABLE IF NOT EXISTS sales_plan_target (
    id BIGSERIAL PRIMARY KEY,
    sales_plan_id BIGINT NOT NULL REFERENCES sales_plan(id) ON DELETE CASCADE,
    target_type VARCHAR(40) NOT NULL,
    minimum_target NUMERIC(12,2) DEFAULT 0,
    full_target NUMERIC(12,2) DEFAULT 0,
    planned_value NUMERIC(12,2) DEFAULT 0,
    actual_value NUMERIC(12,2) DEFAULT 0,
    achievement_percentage NUMERIC(6,2) DEFAULT 0,
    weight_percentage NUMERIC(6,2) DEFAULT 0,
    weighted_score NUMERIC(8,2) DEFAULT 0,
    target_status VARCHAR(24) DEFAULT 'not_started',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  )`);
  await q(`CREATE INDEX IF NOT EXISTS idx_spt_plan ON sales_plan_target(sales_plan_id)`);

  await q(`CREATE TABLE IF NOT EXISTS sales_target_template (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES company(id),
    target_name VARCHAR(120),
    target_type VARCHAR(40) NOT NULL,
    minimum_target NUMERIC(12,2) DEFAULT 0,
    full_target NUMERIC(12,2) DEFAULT 0,
    measurement_unit VARCHAR(40),
    team_id BIGINT REFERENCES team(id),
    user_id BIGINT REFERENCES app_user(id),
    effective_date DATE,
    expiry_date DATE,
    weight_percentage NUMERIC(6,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_by BIGINT REFERENCES app_user(id),
    approved_by BIGINT REFERENCES app_user(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  )`);
  await q(`CREATE INDEX IF NOT EXISTS idx_stt_company ON sales_target_template(company_id)`);

  await q(`CREATE TABLE IF NOT EXISTS sales_plan_review (
    id BIGSERIAL PRIMARY KEY,
    sales_plan_id BIGINT NOT NULL REFERENCES sales_plan(id) ON DELETE CASCADE,
    reviewer_id BIGINT REFERENCES app_user(id),
    action VARCHAR(30),
    comment TEXT,
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT now()
  )`);
  await q(`CREATE INDEX IF NOT EXISTS idx_spr_plan ON sales_plan_review(sales_plan_id)`);

  await q(`CREATE TABLE IF NOT EXISTS sales_plan_notification (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES company(id),
    user_id BIGINT REFERENCES app_user(id),
    sales_plan_id BIGINT REFERENCES sales_plan(id) ON DELETE CASCADE,
    sales_plan_activity_id BIGINT REFERENCES sales_plan_activity(id) ON DELETE CASCADE,
    event VARCHAR(60) NOT NULL,
    title VARCHAR(255),
    body TEXT,
    level VARCHAR(20) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
  )`);
  await q(`CREATE INDEX IF NOT EXISTS idx_spn_company ON sales_plan_notification(company_id)`);
  await q(`CREATE INDEX IF NOT EXISTS idx_spn_user ON sales_plan_notification(user_id, is_read)`);

  await q(`CREATE TABLE IF NOT EXISTS sales_plan_attachment (
    id BIGSERIAL PRIMARY KEY,
    sales_plan_id BIGINT REFERENCES sales_plan(id) ON DELETE CASCADE,
    sales_plan_activity_id BIGINT REFERENCES sales_plan_activity(id) ON DELETE CASCADE,
    file_name VARCHAR(255),
    file_url TEXT,
    file_type VARCHAR(60),
    uploaded_by BIGINT REFERENCES app_user(id),
    created_at TIMESTAMPTZ DEFAULT now()
  )`);
}

async function seedGlobal() {
  const m = await q('SELECT count(*)::int c FROM market');
  if (m.rows[0].c === 0) {
    let ord = 0;
    for (const [code, en, th, region, lang, cur, tz] of MARKETS) {
      await q(`INSERT INTO market (market_code,country_name,country_name_th,region,primary_language,currency,time_zone,display_order)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (market_code) DO NOTHING`,
        [code, en, th, region, lang, cur, tz, ++ord]);
    }
    log(`seeded ${MARKETS.length} markets`);
  }
}

async function seedCompany(companyId) {
  const seg = await q('SELECT count(*)::int c FROM sales_segment WHERE company_id=$1', [companyId]);
  if (seg.rows[0].c === 0) {
    let ord = 0;
    for (const [code, en, desc] of SEGMENTS)
      await q(`INSERT INTO sales_segment (company_id,code,name_en,name_th,description,display_order) VALUES ($1,$2,$3,$3,$4,$5)`,
        [companyId, code, en, desc, ++ord]);
    log(`company ${companyId}: seeded segments`);
  }
  const at = await q('SELECT count(*)::int c FROM sales_plan_activity_type WHERE company_id=$1', [companyId]);
  if (at.rows[0].c === 0) {
    let ord = 0;
    for (const [code, en, desc] of ACTIVITY_TYPES)
      await q(`INSERT INTO sales_plan_activity_type (company_id,code,name_en,name_th,description,display_order) VALUES ($1,$2,$3,$3,$4,$5)`,
        [companyId, code, en, desc, ++ord]);
    log(`company ${companyId}: seeded activity types`);
  }
  const ob = await q('SELECT count(*)::int c FROM sales_objective WHERE company_id=$1', [companyId]);
  if (ob.rows[0].c === 0) {
    let ord = 0;
    for (const [code, en, desc] of OBJECTIVES)
      await q(`INSERT INTO sales_objective (company_id,code,name_en,name_th,description,display_order) VALUES ($1,$2,$3,$3,$4,$5)`,
        [companyId, code, en, desc, ++ord]);
    log(`company ${companyId}: seeded objectives`);
  }
  const tt = await q('SELECT count(*)::int c FROM sales_target_template WHERE company_id=$1', [companyId]);
  if (tt.rows[0].c === 0) {
    for (const [type, name, mn, full, unit, weight] of DEFAULT_TARGETS)
      await q(`INSERT INTO sales_target_template (company_id,target_name,target_type,minimum_target,full_target,measurement_unit,weight_percentage) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [companyId, name, type, mn, full, unit, weight]);
    log(`company ${companyId}: seeded target templates`);
  }
}

async function ensureSalesPlan() {
  await ensureTables();
  await seedGlobal();
  const companies = await q('SELECT id FROM company');
  for (const c of companies.rows) await seedCompany(c.id);
  log('เสร็จสิ้น (Sales Plan schema + master data)');
}

module.exports = { ensureSalesPlan, DEFAULT_TARGETS, MARKETS, SEGMENTS, ACTIVITY_TYPES, OBJECTIVES };
