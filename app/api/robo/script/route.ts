import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { pode, usuarioAtual } from '@/lib/auth'
import { tokenRobo } from '@/lib/robo'

/**
 * Baixa o script do robô já com o endereço do app e a chave preenchidos.
 * Só administrador: o arquivo carrega a chave do robô.
 */
export async function GET(request: Request) {
  const usuario = await usuarioAtual()
  if (!usuario || !pode.administrar(usuario)) return NextResponse.json({ erro: 'Só administrador.' }, { status: 403 })
  const token = tokenRobo()
  if (!token) return NextResponse.json({ erro: 'Configure ROBO_TOKEN (24+ caracteres) na Vercel.' }, { status: 503 })
  const origem = new URL(request.url).origin
  const modelo = await readFile(path.join(process.cwd(), 'robo', 'robo-iw38.vbs'), 'utf8')
  // VBScript lê o arquivo como ANSI e espera quebra de linha do Windows.
  const script = modelo.replaceAll('{{URL_APP}}', origem).replaceAll('{{TOKEN}}', token).replace(/\r?\n/g, '\r\n')
  return new Response(script, {
    headers: {
      'content-type': 'text/vbscript; charset=us-ascii',
      'content-disposition': 'attachment; filename="robo-iw38.vbs"',
      'cache-control': 'no-store',
    },
  })
}
