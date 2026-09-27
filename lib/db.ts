import { Pool, types, type QueryResultRow } from 'pg'

// Datas (sem hora) chegam como texto 'AAAA-MM-DD', evitando deslocamento de fuso.
types.setTypeParser(1082, (valor) => valor)

const globalForPool = globalThis as unknown as { pgPool?: Pool }

function createPool() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL não configurada.')
  return new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
    ssl: /sslmode=require|neon\.tech/.test(connectionString) ? { rejectUnauthorized: false } : undefined,
  })
}

export function pool() {
  if (!globalForPool.pgPool) globalForPool.pgPool = createPool()
  return globalForPool.pgPool
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  const result = await pool().query<T>(text, params)
  return result.rows
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}
