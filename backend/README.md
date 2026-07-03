# FinControl — Backend

API REST do hub de controle financeiro. Node + Express + TypeScript + Prisma (SQLite dev → Postgres prod).

## Rodando

```bash
npm install
npm run db:push      # cria/atualiza o banco SQLite a partir do schema
npm run seed         # popula o usuário demo e dados de exemplo
npm run dev          # http://localhost:4000
npm test             # 71 testes (vitest)
```

Login demo: `demo@fincontrol.dev` / `demo1234`

## Decisões

- **Dinheiro em centavos (Int)** no banco; a API troca em reais nas bordas. Sem erro de float.
- **SQLite em dev** (zero setup). Produção: troque `provider` em `prisma/schema.prisma` para `postgresql` e ajuste `DATABASE_URL`.
- **IA opcional**: com `ANTHROPIC_API_KEY`, a categorização do chat usa Claude; sem chave, usa fallback por palavras-chave (determinístico).
- **WhatsApp opcional**: com credenciais Twilio, envia mensagens reais; sem elas, modo simulado. Webhook compatível com verificação estilo Meta.

## Autenticação

JWT via header `Authorization: Bearer <token>`. Obtenha em `/api/auth/login` ou `/api/auth/register`.

## Endpoints

### Auth
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/register` | `{ email, password, name, phone? }` → `{ user, token }` |
| POST | `/api/auth/login` | `{ email, password }` → `{ user, token }` |
| GET | `/api/auth/me` | usuário autenticado |

### Categorias
`GET/POST /api/categories` · `GET/PATCH/DELETE /api/categories/:id`
Campos: `name, icon, color, type (EXPENSE|INCOME), monthlyLimit`.

### Contas
`GET/POST /api/accounts` · `GET/PATCH/DELETE /api/accounts/:id`
Campos: `name, type (CHECKING|SAVINGS|CREDIT_CARD|CASH), institution?, balance`.

### Transações
`GET/POST /api/transactions` · `GET/PATCH/DELETE /api/transactions/:id`
Filtros no GET: `categoryId, type, source, accountId, from, to, q, limit, offset`.

### Orçamentos e alertas
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/budgets?month=YYYY-MM` | status (gasto/limite/%) por categoria |
| POST/PUT | `/api/budgets` | `{ categoryId, month, limit }` (upsert) |
| DELETE | `/api/budgets/:id` | remove |
| GET | `/api/alerts?read=` | lista alertas |
| PATCH | `/api/alerts/:id` | `{ read }` |
| DELETE | `/api/alerts/:id` | remove |

### Relatórios e busca
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/reports/summary?month=` | KPIs do dashboard (totais, saldo, por categoria, série diária, via WhatsApp) |
| GET | `/api/reports/search?category=&q=&from=&to=&type=&month=` | **"quanto gastei com X"** — soma + lançamentos filtrados |
| GET | `/api/reports/by-category?month=` | quebra por categoria |

`category` casa por **nome** (case-insensitive) ou id.

### Chat IA
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/chat/messages` | histórico |
| POST | `/api/chat/messages` | `{ content, channel? }` → interpreta linguagem natural |

Entende: registrar gasto (`"gastei 42,90 no iFood"`), receita (`"recebi 4800 de salário"`), consulta (`"quanto gastei em alimentação?"`) e limite (`"limite de 500 em lazer"`).

### WhatsApp
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/whatsapp/webhook` | verificação (Meta: `hub.challenge`) |
| POST | `/api/whatsapp/webhook` | recebe mensagem (`{ from, text }` ou Twilio `{ From, Body }`) e processa pela mesma IA do chat |

## Estrutura

```
src/
├── config/env.ts          validação de ambiente (zod)
├── lib/                    prisma, jwt, money, dates, errors, asyncHandler
├── middleware/             auth, validate, errorHandler
└── modules/<dominio>/      routes + service + schemas por domínio
tests/                      71 testes (1 arquivo por módulo)
prisma/                     schema.prisma + seed.ts
```
