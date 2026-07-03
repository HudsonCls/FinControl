# FinControl — Hub de Controle Financeiro

Sistema de controle financeiro pessoal inspirado no **Porquim**: dashboard completo na
plataforma + registro de gastos por **chat estilo WhatsApp** com IA que entende linguagem
natural, categoriza, e responde consultas ("quanto gastei em
alimentação esse mês?").

## Estrutura

```
ORGANIZAÇÃO/
├── backend/     API Node + Express + TypeScript + Prisma (SQLite dev → Postgres prod)
└── frontend/    App React + Vite + Tailwind + React Query
```

## Como rodar (os dois juntos)

```bash
# terminal 1 — backend
cd backend && npm install && npm run db:push && npm run seed && npm run dev

# terminal 2 — frontend
cd frontend && npm install && npm run dev   # abre http://localhost:5173
```

Login demo: `demo@fincontrol.dev` / `demo1234`

## Funcionalidades

| Área              | Descrição |
|-------------------|-----------|
| Autenticação      | Registro/login com JWT, senha com hash bcrypt |
| Contas e cartões  | Múltiplas contas (corrente, poupança, cartão, dinheiro) |
| Categorias        | Categorias com ícone, cor, tipo e limite mensal |
| Transações        | Receitas/despesas, origem (app/WhatsApp), data, conta, categoria |
| Orçamentos        | Limite por categoria/mês com cálculo de % usado |
| Alertas           | Disparo automático ao cruzar % do limite |
| Chat IA           | Linguagem natural → transação categorizada (Claude API + fallback) |
| WhatsApp          | Webhook (simulado + adaptador Twilio) para registrar por mensagem |
| Busca / Relatórios| "quanto gastei em X" → soma filtrada por categoria/período |

## Como rodar o backend

```bash
cd backend
npm install
npm run db:push      # cria o banco SQLite
npm run seed         # popula dados de exemplo (usuário demo)
npm run dev          # sobe a API em http://localhost:4000
npm test             # roda a suíte de testes
```

Veja `backend/README.md` para detalhes da API.
