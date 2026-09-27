'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  conferirSenha,
  criarSessao,
  encerrarSessao,
  exigirUsuario,
  garantirAdmin,
  hashSenha,
  pode,
  type Perfil,
} from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export type Resultado = { ok?: boolean; erro?: string } | null

/** Código de e-mail já cadastrado (unique_violation do Postgres) vs. qualquer outro erro de banco. */
function erroEmailDuplicado(erro: unknown) {
  return typeof erro === 'object' && erro !== null && 'code' in erro && (erro as { code: unknown }).code === '23505'
}

const texto = (f: FormData, k: string) => {
  const v = f.get(k)
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

async function registrarEvento(entidade: string, chave: string, tipo: string, descricao: string, usuarioId: number) {
  await query('insert into eventos (entidade, chave, tipo, descricao, usuario_id) values ($1, $2, $3, $4, $5)', [
    entidade,
    chave,
    tipo,
    descricao,
    usuarioId,
  ])
}

// ---------- Sessão ----------

export async function entrar(_: Resultado, form: FormData): Promise<Resultado> {
  const email = texto(form, 'email')?.toLowerCase()
  const senha = texto(form, 'senha')
  if (!email || !senha) return { erro: 'Informe e-mail e senha.' }
  try {
    await garantirAdmin()
  } catch {
    return { erro: 'Banco de dados indisponível. Verifique a configuração (DATABASE_URL).' }
  }
  // Busca independente de "ativo" para poder avisar quem está aguardando aprovação —
  // mas só revela isso depois de confirmar a senha, para não vazar quem tem conta.
  const usuario = await queryOne<{ id: number; senha_hash: string; ativo: boolean; pendente_aprovacao: boolean }>(
    'select id, senha_hash, ativo, pendente_aprovacao from usuarios where email = $1',
    [email],
  )
  if (!usuario || !(await conferirSenha(senha, usuario.senha_hash))) return { erro: 'E-mail ou senha inválidos.' }
  if (!usuario.ativo) {
    return {
      erro: usuario.pendente_aprovacao
        ? 'Seu cadastro foi enviado e está aguardando aprovação de um administrador.'
        : 'Sua conta está bloqueada. Fale com um administrador.',
    }
  }
  await query('update usuarios set ultimo_acesso = now() where id = $1', [usuario.id])
  await criarSessao(usuario.id)
  redirect('/')
}

export async function cadastrar(_: Resultado, form: FormData): Promise<Resultado> {
  const nome = texto(form, 'nome')
  const matricula = texto(form, 'matricula')?.toUpperCase()
  const email = texto(form, 'email')?.toLowerCase()
  const senha = texto(form, 'senha')
  if (!nome || !matricula || !email || !senha) return { erro: 'Preencha nome, matrícula, e-mail e senha.' }
  if (senha.length < 8) return { erro: 'A senha precisa de pelo menos 8 caracteres.' }
  try {
    await garantirAdmin()
    await query(
      `insert into usuarios (nome, matricula, email, senha_hash, perfil, ativo, pendente_aprovacao)
       values ($1, $2, $3, $4, 'consulta', false, true)`,
      [nome, matricula, email, await hashSenha(senha)],
    )
  } catch (erro) {
    return { erro: erroEmailDuplicado(erro) ? 'Já existe um cadastro com esse e-mail.' : 'Não foi possível enviar o cadastro. Tente novamente.' }
  }
  return { ok: true }
}

export async function sair() {
  await encerrarSessao()
  redirect('/login')
}

// ---------- Ordens ----------

const SITUACOES = ['sem_acao', 'cobrado', 'aguardando', 'resolvido'] as const
const NOME_SITUACAO: Record<string, string> = {
  sem_acao: 'Sem ação',
  cobrado: 'Cobrado',
  aguardando: 'Aguardando retorno',
  resolvido: 'Resolvido',
}

export async function registrarCobranca(_: Resultado, form: FormData): Promise<Resultado> {
  const usuario = await exigirUsuario(pode.editar)
  const ordem = texto(form, 'ordem')
  if (!ordem) return { erro: 'Ordem inválida.' }
  const setor = texto(form, 'setor')
  const obs = texto(form, 'observacao')
  await query(
    `insert into ordem_acompanhamento (ordem, situacao, setor_responsavel, observacao, cobrancas, ultima_cobranca_em, atualizado_por)
     values ($1, 'cobrado', $2, $3, 1, now(), $4)
     on conflict (ordem) do update set situacao = 'cobrado',
       setor_responsavel = coalesce($2, ordem_acompanhamento.setor_responsavel),
       observacao = coalesce($3, ordem_acompanhamento.observacao),
       cobrancas = ordem_acompanhamento.cobrancas + 1, ultima_cobranca_em = now(),
       atualizado_por = $4, atualizado_em = now()`,
    [ordem, setor, obs, usuario.id],
  )
  await registrarEvento('ordem', ordem, 'cobranca', `Cobrança registrada${setor ? ` ao setor ${setor}` : ''}${obs ? ` — ${obs}` : ''}`, usuario.id)
  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function salvarAcompanhamento(_: Resultado, form: FormData): Promise<Resultado> {
  const usuario = await exigirUsuario(pode.editar)
  const ordem = texto(form, 'ordem')
  const situacao = texto(form, 'situacao') ?? 'sem_acao'
  if (!ordem || !SITUACOES.includes(situacao as (typeof SITUACOES)[number])) return { erro: 'Dados inválidos.' }
  const setor = texto(form, 'setor')
  const obs = texto(form, 'observacao')
  const anterior = await queryOne<{ situacao: string }>('select situacao from ordem_acompanhamento where ordem = $1', [ordem])
  await query(
    `insert into ordem_acompanhamento (ordem, situacao, setor_responsavel, observacao, atualizado_por)
     values ($1, $2, $3, $4, $5)
     on conflict (ordem) do update set situacao = $2, setor_responsavel = $3, observacao = $4,
       atualizado_por = $5, atualizado_em = now()`,
    [ordem, situacao, setor, obs, usuario.id],
  )
  if ((anterior?.situacao ?? 'sem_acao') !== situacao) {
    await registrarEvento('ordem', ordem, 'acompanhamento', `Situação: ${NOME_SITUACAO[anterior?.situacao ?? 'sem_acao']} → ${NOME_SITUACAO[situacao]}`, usuario.id)
  } else {
    await registrarEvento('ordem', ordem, 'acompanhamento', 'Acompanhamento atualizado', usuario.id)
  }
  revalidatePath('/', 'layout')
  return { ok: true }
}

// ---------- FUP ----------

export async function salvarFup(_: Resultado, form: FormData): Promise<Resultado> {
  const usuario = await exigirUsuario(pode.editar)
  const poItem = texto(form, 'po_item')
  if (!poItem) return { erro: 'Item inválido.' }
  const retorno = texto(form, 'retorno')
  const novaData = texto(form, 'nova_data')
  if (novaData && !/^\d{4}-\d{2}-\d{2}$/.test(novaData)) return { erro: 'Data inválida.' }
  await query(
    `update fup set motivo = $2, nova_data = $3, obs_fornecedor = $4, motivo_dinamica = $5, responsavel = $6,
       retorno = $7, atualizado_por = $8, atualizado_em = now() where po_item = $1`,
    [poItem, texto(form, 'motivo'), novaData, texto(form, 'obs_fornecedor'), texto(form, 'motivo_dinamica'), texto(form, 'responsavel'), retorno === 'sim' ? true : retorno === 'nao' ? false : null, usuario.id],
  )
  await registrarEvento('fup', poItem, 'tratativa', 'Tratativa do FUP atualizada', usuario.id)
  revalidatePath('/fup')
  return { ok: true }
}

export async function cobrarFornecedor(poItem: string) {
  const usuario = await exigirUsuario(pode.editar)
  await query('update fup set cobrancas = cobrancas + 1, ultima_cobranca_em = now() where po_item = $1', [poItem])
  await registrarEvento('fup', poItem, 'cobranca', 'Fornecedor cobrado (FUP)', usuario.id)
  revalidatePath('/fup')
}

export async function salvarStatusAtivacao(_: Resultado, form: FormData): Promise<Resultado> {
  const usuario = await exigirUsuario(pode.editar)
  const chave = texto(form, 'chave')
  if (!chave) return { erro: 'Item inválido.' }
  const status = texto(form, 'status_po')
  await query('update ativacao set status_po = $2, atualizado_por = $3, atualizado_em = now() where chave = $1', [chave, status, usuario.id])
  await registrarEvento('ativacao', chave, 'tratativa', `Status do PO: ${status ?? '—'}`, usuario.id)
  revalidatePath('/ativacao')
  return { ok: true }
}

// ---------- ANTEC ----------

export async function salvarAntec(_: Resultado, form: FormData): Promise<Resultado> {
  const usuario = await exigirUsuario(pode.editar)
  const id = Number(texto(form, 'id') ?? 0)
  const numero = texto(form, 'numero')
  if (!numero) return { erro: 'Informe o número da ANTEC.' }
  const status = texto(form, 'status') ?? 'recebida'
  if (!['recebida', 'com_area', 'em_aprovacao', 'concluida', 'cancelada'].includes(status)) return { erro: 'Status inválido.' }
  const campos = [
    numero,
    texto(form, 'ordem'),
    texto(form, 'po'),
    texto(form, 'descricao'),
    texto(form, 'area'),
    texto(form, 'ponto_focal'),
    texto(form, 'recebida_em') ?? new Date().toISOString().slice(0, 10),
    texto(form, 'enviada_area_em'),
    texto(form, 'retorno_area_em'),
    status,
    texto(form, 'observacao'),
  ]
  if (id) {
    await query(
      `update antecs set numero=$1, ordem=$2, po=$3, descricao=$4, area=$5, ponto_focal=$6, recebida_em=$7,
         enviada_area_em=$8, retorno_area_em=$9, status=$10, observacao=$11, atualizado_em=now() where id=$12`,
      [...campos, id],
    )
  } else {
    await query(
      `insert into antecs (numero, ordem, po, descricao, area, ponto_focal, recebida_em, enviada_area_em, retorno_area_em, status, observacao, criado_por)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [...campos, usuario.id],
    )
  }
  if (campos[1]) await registrarEvento('ordem', String(campos[1]), 'antec', `ANTEC ${numero} ${id ? 'atualizada' : 'registrada'} (${status.replace('_', ' ')})`, usuario.id)
  revalidatePath('/antec')
  return { ok: true }
}

/** Avança a ANTEC para a próxima etapa registrando a data de hoje. */
export async function avancarAntec(id: number) {
  await exigirUsuario(pode.editar)
  await query(
    `update antecs set
       enviada_area_em = case when status = 'recebida' then current_date else enviada_area_em end,
       retorno_area_em = case when status = 'com_area' then current_date else retorno_area_em end,
       status = case status when 'recebida' then 'com_area' when 'com_area' then 'em_aprovacao'
                            when 'em_aprovacao' then 'concluida' else status end,
       atualizado_em = now()
     where id = $1`,
    [id],
  )
  revalidatePath('/antec')
}

// ---------- Usuários e configurações ----------

export async function salvarUsuario(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirUsuario(pode.administrar)
  const id = Number(texto(form, 'id') ?? 0)
  const email = texto(form, 'email')?.toLowerCase()
  const nome = texto(form, 'nome')
  const matricula = texto(form, 'matricula')?.toUpperCase() ?? null
  const perfil = texto(form, 'perfil') as Perfil | null
  const senha = texto(form, 'senha')
  const ativo = form.get('ativo') !== 'nao'
  if (!email || !nome || !perfil || !['admin', 'abastecimento', 'gerencia', 'consulta'].includes(perfil)) {
    return { erro: 'Preencha nome, e-mail e perfil.' }
  }
  if (senha && senha.length < 8) return { erro: 'A senha precisa de pelo menos 8 caracteres.' }
  try {
    if (id) {
      // Ativar aqui também encerra a pendência de aprovação (autocadastro).
      await query(
        'update usuarios set email=$1, nome=$2, matricula=$3, perfil=$4, ativo=$5, pendente_aprovacao = pendente_aprovacao and not $5 where id=$6',
        [email, nome, matricula, perfil, ativo, id],
      )
      if (senha) await query('update usuarios set senha_hash=$1 where id=$2', [await hashSenha(senha), id])
    } else {
      if (!senha) return { erro: 'Defina uma senha inicial.' }
      await query('insert into usuarios (email, nome, matricula, perfil, senha_hash) values ($1,$2,$3,$4,$5)', [email, nome, matricula, perfil, await hashSenha(senha)])
    }
  } catch (erro) {
    return { erro: erroEmailDuplicado(erro) ? 'Já existe um usuário com esse e-mail.' : 'Não foi possível salvar. Tente novamente.' }
  }
  revalidatePath('/configuracoes')
  return { ok: true }
}

/** Aprovação rápida de um autocadastro (mantém o perfil "Consulta" definido no cadastro). */
export async function aprovarUsuario(id: number) {
  await exigirUsuario(pode.administrar)
  await query('update usuarios set ativo = true, pendente_aprovacao = false where id = $1', [id])
  revalidatePath('/configuracoes')
}

export async function recusarUsuario(id: number) {
  await exigirUsuario(pode.administrar)
  await query('delete from usuarios where id = $1 and pendente_aprovacao', [id])
  revalidatePath('/configuracoes')
}

export async function alterarMinhaSenha(_: Resultado, form: FormData): Promise<Resultado> {
  const usuario = await exigirUsuario()
  const atual = texto(form, 'atual')
  const nova = texto(form, 'nova')
  if (!atual || !nova || nova.length < 8) return { erro: 'A nova senha precisa de pelo menos 8 caracteres.' }
  const row = await queryOne<{ senha_hash: string }>('select senha_hash from usuarios where id = $1', [usuario.id])
  if (!row || !(await conferirSenha(atual, row.senha_hash))) return { erro: 'Senha atual incorreta.' }
  await query('update usuarios set senha_hash = $1 where id = $2', [await hashSenha(nova), usuario.id])
  return { ok: true }
}

export async function salvarConfiguracoes(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirUsuario(pode.administrar)
  const dias = Number(texto(form, 'dias_sem_movimentacao'))
  const recobranca = Number(texto(form, 'dias_recobranca'))
  if (!Number.isInteger(dias) || dias < 1 || dias > 365 || !Number.isInteger(recobranca) || recobranca < 1 || recobranca > 90) {
    return { erro: 'Valores inválidos.' }
  }
  await query(
    `insert into configuracoes (chave, valor) values ('dias_sem_movimentacao', $1), ('dias_recobranca', $2)
     on conflict (chave) do update set valor = excluded.valor`,
    [String(dias), String(recobranca)],
  )
  revalidatePath('/', 'layout')
  return { ok: true }
}
