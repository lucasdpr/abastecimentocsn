import { Pool, types, type QueryResultRow } from 'pg'

// Datas (sem hora) chegam como texto 'AAAA-MM-DD', evitando deslocamento de fuso.
types.setTypeParser(1082, (valor) => valor)

const globalForPool = globalThis as unknown as { pgPool?: Pool }

function createPool() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL não configurada.')
  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
    ssl: /sslmode=require|neon\.tech/.test(connectionString) ? { rejectUnauthorized: false } : undefined,
  })
  // Essencial com bancos que hibernam sozinhos (Neon free): quando o banco
  // derruba uma conexão ociosa do pool, o driver emite 'error' nesse objeto.
  // Sem um listener aqui, o Node trata como exceção não tratada e derruba
  // todo o processo — travando a função inteira, não só aquela consulta.
  pool.on('error', (erro) => {
    console.error('Conexão ociosa com o banco caiu (provável hibernação do Neon):', erro.message)
    // Descarta o pool: a próxima consulta cria um pool novo, com conexões novas.
    if (globalForPool.pgPool === pool) globalForPool.pgPool = undefined
  })
  return pool
}

export function pool() {
  if (!globalForPool.pgPool) globalForPool.pgPool = createPool()
  return globalForPool.pgPool
}

function erroDeConexao(erro: unknown) {
  const codigo = (erro as { code?: string })?.code
  const mensagem = erro instanceof Error ? erro.message : String(erro)
  return (
    codigo === 'ECONNRESET' ||
    codigo === '57P01' || // admin_shutdown (Neon suspendendo o compute)
    codigo === 'XX000' ||
    /Connection terminated|connection reset|timeout expired/i.test(mensagem)
  )
}

/** Roda a consulta e, se a conexão tiver caído (banco hibernou), tenta de novo uma vez com um pool novo. */
async function executar<T extends QueryResultRow>(text: string, params: unknown[]) {
  try {
    return await pool().query<T>(text, params)
  } catch (erro) {
    if (!erroDeConexao(erro)) throw erro
    globalForPool.pgPool = undefined
    return await pool().query<T>(text, params)
  }
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  const result = await executar<T>(text, params)
  return result.rows
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}
