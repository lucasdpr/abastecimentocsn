import 'server-only'
import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { query, queryOne } from './db'

const scryptAsync = promisify(scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>
const COOKIE = 'abast_sessao'
const SESSION_DAYS = 14

export type Perfil = 'admin' | 'abastecimento' | 'gerencia' | 'consulta'
export type Usuario = { id: number; email: string; nome: string; perfil: Perfil }

export const PERFIS: Record<Perfil, string> = {
  admin: 'Administrador',
  abastecimento: 'Abastecimento',
  gerencia: 'Gerência',
  consulta: 'Consulta',
}

export const pode = {
  editar: (u: Usuario) => u.perfil === 'admin' || u.perfil === 'abastecimento',
  verGestao: (u: Usuario) => u.perfil !== 'consulta',
  administrar: (u: Usuario) => u.perfil === 'admin',
}

function secret() {
  const value = process.env.AUTH_SECRET
  if (!value || value.length < 16) throw new Error('AUTH_SECRET não configurado (mínimo 16 caracteres).')
  return value
}

export async function hashSenha(senha: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = await scryptAsync(senha, salt, 64)
  return `${salt}:${hash.toString('hex')}`
}

export async function conferirSenha(senha: string, armazenado: string) {
  const [salt, hash] = armazenado.split(':')
  if (!salt || !hash) return false
  const calculado = await scryptAsync(senha, salt, 64)
  const esperado = Buffer.from(hash, 'hex')
  return esperado.length === calculado.length && timingSafeEqual(esperado, calculado)
}

function assinar(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export async function criarSessao(usuarioId: number) {
  const exp = Date.now() + SESSION_DAYS * 86_400_000
  const payload = Buffer.from(JSON.stringify({ uid: usuarioId, exp })).toString('base64url')
  const store = await cookies()
  store.set(COOKIE, `${payload}.${assinar(payload)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 86_400,
  })
}

export async function encerrarSessao() {
  const store = await cookies()
  store.delete(COOKIE)
}

function lerToken(token: string | undefined) {
  if (!token) return null
  const [payload, assinatura] = token.split('.')
  if (!payload || !assinatura) return null
  const esperado = Buffer.from(assinar(payload))
  const recebido = Buffer.from(assinatura)
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return null
  try {
    const dados = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { uid: number; exp: number }
    return dados.exp > Date.now() ? dados.uid : null
  } catch {
    return null
  }
}

export const usuarioAtual = cache(async (): Promise<Usuario | null> => {
  const store = await cookies()
  const uid = lerToken(store.get(COOKIE)?.value)
  if (!uid) return null
  return queryOne<Usuario>('select id, email, nome, perfil from usuarios where id = $1 and ativo', [uid])
})

export async function exigirUsuario(regra?: (u: Usuario) => boolean) {
  const usuario = await usuarioAtual()
  if (!usuario) redirect('/login')
  if (regra && !regra(usuario)) redirect('/')
  return usuario
}

/** Cria o primeiro administrador a partir de ADMIN_EMAIL/ADMIN_PASSWORD quando não há usuários. */
export async function garantirAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const senha = process.env.ADMIN_PASSWORD
  if (!email || !senha) return
  const [{ total }] = await query<{ total: number }>('select count(*)::int as total from usuarios')
  if (total > 0) return
  await query(
    `insert into usuarios (email, nome, perfil, senha_hash) values ($1, 'Administrador', 'admin', $2) on conflict (email) do nothing`,
    [email, await hashSenha(senha)],
  )
}
