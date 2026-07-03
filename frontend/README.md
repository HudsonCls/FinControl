# FinControl — Frontend

App web do hub financeiro. React + Vite + TypeScript + Tailwind + React Query + Recharts.

## Rodando

O backend precisa estar rodando em `http://localhost:4000` (veja `../backend`).

```bash
npm install
npm run dev        # http://localhost:5173
```

O Vite faz proxy de `/api` para o backend (sem CORS). Para apontar para outra URL,
ajuste o proxy em `vite.config.ts`.

Login demo: `demo@fincontrol.dev` / `demo1234`

## Telas

| Rota | Tela |
|---|---|
| `/login` | Entrar / criar conta |
| `/` | Dashboard (KPIs, gráfico diário, por categoria, orçamentos, últimas transações) |
| `/transacoes` | Lista com filtros + cadastro manual |
| `/busca` | **"Quanto gastei com X"** — busca por categoria/texto/mês |
| `/orcamentos` | Limites por categoria com progresso |
| `/chat` | Chat estilo WhatsApp — registra gasto por linguagem natural |
| `/categorias` | Gerenciar categorias |
| `/contas` | Contas e cartões |
| `/alertas` | Alertas de limite |

## Estrutura

```
src/
├── lib/          api (axios), queries (React Query), types, format, icons
├── context/      AuthContext (JWT + /auth/me)
├── components/   Layout (sidebar/topbar), MonthSelector, ui (Card/Button/Modal/...)
└── pages/        uma por tela
```

## Build

```bash
npm run build      # tsc --noEmit + vite build -> dist/
```
