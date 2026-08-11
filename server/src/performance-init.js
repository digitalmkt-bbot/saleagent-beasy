const { q } = require('./db');

async function ensurePerformanceSchema() {
  await q(`
    CREATE TABLE IF NOT EXISTS performance_import_batch (
      id BIGSERIAL PRIMARY KEY,
      company_id BIGINT NOT NULL REFERENCES company(id),
      file_name VARCHAR(255) NOT NULL,
      file_hash CHAR(64) NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      imported_by BIGINT REFERENCES app_user(id),
      imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      source_rows INTEGER NOT NULL DEFAULT 0,
      monthly_rows INTEGER NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'processing',
      notes TEXT,
      UNIQUE (company_id, file_hash)
    );

    CREATE TABLE IF NOT EXISTS performance_program (
      id BIGSERIAL PRIMARY KEY,
      company_id BIGINT NOT NULL REFERENCES company(id),
      code VARCHAR(60) NOT NULL,
      name VARCHAR(120) NOT NULL,
      source_sheet VARCHAR(120),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      UNIQUE (company_id, code),
      UNIQUE (company_id, name)
    );

    CREATE TABLE IF NOT EXISTS agent_name_alias (
      id BIGSERIAL PRIMARY KEY,
      company_id BIGINT NOT NULL REFERENCES company(id),
      normalized_name VARCHAR(255) NOT NULL,
      source_name VARCHAR(255) NOT NULL,
      customer_id BIGINT REFERENCES customer(id) ON DELETE SET NULL,
      rate_agent_id VARCHAR(60),
      match_status VARCHAR(20) NOT NULL DEFAULT 'unmatched',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (company_id, normalized_name)
    );

    CREATE TABLE IF NOT EXISTS agent_program_period_performance (
      id BIGSERIAL PRIMARY KEY,
      company_id BIGINT NOT NULL REFERENCES company(id),
      import_batch_id BIGINT NOT NULL REFERENCES performance_import_batch(id) ON DELETE CASCADE,
      program_id BIGINT NOT NULL REFERENCES performance_program(id),
      customer_id BIGINT REFERENCES customer(id) ON DELETE SET NULL,
      rate_agent_id VARCHAR(60),
      source_name VARCHAR(255) NOT NULL,
      source_sheet VARCHAR(120) NOT NULL,
      source_row INTEGER NOT NULL,
      market VARCHAR(60),
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      sales_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
      route_share NUMERIC(12,10),
      bookings INTEGER,
      pax INTEGER,
      average_per_pax NUMERIC(18,4),
      cancelled_bookings INTEGER,
      cancelled_amount NUMERIC(18,2),
      match_status VARCHAR(20) NOT NULL DEFAULT 'unmatched',
      UNIQUE (import_batch_id, program_id, source_sheet, source_row)
    );

    CREATE TABLE IF NOT EXISTS agent_program_monthly_performance (
      id BIGSERIAL PRIMARY KEY,
      company_id BIGINT NOT NULL REFERENCES company(id),
      import_batch_id BIGINT NOT NULL REFERENCES performance_import_batch(id) ON DELETE CASCADE,
      period_performance_id BIGINT NOT NULL REFERENCES agent_program_period_performance(id) ON DELETE CASCADE,
      program_id BIGINT NOT NULL REFERENCES performance_program(id),
      customer_id BIGINT REFERENCES customer(id) ON DELETE SET NULL,
      rate_agent_id VARCHAR(60),
      source_name VARCHAR(255) NOT NULL,
      market VARCHAR(60),
      month DATE NOT NULL,
      sales_amount NUMERIC(18,2) NOT NULL,
      UNIQUE (period_performance_id, month)
    );

    CREATE INDEX IF NOT EXISTS idx_perf_month_company_program
      ON agent_program_monthly_performance(company_id, program_id, month);
    CREATE INDEX IF NOT EXISTS idx_perf_month_customer
      ON agent_program_monthly_performance(customer_id, month);
    CREATE INDEX IF NOT EXISTS idx_perf_month_rate_agent
      ON agent_program_monthly_performance(rate_agent_id, month);
    CREATE INDEX IF NOT EXISTS idx_perf_period_company_program
      ON agent_program_period_performance(company_id, program_id, period_start, period_end);

    CREATE OR REPLACE VIEW v_agent_program_monthly_performance AS
      SELECT m.company_id, m.month, p.code AS program_code, p.name AS program,
        COALESCE(m.customer_id::text, NULLIF(m.rate_agent_id,''), 'name:' || lower(trim(m.source_name))) AS agent_key,
        m.customer_id, NULLIF(m.rate_agent_id,'') AS rate_agent_id,
        COALESCE(c.name, m.source_name) AS agent_name,
        m.market, sum(m.sales_amount)::numeric(18,2) AS sales_amount
      FROM agent_program_monthly_performance m
      JOIN performance_program p ON p.id=m.program_id
      LEFT JOIN customer c ON c.id=m.customer_id
      GROUP BY m.company_id, m.month, p.code, p.name,
        COALESCE(m.customer_id::text, NULLIF(m.rate_agent_id,''), 'name:' || lower(trim(m.source_name))),
        m.customer_id, NULLIF(m.rate_agent_id,''), COALESCE(c.name, m.source_name), m.market;
  `);
}

module.exports = { ensurePerformanceSchema };
