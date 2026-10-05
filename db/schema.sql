-- Schema do Controle de Abastecimento CSN.
-- Idempotente: pode ser executado mais de uma vez (pnpm db:setup).

create table if not exists usuarios (
  id serial primary key,
  email text not null unique,
  nome text not null,
  perfil text not null check (perfil in ('admin', 'abastecimento', 'gerencia', 'consulta')),
  senha_hash text not null,
  ativo boolean not null default true,
  -- true = veio do autocadastro e ainda não foi aprovado por um administrador.
  pendente_aprovacao boolean not null default false,
  -- Identificador do login (em vez de e-mail). Sempre gravada em maiúsculas.
  matricula text unique,
  -- Cargo pedido no autocadastro; some quando aprovado (perfil já reflete a escolha).
  perfil_solicitado text,
  criado_em timestamptz not null default now(),
  ultimo_acesso timestamptz
);
alter table usuarios add column if not exists pendente_aprovacao boolean not null default false;
alter table usuarios add column if not exists matricula text;
alter table usuarios add column if not exists perfil_solicitado text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'usuarios_matricula_key') then
    alter table usuarios add constraint usuarios_matricula_key unique (matricula);
  end if;
end $$;

-- Inscrições de notificação push (Web Push) por usuário/dispositivo.
create table if not exists push_inscricoes (
  id serial primary key,
  usuario_id int not null references usuarios(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  criado_em timestamptz not null default now()
);
create index if not exists push_inscricoes_usuario_idx on push_inscricoes (usuario_id);

create table if not exists configuracoes (
  chave text primary key,
  valor text not null
);
insert into configuracoes (chave, valor) values
  ('dias_sem_movimentacao', '30'),
  ('dias_recobranca', '7')
on conflict (chave) do nothing;

create table if not exists importacoes (
  id serial primary key,
  base text not null,
  arquivo text,
  usuario_id int references usuarios(id),
  iniciado_em timestamptz not null default now(),
  concluido_em timestamptz,
  linhas int not null default 0,
  novas int not null default 0,
  alteradas int not null default 0,
  removidas int not null default 0,
  status text not null default 'em_andamento'
);

-- Itens de reserva das ordens (planilha ATUALIZAÇÃO ORDENS, exportada do SAP).
create table if not exists ordem_itens (
  ordem text not null,
  reserva text not null,
  item text not null,
  material text,
  descricao text,
  qtd numeric,
  unidade text,
  grp_planejamento text,
  data_necessidade date,
  status_item text,
  status_aprovacao text,
  status_usuario text,
  status_sistema text,
  local_instalacao text,
  preco_medio numeric,
  qtd_retirada numeric,
  registro_final boolean not null default false,
  eliminado boolean not null default false,
  permitido_movimento boolean not null default false,
  texto_ordem text,
  norma_apropriacao text,
  hash text not null,
  primeira_vez_em timestamptz not null default now(),
  ultima_mudanca_em timestamptz not null default now(),
  ultima_importacao_id int,
  removido_em timestamptz,
  primary key (ordem, reserva, item)
);
create index if not exists ordem_itens_ordem_idx on ordem_itens (ordem);
create index if not exists ordem_itens_material_idx on ordem_itens (material);

-- Acompanhamento feito pela Central (dados que só existem no app).
create table if not exists ordem_acompanhamento (
  ordem text primary key,
  situacao text not null default 'sem_acao'
    check (situacao in ('sem_acao', 'cobrado', 'aguardando', 'resolvido')),
  setor_responsavel text,
  observacao text,
  cobrancas int not null default 0,
  ultima_cobranca_em timestamptz,
  atualizado_por int references usuarios(id),
  atualizado_em timestamptz not null default now()
);

-- Reservas (SM para centro de custo).
create table if not exists reservas (
  reserva text not null,
  item text not null,
  ordem text,
  material text,
  descricao text,
  unidade text,
  qtd numeric,
  data_necessidade date,
  usuario_sap text,
  registro_final boolean not null default false,
  recebedor text,
  eliminado boolean not null default false,
  permitido_movimento boolean not null default false,
  centro text,
  tipo_movimento text,
  status_reserva text,
  texto_movimento text,
  centro_custo text,
  elemento_pep text,
  deposito text,
  hash text not null,
  primeira_vez_em timestamptz not null default now(),
  ultima_mudanca_em timestamptz not null default now(),
  ultima_importacao_id int,
  removido_em timestamptz,
  primary key (reserva, item)
);

-- Follow-up de pedidos (planilha Dashboard FUP, aba Base).
create table if not exists fup (
  po_item text primary key,
  material text,
  descricao text,
  po text,
  item_po text,
  data_remessa_corrigida date,
  fornecedor_codigo text,
  fornecedor text,
  data_remessa_po date,
  data_po date,
  data_relatorio date,
  centro text,
  gg text,
  g text,
  diretoria text,
  rm_item text,
  evento text,
  descricao_evento text,
  data_ativacao date,
  semana_ativacao text,
  valor numeric,
  tipo_po text,
  contrato text,
  status_sap text,
  -- Campos de tratativa (editáveis no app ou na planilha).
  motivo text,
  nova_data date,
  obs_fornecedor text,
  motivo_dinamica text,
  responsavel text,
  retorno boolean,
  cobrancas int not null default 0,
  ultima_cobranca_em timestamptz,
  hash text not null,
  primeira_vez_em timestamptz not null default now(),
  ultima_mudanca_em timestamptz not null default now(),
  ultima_importacao_id int,
  removido_em timestamptz,
  atualizado_por int references usuarios(id),
  atualizado_em timestamptz
);
create index if not exists fup_po_idx on fup (po);
create index if not exists fup_fornecedor_idx on fup (fornecedor);

-- Ativação de fornecedores (planilha Ativação).
create table if not exists ativacao (
  chave text primary key,
  material text,
  descricao text,
  mrp text,
  valor numeric,
  qtd numeric,
  tipo_doc text,
  atendimento text,
  data_necessidade date,
  po text,
  item_po text,
  data_remessa date,
  status_po text,
  tipo_projeto text,
  rm text,
  item_rm text,
  fornecedor text,
  email text,
  faixa_atraso text,
  classe text,
  desc_classe text,
  ordem text,
  leadtime int,
  centro text,
  hash text not null,
  primeira_vez_em timestamptz not null default now(),
  ultima_mudanca_em timestamptz not null default now(),
  ultima_importacao_id int,
  removido_em timestamptz,
  atualizado_por int references usuarios(id),
  atualizado_em timestamptz
);
create index if not exists ativacao_ordem_idx on ativacao (ordem);
create index if not exists ativacao_po_idx on ativacao (po);

-- ANTECs (controle de prazo: Central 1 dia, área 4 dias).
create table if not exists antecs (
  id serial primary key,
  numero text not null,
  ordem text,
  po text,
  descricao text,
  area text,
  ponto_focal text,
  recebida_em date not null default current_date,
  enviada_area_em date,
  retorno_area_em date,
  status text not null default 'recebida'
    check (status in ('recebida', 'com_area', 'em_aprovacao', 'concluida', 'cancelada')),
  observacao text,
  criado_por int references usuarios(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Histórico: mudanças detectadas na importação e ações da Central.
create table if not exists eventos (
  id bigserial primary key,
  entidade text not null,
  chave text not null,
  tipo text not null,
  descricao text not null,
  usuario_id int references usuarios(id),
  criado_em timestamptz not null default now()
);
create index if not exists eventos_chave_idx on eventos (entidade, chave, criado_em desc);

-- Cada mudança detectada fica ligada à importação que a trouxe (tela "O que mudou").
alter table eventos add column if not exists importacao_id int references importacoes(id) on delete set null;
create index if not exists eventos_importacao_idx on eventos (importacao_id, tipo);

-- Responsáveis por grupo de planejamento (aba "Grupo de Planejamento" da planilha).
create table if not exists grupos_planejamento (
  gpm text primary key,
  gerencia text,
  equipamento text,
  matricula_supervisor text,
  supervisor text,
  matricula_inspetor text,
  inspetor text,
  matricula_abastecimento text,
  abastecimento text,
  hash text not null,
  primeira_vez_em timestamptz not null default now(),
  ultima_mudanca_em timestamptz not null default now(),
  ultima_importacao_id int,
  removido_em timestamptz
);

-- Cadastro das ordens (exportação da IW38): uma linha por OM.
create table if not exists ordens_sap (
  ordem text primary key,
  tipo text,
  prioridade text,
  grp_planejamento text,
  centro_trabalho text,
  tam text,
  plano_manutencao text,
  revisao text,
  status_aprovacao text,
  local_instalacao text,
  denominacao_local text,
  texto text,
  status_usuario text,
  status_sistema text,
  modificado_por text,
  criado_por text,
  sistema_funcional text,
  unidade_operacional text,
  unidade_funcional text,
  indicador text,
  centro_custo text,
  centro_custo_resp text,
  nota text,
  inicio_base date,
  fim_base date,
  data_modificacao date,
  data_liberacao date,
  data_entrada date,
  custo_planejado numeric,
  hash text not null,
  primeira_vez_em timestamptz not null default now(),
  ultima_mudanca_em timestamptz not null default now(),
  ultima_importacao_id int,
  removido_em timestamptz
);

-- Visão por ordem (agrega os itens).
create or replace view ordens as
with i as (
  select *, (eliminado or coalesce(status_item, '') = 'ELIMINADO') as item_eliminado from ordem_itens where removido_em is null
)
select
  i.ordem,
  max(i.texto_ordem) as texto_ordem,
  max(i.local_instalacao) as local_instalacao,
  max(i.grp_planejamento) as grp_planejamento,
  max(i.status_usuario) as status_usuario,
  max(i.status_sistema) as status_sistema,
  count(*)::int as itens,
  count(*) filter (where not i.item_eliminado and coalesce(i.status_item, 'ABERTO') in ('ABERTO', 'PENDENTE', 'PARCIAL'))::int as itens_abertos,
  count(*) filter (where i.status_item = 'RETIRADO')::int as itens_retirados,
  count(*) filter (where i.item_eliminado)::int as itens_eliminados,
  coalesce(sum(i.qtd * i.preco_medio) filter (where not i.item_eliminado), 0) as valor,
  min(i.data_necessidade) filter (where not i.item_eliminado and coalesce(i.status_item, 'ABERTO') in ('ABERTO', 'PENDENTE', 'PARCIAL')) as necessidade_mais_antiga,
  max(i.ultima_mudanca_em) as ultima_mudanca_em,
  min(i.primeira_vez_em) as primeira_vez_em,
  -- Valor só dos itens ainda pendentes (o "valor" acima inclui os já retirados).
  coalesce(sum(i.qtd * i.preco_medio) filter (where not i.item_eliminado and coalesce(i.status_item, 'ABERTO') in ('ABERTO', 'PENDENTE', 'PARCIAL')), 0) as valor_aberto
from i
group by i.ordem;

-- Cópia pré-calculada da visão acima, usada pelas telas: agregar 60 mil itens a
-- cada página pesa no banco. É recalculada ao concluir cada importação de ordens
-- (única coisa que altera ordem_itens). Se a visão "ordens" ganhar colunas, rode
-- "drop materialized view ordens_resumo" antes do db:setup para recriá-la.
create materialized view if not exists ordens_resumo as select * from ordens;
-- O índice único permite "refresh materialized view concurrently" (sem bloquear leituras).
create unique index if not exists ordens_resumo_ordem_idx on ordens_resumo (ordem);
