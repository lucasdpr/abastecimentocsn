# Central de Abastecimento

App (PWA) de acompanhamento da Central de Abastecimento de Manutenção. É uma extensão do SAP, **não substitui o SAP**: as planilhas exportadas do SAP são importadas aqui para monitorar ordens, follow-up de fornecedores, ativação e ANTECs, e para avisar o que precisa ser cobrado.

## O que tem

- **Painel**: KPIs e gráficos (ordens abertas, paradas, necessidade vencida, carteira do FUP, retorno por semana, responsáveis).
- **Ordens**: busca por OM, material, reserva ou local. O detalhe mostra os itens, os pedidos, o histórico de mudanças detectadas a cada importação e o acompanhamento da Central (situação, setor, cobranças).
- **Cobranças**: ordens sem mudança no SAP há N dias (padrão 30), cobradas sem resposta, ANTECs fora do prazo (1 dia útil para a Central, 4 para a área) e pedidos elegíveis a cancelar ou prorrogar (3+ cobranças sem retorno).
- **Follow-up (FUP)**: tratativa por item de PO (retorno, nova data, motivo, responsável) e visão de Reparo Geral (RG).
- **Ativação** e **ANTECs**.
- **Assistente IA**: responde pelo número da OM ou do PO, por material ou fornecedor, sempre consultando o banco. Sem chave de IA configurada, responde em "modo direto" (consulta objetiva, sem modelo).
- **Importar / Excel**: sobe a planilha do SAP (o tipo é detectado pelo cabeçalho). Exporta xlsx/csv com as mesmas colunas e mais as colunas `APP ...`. Editar essas colunas e reimportar atualiza o app, e o Excel pode puxar os dados direto pelo Power Query.
- **Notificações push**: avisa direto no aparelho (com o app fechado) quando alguém pede cadastro, por exemplo. Ativa em Configurações → Notificações.
- **Perfis**: Administrador, Abastecimento (edita), Gerência (vê tudo), Consulta (ordens e IA).
- **Login por matrícula** (não por e-mail). O e-mail continua guardado como contato.

## Configuração (Vercel → Settings → Environment Variables)

| Variável | Valor |
|---|---|
| `DATABASE_URL` | URL *pooled* do projeto Neon **Abastecimento CSN** (separado da OMS) |
| `AUTH_SECRET` | texto aleatório com 32 caracteres ou mais |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_MATRICULA` | primeiro administrador, criado no primeiro login (as três são obrigatórias) |
| `EXPORT_TOKEN` | 16 caracteres ou mais; habilita o Excel conectado (Power Query) |
| `VAPID_PUBLIC_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (mesmo valor) / `VAPID_PRIVATE_KEY` | opcional: notificações push (gere com `npx web-push generate-vapid-keys`) |
| `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` | opcional: qualquer API compatível com OpenAI (ex.: Gemini grátis) |
| `AI_GATEWAY_API_KEY`, `AI_MODEL` | opcional: Vercel AI Gateway (no Vercel também usa o token OIDC automaticamente) |

Veja `.env.example`. O esquema do banco fica em `db/schema.sql` (`pnpm db:setup` aplica).

## Desenvolvimento

```bash
pnpm install
cp .env.example .env.local   # preencha
pnpm db:setup
pnpm dev
```

> Nunca commite planilhas ou dados da CSN neste repositório.
