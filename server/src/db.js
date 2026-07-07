const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.on('error', (e) => console.error('PG pool error', e));
async function q(text, params) { return pool.query(text, params); }
// helper: run fn inside a transaction
async function tx(fn) {
  const client = await pool.connect();
  try { await client.query('BEGIN'); const r = await fn(client); await client.query('COMMIT'); return r; }
  catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}
module.exports = { pool, q, tx };
