---
name: agent-name-matching
description: Reconciles agent names from Excel performance files with Rate-system agents and CRM customers, preserves aliases, binds matched performance to responsible salespeople, and validates imports. Use when importing agent/program/month performance, resolving duplicate spellings, rebinding historical records, or reporting Assigned Agents versus Unassigned agents.
compatibility: SaleAgent.Beasy project using Node.js, PostgreSQL, ExcelJS, and the performance tables in server/src/performance-init.js.
---

# Agent Name Matching

Use this workflow for agent-performance imports and reconciliation. The objective is to preserve every source record while attaching a canonical CRM customer only when the match is defensible.

## Project implementation

Read these files before changing the workflow:

- `server/src/import-performance.js` — workbook parser, validation, matching, and import
- `server/src/performance-init.js` — normalized performance and alias tables
- `server/src/agent-import.js` — Rate agent → CRM customer synchronization
- `server/src/routes/report7m.js` — monthly comparison and owner reporting
- `web/src/pages/AgentPerformanceCompare.jsx` — interactive report

## Identity priority

Apply matching in this order. Stop after the first unambiguous match:

1. **Stable external ID:** Matrix Master ID or Rate agent ID → `customer.rate_agent_id`.
2. **Reference fallback:** external ID → `customer.ref_code`.
3. **Existing source reconciliation:** match the historical source row by program + normalized source name; use sales amount only to disambiguate duplicate source names.
4. **Approved alias:** `agent_name_alias.normalized_name` → `customer_id` or `rate_agent_id`.
5. **Unique exact normalized name:** source name → exactly one normalized `customer.name`.
6. Otherwise retain the record as **Unassigned**. Never guess.

Do not use market, salesperson, row position, or a high sales amount as proof of identity. Do not automatically accept fuzzy matches.

## Name normalization

Normalize for lookup only; always preserve the original source name:

1. Unicode NFKC normalization.
2. Trim leading/trailing whitespace.
3. Convert to lowercase.
4. Collapse repeated whitespace to one space.

Do not remove punctuation or legal suffixes automatically because that can merge different businesses. Store spelling and capitalization variants in `agent_name_alias`.

## Import workflow

1. Confirm the workbook sheets and headers. Program sheets use agent rows and monthly columns J–P.
2. Confirm the report year and month range. Do not infer a year unless it appears in workbook content or is explicitly supplied.
3. Compute a SHA-256 file hash. Re-importing an existing completed batch must be skipped unless `--replace` is explicit.
4. Run a dry run:

```bash
cd server
npm run import:performance -- ../document/<file>.xlsx --company=<id> --user=<id> --dry-run
```

5. Review source-row count, monthly-row count, total, matched count, and unmatched count.
6. Import only after validation succeeds:

```bash
npm run import:performance -- ../document/<file>.xlsx --company=<id> --user=<id>
```

7. Re-run the command and verify it reports `skipped: true` for idempotency.

Never place database credentials in scripts, commits, shell history examples, or skill files. Use `DATABASE_URL` from the environment.

## Validation requirements

Reject or pause an import when any of these checks fail:

- Sum of monthly values differs from the source row total by more than 0.02.
- Imported grand total differs from the workbook grand total.
- A source row maps to multiple different external IDs.
- The same batch contains a duplicate program/sheet-row/month identity.
- A source name resolves to multiple CRM customers without a stable external ID.

After import, verify period and monthly totals agree:

```sql
SELECT
  (SELECT sum(sales_amount) FROM agent_program_period_performance) AS period_total,
  (SELECT sum(sales_amount) FROM agent_program_monthly_performance) AS monthly_total;
```

See [references/matching-and-reporting.md](references/matching-and-reporting.md) for diagnostic SQL.

## Salesperson binding

Performance belongs to an agent/customer; salesperson responsibility is a live CRM relationship:

```text
performance.customer_id → customer.owner_user_id → app_user.id
```

Do not copy a salesperson name into every performance row. Join through `customer.owner_user_id` so owner changes appear in reports automatically.

Use these report terms:

- `[Sales Name]'s Assigned Agents`
- `Unassigned` when no responsible salesperson can be established

The current CRM supports one primary salesperson per agent. Do not imply many-to-many ownership unless a separate assignment table is introduced.

## Handling unmatched records

Unmatched performance is valid data and must not be deleted. Preserve:

- original source name
- normalized name
- program and source sheet/row
- market
- month and amount
- import batch
- `match_status='unmatched'`

Display these records in the **Unassigned** filter/group. When a reliable alias or external ID becomes available, update the alias/customer binding and rebind both period and monthly facts in one transaction. Record the reason for manual matches when adding an administrative matching UI.

## Completion report

At the end, report:

- imported batch ID and period
- source and monthly row counts
- grand total
- matched and unmatched counts
- number of distinct canonical agents
- validation result
- code paths changed
- whether changes were committed/pushed
