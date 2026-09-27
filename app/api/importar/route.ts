import { NextResponse } from 'next/server'
import { pode, usuarioAtual } from '@/lib/auth'
import { BASES, type BaseId } from '@/lib/bases'
import { concluirImportacao, importarLote, iniciarImportacao } from '@/lib/importacao'
import { revalidatePath } from 'next/cache'

export const maxDuration = 60

type Corpo =
  | { acao: 'iniciar'; base: BaseId; arquivo: string }
  | { acao: 'lote'; importacaoId: number; linhas: Record<string, unknown>[] }
  | { acao: 'concluir'; importacaoId: number; carteiraCompleta: boolean }

export async function POST(request: Request) {
  const usuario = await usuarioAtual()
  if (!usuario || !pode.editar(usuario)) return NextResponse.json({ erro: 'Sem permissão.' }, { status: 403 })
  try {
    const corpo = (await request.json()) as Corpo
    if (corpo.acao === 'iniciar') {
      if (!(corpo.base in BASES)) return NextResponse.json({ erro: 'Base desconhecida.' }, { status: 400 })
      return NextResponse.json({ importacaoId: await iniciarImportacao(corpo.base, String(corpo.arquivo ?? ''), usuario.id) })
    }
    if (corpo.acao === 'lote') {
      if (!Array.isArray(corpo.linhas) || corpo.linhas.length > 5000) return NextResponse.json({ erro: 'Lote inválido.' }, { status: 400 })
      return NextResponse.json(await importarLote(Number(corpo.importacaoId), corpo.linhas))
    }
    if (corpo.acao === 'concluir') {
      const resultado = await concluirImportacao(Number(corpo.importacaoId), corpo.carteiraCompleta !== false)
      revalidatePath('/', 'layout')
      return NextResponse.json(resultado)
    }
    return NextResponse.json({ erro: 'Ação inválida.' }, { status: 400 })
  } catch (erro) {
    console.error('importar', erro)
    return NextResponse.json({ erro: erro instanceof Error ? erro.message : 'Falha na importação.' }, { status: 500 })
  }
}
