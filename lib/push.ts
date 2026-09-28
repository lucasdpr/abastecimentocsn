import 'server-only'
import webpush from 'web-push'
import { query } from './db'
import type { Perfil } from './auth'

let configurado = false

function configurar() {
  if (configurado) return true
  const publica = process.env.VAPID_PUBLIC_KEY
  const privada = process.env.VAPID_PRIVATE_KEY
  if (!publica || !privada) return false
  webpush.setVapidDetails('mailto:abastecimento@csn.local', publica, privada)
  configurado = true
  return true
}

export function pushDisponivel() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

type Notificacao = { titulo: string; corpo: string; url?: string; tag?: string }

async function enviarParaInscricao(inscricao: { id: number; endpoint: string; p256dh: string; auth: string }, notificacao: Notificacao) {
  try {
    await webpush.sendNotification(
      { endpoint: inscricao.endpoint, keys: { p256dh: inscricao.p256dh, auth: inscricao.auth } },
      JSON.stringify(notificacao),
    )
  } catch (erro) {
    const status = (erro as { statusCode?: number }).statusCode
    // Inscrição expirada ou revogada pelo navegador: remove para não tentar de novo.
    if (status === 404 || status === 410) await query('delete from push_inscricoes where id = $1', [inscricao.id])
    else console.error('push', inscricao.id, erro instanceof Error ? erro.message : erro)
  }
}

/** Manda a notificação para um usuário específico, em todos os aparelhos inscritos dele. */
export async function enviarPushUsuario(usuarioId: number, notificacao: Notificacao) {
  if (!configurar()) return
  const inscricoes = await query<{ id: number; endpoint: string; p256dh: string; auth: string }>(
    'select id, endpoint, p256dh, auth from push_inscricoes where usuario_id = $1',
    [usuarioId],
  )
  await Promise.all(inscricoes.map((i) => enviarParaInscricao(i, notificacao)))
}

/** Manda para todos os usuários ativos com um dos perfis informados (ex.: avisar administradores). */
export async function enviarPushPerfis(perfis: Perfil[], notificacao: Notificacao) {
  if (!configurar()) return
  const inscricoes = await query<{ id: number; endpoint: string; p256dh: string; auth: string }>(
    `select p.id, p.endpoint, p.p256dh, p.auth from push_inscricoes p
       join usuarios u on u.id = p.usuario_id
      where u.ativo and u.perfil = any($1::text[])`,
    [perfis],
  )
  await Promise.all(inscricoes.map((i) => enviarParaInscricao(i, notificacao)))
}
