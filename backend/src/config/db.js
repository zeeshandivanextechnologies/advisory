const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: /localhost|127\.0\.0\.1/.test(env.databaseUrl) ? false : { rejectUnauthorized: false },
  max: 10,
});

pool.on('error', (err) => console.error('[db] idle client error:', err.message));

/**
 * Call one of the `api_*` Postgres functions (supabase/migrations) as a given user.
 *
 * The functions hold all business rules and permission checks. We run them
 * exactly as Supabase would: role `authenticated` with the user's id in the JWT
 * claims, or role `anon` for public endpoints. So both the Express API and the
 * direct-Supabase frontend share one source of truth.
 *
 *   rpc('api_update_case', { p_id: 5, p: { status: 'closed' } }, userId)
 */
async function rpc(fn, args = {}, userId = null) {
  if (!/^api_[a-z0-9_]+$/.test(fn)) throw new Error(`Invalid function name: ${fn}`);

  const names = Object.keys(args);
  const values = names.map((n) => {
    const v = args[n];
    return v !== null && typeof v === 'object' ? JSON.stringify(v) : v;
  });
  const sql = `select public.${fn}(${names.map((n, i) => `${n} => $${i + 1}`).join(', ')}) as result`;

  const client = await pool.connect();
  try {
    await client.query('begin');
    if (userId) {
      await client.query(`select set_config('request.jwt.claims', $1, true)`,
        [JSON.stringify({ sub: userId, role: 'authenticated' })]);
      await client.query('set local role authenticated');
    } else {
      await client.query('set local role anon');
    }
    const { rows } = await client.query(sql, values);
    await client.query('commit');
    return rows[0].result;
  } catch (err) {
    await client.query('rollback').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, rpc };
