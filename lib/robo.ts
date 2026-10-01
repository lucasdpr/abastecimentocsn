import 'server-only'
import { timingSafeEqual } from 'node:crypto'

/** Chave do robô (variável ROBO_TOKEN na Vercel). Sem ela, o envio automático fica desligado. */
export function tokenRobo() {
  const token = process.env.ROBO_TOKEN ?? ''
  return token.length >= 24 ? token : null
}

export function roboAutorizado(request: Request) {
  const esperado = tokenRobo()
  if (!esperado) return false
  const recebido = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const a = Buffer.from(recebido)
  const b = Buffer.from(esperado)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** O robô mostra a resposta numa caixa do Windows (VBScript): sem acentos para não embaralhar. */
export function semAcento(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export const PREFIXO_ROBO = '[Robô]'
