-- =====================================================================
--  JUBILI-style Sales CRM — Reverse-engineered Database Schema
--  ถอดโครงสร้างจาก Jubili by BUILK (โมดูล งานติดตาม / ลูกค้า / โครงการ)
--  Target: PostgreSQL 14+  (ปรับใช้กับ MySQL 8 ได้โดยแก้ชนิดข้อมูลเล็กน้อย)
--  Encoding: UTF-8
-- =====================================================================

-- 0) MULTI-TENANT / ORGANISATION -------------------------------------
CREATE TABLE company (                       -- กิจการ / บริษัทผู้ใช้ระบบ (tenant)
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,   -- ชื่อกิจการ
    phone           VARCHAR(50),             -- หมายเลขโทรศัพท์กิจการ
    email           VARCHAR(255),            -- อีเมลกิจการ
    address         TEXT,                    -- ที่อยู่กิจการ
    country_code    CHAR(2) DEFAULT 'TH',    -- ประเทศ
    province        VARCHAR(120),            -- จังหวัด
    district        VARCHAR(120),            -- อำเภอ
    logo_url        VARCHAR(500),            -- ตรากิจการ
    subscription_status VARCHAR(20) DEFAULT 'active', -- active / expired
    subscription_expire_at DATE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE app_user (                      -- ผู้ใช้งาน / พนักงานขาย
    id              BIGSERIAL PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES company(id),
    display_name    VARCHAR(150) NOT NULL,   -- ชื่อที่แสดง
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(50),
    password_hash   VARCHAR(100),            -- รหัสผ่าน (bcrypt)
    team_id         BIGINT,                  -- ทีมหลัก (denormalised)
    role            VARCHAR(30) DEFAULT 'sales', -- admin / manager / sales
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE team (                          -- ทีมขาย
    id              BIGSERIAL PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES company(id),
    name            VARCHAR(150) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE team_member (                   -- สมาชิกทีม
    team_id         BIGINT NOT NULL REFERENCES team(id),
    user_id         BIGINT NOT NULL REFERENCES app_user(id),
    PRIMARY KEY (team_id, user_id)
);

-- 1) LOOKUP / MASTER DATA --------------------------------------------
CREATE TABLE priority (                      -- ความสำคัญ
    id SMALLINT PRIMARY KEY, label VARCHAR(50) NOT NULL
);
CREATE TABLE project_type (                  -- ประเภทของโครงการ
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES company(id),
    name VARCHAR(120) NOT NULL
);
CREATE TABLE contact_role (                  -- บทบาทผู้ติดต่อ
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES company(id),
    name VARCHAR(120) NOT NULL
);
CREATE TABLE chat_channel (                  -- ช่องทางแชท (LINE ฯลฯ)
    id BIGSERIAL PRIMARY KEY, name VARCHAR(60) NOT NULL
);
CREATE TABLE contact_method (                -- วิธีการติดต่อในกิจกรรม
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES company(id),
    name VARCHAR(80) NOT NULL
);

CREATE TABLE tag (                           -- แท็ก (ใช้ทั้งลูกค้าและกิจกรรม)
    id              BIGSERIAL PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES company(id),
    name            VARCHAR(120) NOT NULL,    -- เช่น "2.บริษัททัวร์","A ส่งประจำ ส่งเยอะ"
    tag_group       VARCHAR(60),              -- กลุ่ม (source/type/grade)
    scope           VARCHAR(20) DEFAULT 'customer', -- customer / activity
    color           VARCHAR(9),
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pipeline_stage (                -- สถานะโครงการ / ไปป์ไลน์ 8 ขั้น
    id              SMALLINT PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES company(id),
    seq             SMALLINT NOT NULL,
    name            VARCHAR(120) NOT NULL,
    is_won          BOOLEAN DEFAULT FALSE,
    UNIQUE (company_id, seq)
);
-- 8 ขั้น: 1 ลูกค้าติดต่อเข้ามา/เซลล์ติดต่อหาลูกค้า, 2 ทำนัดนำเสนอบริการ,
-- 3 เข้าพบ/นำเสนอบริการ, 4 สร้างและส่งใบเสนอราคา, 5 ติดตามการขาย,
-- 6 ลูกค้าตกลงซื้อบริการ, 7 ติดตามการชำระเงิน, 8 ปิดการขาย (is_won=true)

-- 2) CUSTOMER / PROSPECT ---------------------------------------------
CREATE TABLE customer (                      -- ลูกค้า / prospect
    id              BIGSERIAL PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES company(id),
    name            VARCHAR(255) NOT NULL,    -- ชื่อกิจการ (ชื่อลูกค้า)
    ref_code        VARCHAR(50),              -- รหัสลูกค้าอ้างอิง
    tax_id          VARCHAR(20),              -- เลขประจำตัวผู้เสียภาษี
    phone           VARCHAR(50),
    phone_ext       VARCHAR(10),              -- ต่อ
    email           VARCHAR(255),
    country_code    CHAR(2) DEFAULT 'TH',
    province        VARCHAR(120),
    district        VARCHAR(120),
    priority_id     SMALLINT REFERENCES priority(id),
    owner_user_id   BIGINT REFERENCES app_user(id),   -- ผู้รับผิดชอบ
    owner_team_id   BIGINT REFERENCES team(id),        -- ทีมที่รับผิดชอบ
    lifecycle_stage VARCHAR(20) DEFAULT 'target',      -- เป้าหมาย/ใหม่/ประจำ/ห่างหาย
    is_followed     BOOLEAN DEFAULT TRUE,
    last_activity_id BIGINT,
    note            TEXT,
    created_by      BIGINT REFERENCES app_user(id),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_customer_company ON customer(company_id);
CREATE INDEX idx_customer_owner   ON customer(owner_user_id);

CREATE TABLE customer_branch (               -- ที่อยู่/สาขาลูกค้า
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    branch_name VARCHAR(150),                 -- ชื่อสาขา
    address TEXT,                             -- ที่อยู่จดทะเบียน
    country_code CHAR(2) DEFAULT 'TH',
    province VARCHAR(120), district VARCHAR(120),
    is_registered BOOLEAN DEFAULT FALSE
);

CREATE TABLE contact (                       -- ผู้ติดต่อ
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,               -- ชื่อผู้ติดต่อ
    is_primary BOOLEAN DEFAULT FALSE,         -- ผู้ติดต่อหลัก
    phone VARCHAR(50), phone_ext VARCHAR(10),
    position VARCHAR(120),                    -- ตำแหน่ง
    role_id BIGINT REFERENCES contact_role(id),   -- บทบาท
    email VARCHAR(255),
    chat_channel_id BIGINT REFERENCES chat_channel(id),
    chat_id VARCHAR(120),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_contact_customer ON contact(customer_id);

CREATE TABLE customer_tag (                  -- แท็กลูกค้า (M:N)
    customer_id BIGINT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES tag(id),
    PRIMARY KEY (customer_id, tag_id)
);

-- 3) PROJECT ---------------------------------------------------------
CREATE TABLE project (                       -- โครงการ / ดีล
    id              BIGSERIAL PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES company(id),
    code            VARCHAR(30) NOT NULL,     -- PJ#250809-0001
    name            VARCHAR(255) NOT NULL,
    customer_id     BIGINT REFERENCES customer(id),
    place_name      VARCHAR(200),             -- ชื่อสถานที่
    address         TEXT,
    country_code    CHAR(2) DEFAULT 'TH',
    province        VARCHAR(120), district VARCHAR(120),
    reference_no    VARCHAR(50),
    project_type_id BIGINT REFERENCES project_type(id),
    stage_id        SMALLINT REFERENCES pipeline_stage(id),
    estimated_value NUMERIC(15,2) DEFAULT 0,  -- ประมาณมูลค่า
    start_date      DATE, end_date DATE,
    is_open         BOOLEAN DEFAULT TRUE,     -- เปิด/ปิดโครงการ
    priority_id     SMALLINT REFERENCES priority(id),
    owner_user_id   BIGINT REFERENCES app_user(id),
    owner_team_id   BIGINT REFERENCES team(id),
    primary_contact_id BIGINT REFERENCES contact(id),
    note            TEXT,                     -- บันทึกเพิ่มเติม
    created_by      BIGINT REFERENCES app_user(id),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE (company_id, code)
);
CREATE INDEX idx_project_company  ON project(company_id);
CREATE INDEX idx_project_customer ON project(customer_id);
CREATE INDEX idx_project_stage    ON project(stage_id);

CREATE TABLE project_related_customer (      -- ลูกค้าที่เกี่ยวข้อง (<=10)
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    customer_id BIGINT REFERENCES customer(id),
    contact_id BIGINT REFERENCES contact(id),
    role VARCHAR(120), email VARCHAR(255),
    phone VARCHAR(50), phone_ext VARCHAR(10)
);

CREATE TABLE project_attachment (            -- ไฟล์เอกสารโครงการ
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    file_url VARCHAR(500) NOT NULL, file_name VARCHAR(255),
    uploaded_by BIGINT REFERENCES app_user(id),
    uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- 4) ACTIVITY / FOLLOW-UP --------------------------------------------
CREATE TABLE activity (                      -- กิจกรรม / งานติดตาม
    id              BIGSERIAL PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES company(id),
    customer_id     BIGINT REFERENCES customer(id),   -- required ในฟอร์ม
    contact_id      BIGINT REFERENCES contact(id),     -- required
    project_id      BIGINT REFERENCES project(id),
    stage_id        SMALLINT REFERENCES pipeline_stage(id),
    direction       VARCHAR(10) NOT NULL DEFAULT 'outbound', -- inbound/outbound/research
    activity_type   SMALLINT,                 -- ประเภทงานติดตาม (index 0..5)
    activity_time   VARCHAR(5),               -- เวลา HH:MM (แยกแสดง)
    contact_method_id BIGINT REFERENCES contact_method(id),
    activity_at     TIMESTAMPTZ NOT NULL,     -- วันที่+เวลา
    detail          TEXT,                     -- รายละเอียด (@mention)
    image_url       TEXT,
    is_follow_up    BOOLEAN DEFAULT FALSE,     -- เป็นงานติดตาม
    due_at          TIMESTAMPTZ,              -- กำหนดติดตาม
    status          VARCHAR(12) DEFAULT 'done', -- pending/done
    priority_id     SMALLINT REFERENCES priority(id),
    assignee_user_id BIGINT REFERENCES app_user(id),
    created_by      BIGINT REFERENCES app_user(id),
    check_in_at     TIMESTAMPTZ,              -- เวลาเช็คอินจริง
    check_out_at    TIMESTAMPTZ,              -- เวลาเช็คเอาท์จริง
    created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_activity_company  ON activity(company_id);
CREATE INDEX idx_activity_customer ON activity(customer_id);
CREATE INDEX idx_activity_project  ON activity(project_id);
CREATE INDEX idx_activity_due      ON activity(due_at) WHERE is_follow_up;

CREATE TABLE activity_tag (                  -- แท็กกิจกรรม (M:N)
    activity_id BIGINT NOT NULL REFERENCES activity(id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES tag(id),
    PRIMARY KEY (activity_id, tag_id)
);
CREATE TABLE activity_mention (              -- @เพื่อนร่วมงาน
    activity_id BIGINT NOT NULL REFERENCES activity(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES app_user(id),
    PRIMARY KEY (activity_id, user_id)
);

ALTER TABLE customer
    ADD CONSTRAINT fk_customer_last_activity
    FOREIGN KEY (last_activity_id) REFERENCES activity(id);

-- 5) SALES TARGET (เป้าหมายวันนี้) -----------------------------------
CREATE TABLE sales_target (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES company(id),
    user_id BIGINT REFERENCES app_user(id),
    team_id BIGINT REFERENCES team(id),
    period VARCHAR(10) NOT NULL,              -- daily/monthly
    period_date DATE NOT NULL,
    metric VARCHAR(20) NOT NULL,              -- new_customer/opportunity/sales/profit
    target_value NUMERIC(15,2) DEFAULT 0,
    actual_value NUMERIC(15,2) DEFAULT 0
);

-- 6) โมดูลถัดไป (โครงร่างย่อ) -----------------------------------------
CREATE TABLE quotation (                     -- ใบเสนอราคา
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES company(id),
    code VARCHAR(30) NOT NULL,
    project_id BIGINT REFERENCES project(id),
    customer_id BIGINT REFERENCES customer(id),
    contact_id BIGINT REFERENCES contact(id),
    issue_date DATE, valid_until DATE,
    subtotal NUMERIC(15,2) DEFAULT 0, discount NUMERIC(15,2) DEFAULT 0,
    vat NUMERIC(15,2) DEFAULT 0, grand_total NUMERIC(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',
    owner_user_id BIGINT REFERENCES app_user(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (company_id, code)
);
CREATE TABLE quotation_item (
    id BIGSERIAL PRIMARY KEY,
    quotation_id BIGINT NOT NULL REFERENCES quotation(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    qty NUMERIC(12,2) DEFAULT 1, unit_price NUMERIC(15,2) DEFAULT 0,
    amount NUMERIC(15,2) DEFAULT 0
);
CREATE TABLE sale_order (                    -- ใบสั่งขาย
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES company(id),
    code VARCHAR(30) NOT NULL,
    quotation_id BIGINT REFERENCES quotation(id),
    project_id BIGINT REFERENCES project(id),
    customer_id BIGINT REFERENCES customer(id),
    order_date DATE, grand_total NUMERIC(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (company_id, code)
);
-- END

-- ===== ระบบเช็คอิน/เช็คเอาท์ ตอนไปหาลูกค้า =====
CREATE TABLE checkin (
    id              BIGSERIAL PRIMARY KEY,
    company_id      BIGINT NOT NULL REFERENCES company(id),
    customer_id     BIGINT REFERENCES customer(id),
    user_id         BIGINT REFERENCES app_user(id),
    check_in_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    check_in_lat    DOUBLE PRECISION,
    check_in_lng    DOUBLE PRECISION,
    check_out_at    TIMESTAMPTZ,
    check_out_lat   DOUBLE PRECISION,
    check_out_lng   DOUBLE PRECISION,
    note            TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_checkin_company ON checkin(company_id);
CREATE INDEX idx_checkin_user ON checkin(user_id);
