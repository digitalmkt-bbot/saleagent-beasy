# Matching and reporting diagnostics

## Matching coverage

```sql
SELECT match_status,
       count(*) AS source_rows,
       count(DISTINCT customer_id) AS customers,
       sum(sales_amount) AS sales_amount
FROM agent_program_period_performance
GROUP BY match_status
ORDER BY match_status;
```

## Records without a responsible salesperson

```sql
SELECT p.name AS program,
       s.source_name,
       s.rate_agent_id,
       sum(s.sales_amount) AS sales_amount
FROM agent_program_period_performance s
JOIN performance_program p ON p.id = s.program_id
LEFT JOIN customer c ON c.id = s.customer_id
WHERE c.owner_user_id IS NULL
GROUP BY p.name, s.source_name, s.rate_agent_id
ORDER BY sales_amount DESC;
```

## Assigned agents by salesperson

```sql
SELECT u.display_name,
       count(DISTINCT c.id) AS assigned_agents,
       sum(m.sales_amount) AS sales_amount
FROM app_user u
JOIN customer c ON c.owner_user_id = u.id
LEFT JOIN agent_program_monthly_performance m ON m.customer_id = c.id
WHERE u.company_id = $1
GROUP BY u.id, u.display_name
ORDER BY sales_amount DESC NULLS LAST;
```

## Potential exact-name matches for review

This query is diagnostic only. Review each result before changing identity links.

```sql
WITH customer_names AS (
  SELECT company_id,
         lower(regexp_replace(trim(name), '\s+', ' ', 'g')) AS normalized_name,
         count(*) AS candidates,
         min(id) AS only_customer_id
  FROM customer
  GROUP BY company_id, lower(regexp_replace(trim(name), '\s+', ' ', 'g'))
)
SELECT a.id AS alias_id, a.source_name, n.only_customer_id
FROM agent_name_alias a
JOIN customer_names n
  ON n.company_id = a.company_id
 AND n.normalized_name = a.normalized_name
 AND n.candidates = 1
WHERE a.customer_id IS NULL;
```

## Source total versus monthly total

A correct import returns no rows:

```sql
SELECT s.id, p.name AS program, s.source_name, s.source_sheet, s.source_row,
       s.sales_amount AS source_total,
       coalesce(sum(m.sales_amount), 0) AS monthly_total,
       s.sales_amount - coalesce(sum(m.sales_amount), 0) AS difference
FROM agent_program_period_performance s
JOIN performance_program p ON p.id = s.program_id
LEFT JOIN agent_program_monthly_performance m
  ON m.period_performance_id = s.id
GROUP BY s.id, p.name
HAVING s.sales_amount <> coalesce(sum(m.sales_amount), 0);
```

## Duplicate aliases resolving to conflicting identities

```sql
SELECT normalized_name,
       count(DISTINCT customer_id) AS customers,
       count(DISTINCT rate_agent_id) AS rate_agents
FROM agent_name_alias
GROUP BY normalized_name
HAVING count(DISTINCT customer_id) > 1
    OR count(DISTINCT rate_agent_id) > 1;
```

## Safe rebinding pattern

Perform rebinding in a transaction. Update the period fact first, then synchronize monthly facts from it.

```sql
BEGIN;

UPDATE agent_program_period_performance p
SET customer_id = a.customer_id,
    rate_agent_id = coalesce(p.rate_agent_id, a.rate_agent_id),
    match_status = 'alias-matched'
FROM agent_name_alias a
WHERE a.company_id = p.company_id
  AND a.normalized_name = lower(regexp_replace(trim(p.source_name), '\s+', ' ', 'g'))
  AND a.customer_id IS NOT NULL
  AND p.customer_id IS NULL;

UPDATE agent_program_monthly_performance m
SET customer_id = p.customer_id,
    rate_agent_id = p.rate_agent_id
FROM agent_program_period_performance p
WHERE p.id = m.period_performance_id
  AND (m.customer_id IS DISTINCT FROM p.customer_id
       OR m.rate_agent_id IS DISTINCT FROM p.rate_agent_id);

COMMIT;
```
