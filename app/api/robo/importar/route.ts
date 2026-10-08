import ExcelJS from 'exceljs'
import { revalidatePath } from 'next/cache'
import { BASES } from '@/lib/bases'
import { query, queryOne } from '@/lib/db'
import { concluirImportacao, importarLote, iniciarImportacao } from '@/lib/importacao'
import { ehXlsx, lerAbas, planilhaDeTexto } from '@/lib/planilha'
import { PREFIXO_ROBO, roboAutorizado, semAcento, tokenRobo } from '@/lib/robo'

export const maxDuration = 60

const LOTE = 2000
/** Trava contra exportação incompleta: menos que isso da importação anterior não entra sem "forcar". */
const MINIMO_DA_ANTERIOR = 0.5

function texto(status: number, linhas: string[]) {
  return new Response(semAcento(linhas.join('\r\n')) + '\r\n', { status, headers: { 'content-type': 'text/plain; charset=utf-8' } })
}

/**
 * Recebe a planilha exportada do SAP pelo robô (multipart, campo "arquivo") e importa como a tela Importar.
 * Autenticação: cabeçalho "Authorization: Bearer <ROBO_TOKEN>".
 * Campos opcionais: parcial=1 (não marca como "saiu" o que faltar), forcar=1 (ignora a trava de tamanho).
 * Planilha maior que o limite da Vercel (~4,5 MB por envio): o robô manda em partes com
 * envio=<id>, parte=<1..N>, total=<N>; as partes ficam no banco e a última dispara a importação.
 */
export async function POST(request: Request) {
  if (!tokenRobo()) return texto(503, ['ERRO: robo desligado. Configure ROBO_TOKEN (24+ caracteres) na Vercel.'])
  if (!roboAutorizado(request)) return texto(401, ['ERRO: chave do robo invalida.'])

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return texto(400, ['ERRO: envie a planilha no campo "arquivo" (multipart/form-data).'])
  }
  const arquivo = form.get('arquivo')
  if (!(arquivo instanceof File) || !arquivo.size) return texto(400, ['ERRO: arquivo vazio ou ausente.'])
  const parcial = form.get('parcial') === '1'
  const forcar = form.get('forcar') === '1'

  let conteudo: Buffer = Buffer.from(await arquivo.arrayBuffer())
  const envio = String(form.get('envio') ?? '').replace(/[^\w-]/g, '').slice(0, 64)
  const total = Number(form.get('total') ?? 1)
  if (envio && total > 1) {
    const parte = Number(form.get('parte'))
    if (!Number.isInteger(parte) || !Number.isInteger(total) || parte < 1 || parte > total || total > 20) {
      return texto(400, ['ERRO: parte/total invalidos.'])
    }
    await query(
      `create table if not exists robo_partes (envio text not null, parte int not null, dados bytea not null,
         criado_em timestamptz not null default now(), primary key (envio, parte))`,
    )
    await query(`delete from robo_partes where criado_em < now() - interval '1 day'`)
    await query(
      `insert into robo_partes (envio, parte, dados) values ($1, $2, $3)
         on conflict (envio, parte) do update set dados = excluded.dados, criado_em = now()`,
      [envio, parte, conteudo],
    )
    const partes = await query<{ parte: number; dados: Buffer }>(
      'select parte, dados from robo_partes where envio = $1 order by parte',
      [envio],
    )
    if (partes.length < total) return texto(202, [`PARTE ${parte}/${total} recebida`])
    conteudo = Buffer.concat(partes.map((p) => p.dados))
    await query('delete from robo_partes where envio = $1', [envio])
  }

  let abas
  try {
    const wb = new ExcelJS.Workbook()
    if (ehXlsx(conteudo)) await wb.xlsx.load(conteudo as unknown as ArrayBuffer)
    else planilhaDeTexto(wb, conteudo)
    abas = lerAbas(wb)
  } catch {
    return texto(400, [`ERRO: nao consegui ler ${arquivo.name}. Confira se e .xlsx ou o texto salvo pelo SAP.`])
  }
  if (!abas.length) return texto(422, [`ERRO: ${arquivo.name} nao tem nenhuma planilha reconhecida (cabecalho diferente do esperado).`])

  const saida: string[] = []
  let falhou = false
  let recusada = false
  const vistas = new Set<string>()
  for (const aba of abas) {
    if (vistas.has(aba.base)) continue
    vistas.add(aba.base)
    const nome = BASES[aba.base].nome
    const anterior = await queryOne<{ linhas: number }>(
      `select linhas from importacoes where base = $1 and status = 'concluida' order by concluido_em desc limit 1`,
      [aba.base],
    )
    if (!forcar && anterior && aba.linhas.length < anterior.linhas * MINIMO_DA_ANTERIOR) {
      recusada = true
      saida.push(
        `ERRO ${nome}: veio ${aba.linhas.length} linhas, a ultima importacao teve ${anterior.linhas}. Parece exportacao incompleta; nada foi alterado. (Para importar mesmo assim, envie forcar=1.)`,
      )
      continue
    }
    try {
      const id = await iniciarImportacao(aba.base, `${PREFIXO_ROBO} ${arquivo.name} › ${aba.nome}`.slice(0, 200), null)
      for (let i = 0; i < aba.linhas.length; i += LOTE) await importarLote(id, aba.linhas.slice(i, i + LOTE))
      const r = await concluirImportacao(id, !parcial)
      saida.push(`OK ${nome}: ${r?.linhas} linhas | ${r?.novas} novas | ${r?.alteradas} mudaram | ${r?.removidas} sairam`)
    } catch (erro) {
      falhou = true
      console.error('robo importar', erro)
      saida.push(`ERRO ${nome}: ${erro instanceof Error ? erro.message : 'falha na importacao'}`)
    }
  }
  revalidatePath('/', 'layout')
  return texto(falhou ? 500 : recusada ? 422 : 200, saida)
}
