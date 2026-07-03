# Guia de Deploy — FinControl (100% grátis)

Stack de hospedagem gratuita:
- **Supabase** → banco PostgreSQL (grátis, 500 MB, permanente)
- **Render** → API backend (grátis; "dorme" após 15 min sem uso)
- **Vercel** → frontend / PWA (grátis)
- **Twilio Sandbox** → WhatsApp real (grátis para testar) — opcional

> Tempo estimado: ~40 minutos. Você vai criar 3 contas (Supabase, Render, Vercel) e, se quiser WhatsApp, uma 4ª (Twilio). Nenhuma exige cartão de crédito para o plano grátis.

---

## Passo 0 — Subir o código para o GitHub

Render e Vercel publicam a partir de um repositório no GitHub.

```bash
# na raiz do projeto (ORGANIZAÇÃO/)
git init
git add .
git commit -m "FinControl: app completo"
```

Crie um repositório vazio em github.com (botão **New**), e depois:

```bash
git remote add origin https://github.com/SEU_USUARIO/fincontrol.git
git branch -M main
git push -u origin main
```

> Os arquivos `.env` (com segredos) **não** sobem — já estão no `.gitignore`. ✅

---

## Passo 1 — Banco de dados (Supabase)

1. Entre em **supabase.com** → **Start your project** → crie um projeto.
   - Dê um nome, defina uma **senha do banco** (anote!) e escolha a região mais próxima (ex: South America / São Paulo).
2. Espere ~2 min até o projeto provisionar.
3. Clique em **Connect** (topo) → aba **ORMs** ou **Connection string**. Você vai precisar de **duas** strings:
   - **Transaction pooler** (porta **6543**) → será o `DATABASE_URL`. Adicione `?pgbouncer=true&connection_limit=1` no final.
   - **Session pooler** (porta **5432**) → será o `DIRECT_URL`.
4. Em ambas, troque `[YOUR-PASSWORD]` pela senha que você definiu.

Exemplo de como devem ficar:
```
DATABASE_URL = postgresql://postgres.abcd:SUASENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL   = postgresql://postgres.abcd:SUASENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

> Guarde as duas — você vai colá-las no Render no próximo passo.

---

## Passo 2 — Backend (Render)

1. Entre em **render.com** → faça login com o GitHub.
2. **New** → **Blueprint** → selecione o repositório `fincontrol`.
   - O Render lê o arquivo `render.yaml` e já configura o serviço `fincontrol-api`.
3. Antes de criar, ele vai pedir as variáveis marcadas como "sync: false". Preencha:
   - `DATABASE_URL` → o pooler 6543 do Supabase (com `?pgbouncer=true...`)
   - `DIRECT_URL` → o pooler 5432 do Supabase
   - `CORS_ORIGIN` → deixe `*` por enquanto (ajustamos no Passo 4)
   - As de Twilio/Anthropic → deixe **em branco** (são opcionais)
   - `JWT_SECRET` → o Render gera sozinho ✅
4. Clique em **Apply** / **Create**. O build leva ~3-5 min (instala, gera o cliente Postgres, cria as tabelas, compila).
5. Quando ficar **Live**, copie a URL do serviço, algo como:
   `https://fincontrol-api.onrender.com`
6. Teste no navegador: `https://fincontrol-api.onrender.com/api/health` → deve responder `{"data":{"status":"ok"...}}`.

> **Alternativa sem Blueprint:** New → Web Service → conecte o repo → Root Directory: `backend` → Build: `npm install --include=dev && npm run render:build` → Start: `npm run start` → adicione as variáveis manualmente.

### (Opcional) Popular com dados demo
No Render, abra a aba **Shell** do serviço e rode `npm run render:seed`. Ou simplesmente crie sua própria conta pelo app (recomendado para uso real).

---

## Passo 3 — Frontend / PWA (Vercel)

1. Entre em **vercel.com** → login com GitHub → **Add New** → **Project** → importe o repo.
2. Em **Configure Project**:
   - **Root Directory** → clique em **Edit** e selecione `frontend`.
   - Framework: **Vite** (detectado automaticamente).
   - **Environment Variables** → adicione:
     - Nome: `VITE_API_URL`
     - Valor: a URL do Render **+ `/api`**, ex: `https://fincontrol-api.onrender.com/api`
3. Clique em **Deploy**. Em ~1 min sai a URL, ex: `https://fincontrol.vercel.app`.

---

## Passo 4 — Conectar os dois (CORS)

1. Volte no **Render** → serviço `fincontrol-api` → **Environment**.
2. Edite `CORS_ORIGIN` → coloque a URL da Vercel (sem barra no final):
   `https://fincontrol.vercel.app`
3. Salve (o Render reinicia sozinho).

Agora abra a URL da Vercel, crie sua conta (ou use o demo se semeou) e use o app. 🎉

> ⏱️ **Lembrete do plano grátis:** a 1ª requisição após 15 min parada demora ~30-50s (a API "acorda"). Depois fica rápida.

---

## Passo 5 — Instalar como app (PWA)

- **Celular (Android/Chrome):** abra a URL da Vercel → menu (⋮) → **Instalar app** / **Adicionar à tela inicial**.
- **iPhone (Safari):** botão compartilhar → **Adicionar à Tela de Início**.
- **PC (Chrome/Edge):** ícone de instalar (⊕) na barra de endereço.

Vira um app com ícone próprio, abre em tela cheia. Sem loja, sem custo.

---

## Passo 6 — WhatsApp real (Twilio Sandbox) — opcional

1. Crie conta em **twilio.com** (grátis, sem cartão para o sandbox).
2. Console → **Messaging** → **Try it out** → **Send a WhatsApp message**.
   - Ele te dá um número sandbox e um código tipo `join algo-aqui`.
   - No seu WhatsApp, envie esse `join ...` para o número deles → ativa o sandbox.
3. No Console, pegue **Account SID** e **Auth Token** (página inicial).
4. No **Render** → Environment do `fincontrol-api`, preencha:
   - `TWILIO_ACCOUNT_SID` → seu SID
   - `TWILIO_AUTH_TOKEN` → seu token
   - `TWILIO_WHATSAPP_FROM` → `whatsapp:+14155238886` (o número do sandbox)
   - `WHATSAPP_WEBHOOK_SECRET` → invente um segredo, ex: `meu-token-secreto-123`
5. Configure o webhook no Twilio: em **Sandbox settings**, campo **"When a message comes in"**:
   `https://fincontrol-api.onrender.com/api/whatsapp/webhook?token=meu-token-secreto-123`
   (método **POST**)
6. **Vincule seu número:** no app (web), em **Criar conta** ou no perfil, cadastre seu telefone no formato `+5511999999999` — é assim que o sistema sabe que a mensagem é sua.
7. Pronto: mande no WhatsApp `gastei 30 no ifood` para o número do sandbox → ele registra e responde. Atualiza no app na hora.

> O sandbox pede reenviar o `join ...` a cada ~3 dias de inatividade. Para um número/marca próprios e sem isso, é preciso o WhatsApp oficial (pago/burocrático) — não necessário agora.

---

## Custos e manutenção

| Item | Plano grátis | Limite/observação |
|---|---|---|
| Supabase | Grátis permanente | 500 MB (muito para uso pessoal) |
| Render | Grátis | API dorme após 15 min; ~30-50s para acordar |
| Vercel | Grátis | Generoso para projeto pessoal |
| Twilio Sandbox | Grátis | Reenviar `join` a cada ~3 dias |

Se um dia o "soneca" do Render incomodar: o plano pago dele (~US$7/mês) mantém a API sempre ligada. Não é necessário para começar.

---

## Problemas comuns

- **Erro de CORS no navegador** → `CORS_ORIGIN` no Render não bate com a URL da Vercel (confira, sem `/` no final).
- **Build do Render falha em `prisma`/`tsc`** → confirme que o Build Command tem `--include=dev`.
- **`prisma db push` falha ao conectar** → o `DIRECT_URL` deve ser o **Session pooler (5432)**, não o Transaction pooler.
- **Login/erro 500 na API** → confira `DATABASE_URL` (pooler 6543 com `?pgbouncer=true`).
- **WhatsApp não responde** → confira a URL do webhook (com `?token=`), o `TWILIO_WHATSAPP_FROM` e se seu telefone está cadastrado no formato `+55...`.
- **API lenta na 1ª chamada** → normal no plano grátis (estava "dormindo").
