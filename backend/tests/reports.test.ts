import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb, createTestUser, createCategoryFor } from './helpers';

const app = createApp();

const MONTH = '2026-03';

describe('Reports API', () => {
  let token: string;
  let userId: string;
  let foodId: string;
  let transportId: string;
  let salaryId: string;

  beforeEach(async () => {
    await resetDb();
    const created = await createTestUser();
    token = created.token;
    userId = created.user.id;

    const food = await createCategoryFor(userId, { name: 'Alimentação', type: 'EXPENSE' });
    const transport = await createCategoryFor(userId, { name: 'Transporte', type: 'EXPENSE' });
    const salary = await createCategoryFor(userId, { name: 'Salário', type: 'INCOME' });
    foodId = food.id;
    transportId = transport.id;
    salaryId = salary.id;

    // Despesas e receitas em datas conhecidas de março/2026 (UTC).
    await prisma.transaction.createMany({
      data: [
        {
          userId,
          categoryId: foodId,
          description: 'Mercado do mês',
          amountCents: 15050, // R$150,50
          type: 'EXPENSE',
          date: new Date(Date.UTC(2026, 2, 5)),
          source: 'APP',
        },
        {
          userId,
          categoryId: foodId,
          description: 'iFood almoço',
          amountCents: 4990, // R$49,90
          type: 'EXPENSE',
          date: new Date(Date.UTC(2026, 2, 10)),
          source: 'WHATSAPP',
        },
        {
          userId,
          categoryId: transportId,
          description: 'Uber centro',
          amountCents: 2310, // R$23,10
          type: 'EXPENSE',
          date: new Date(Date.UTC(2026, 2, 10)),
          source: 'WHATSAPP',
        },
        {
          userId,
          categoryId: salaryId,
          description: 'Salário mensal',
          amountCents: 500000, // R$5000,00
          type: 'INCOME',
          date: new Date(Date.UTC(2026, 2, 1)),
          source: 'APP',
        },
        // Fora do mês: não deve entrar no summary de março.
        {
          userId,
          categoryId: foodId,
          description: 'Mercado fevereiro',
          amountCents: 9999,
          type: 'EXPENSE',
          date: new Date(Date.UTC(2026, 1, 20)),
          source: 'APP',
        },
      ],
    });
  });

  it('exige autenticação no summary', async () => {
    const res = await request(app).get(`/api/reports/summary?month=${MONTH}`);
    expect(res.status).toBe(401);
  });

  it('exige autenticação na busca', async () => {
    const res = await request(app).get('/api/reports/search');
    expect(res.status).toBe(401);
  });

  it('rejeita month inválido no summary (400)', async () => {
    const res = await request(app)
      .get('/api/reports/summary?month=2026-3')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('rejeita type inválido na busca (400)', async () => {
    const res = await request(app)
      .get('/api/reports/search?type=OUTRO')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('calcula o summary do mês com totais, balance, byCategory e viaWhatsapp', async () => {
    const res = await request(app)
      .get(`/api/reports/summary?month=${MONTH}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const d = res.body.data;
    // Despesas de março: 150,50 + 49,90 + 23,10 = 223,50 (fevereiro fica de fora).
    expect(d.totalExpense).toBe(223.5);
    expect(d.totalIncome).toBe(5000);
    expect(d.balance).toBe(5000 - 223.5);
    // Duas transações via WhatsApp em março.
    expect(d.viaWhatsappCount).toBe(2);

    // byCategory: só despesas, ordenado por total desc.
    expect(d.byCategory).toHaveLength(2);
    const [first, second] = d.byCategory;
    expect(first.name).toBe('Alimentação');
    expect(first.total).toBe(200.4); // 150,50 + 49,90
    expect(first.pct).toBeCloseTo(200.4 / 223.5, 10);
    expect(second.name).toBe('Transporte');
    expect(second.total).toBe(23.1);
    expect(second.pct).toBeCloseTo(23.1 / 223.5, 10);

    // daily: um ponto por dia do mês (março = 31 dias).
    expect(d.daily).toHaveLength(31);
    const day5 = d.daily.find((p: { date: string }) => p.date === '2026-03-05');
    const day10 = d.daily.find((p: { date: string }) => p.date === '2026-03-10');
    const day6 = d.daily.find((p: { date: string }) => p.date === '2026-03-06');
    expect(day5.expense).toBe(150.5);
    expect(day10.expense).toBe(73.0); // 49,90 + 23,10 = 73,00
    expect(day6.expense).toBe(0);
  });

  it('summary usa o mês atual por padrão quando month é omitido', async () => {
    const res = await request(app)
      .get('/api/reports/summary')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    // Sem transações no mês corrente => zeros.
    expect(res.body.data.totalExpense).toBe(0);
    expect(res.body.data.totalIncome).toBe(0);
  });

  it('busca por NOME de categoria (case-insensitive) com total e count corretos', async () => {
    const res = await request(app)
      .get(`/api/reports/search?category=alimentaÇÃo&month=${MONTH}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    // 150,50 + 49,90 = 200,40 ; 2 transações de Alimentação em março.
    expect(res.body.data.total).toBe(200.4);
    expect(res.body.data.count).toBe(2);
    expect(res.body.data.transactions).toHaveLength(2);
    // Ordenado por date desc: iFood (dia 10) antes do Mercado (dia 5).
    expect(res.body.data.transactions[0].description).toBe('iFood almoço');
    expect(res.body.data.transactions[0].amount).toBe(49.9);
    expect(res.body.data.transactions[0].category.name).toBe('Alimentação');
  });

  it('busca por ID de categoria', async () => {
    const res = await request(app)
      .get(`/api/reports/search?category=${transportId}&month=${MONTH}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(1);
    expect(res.body.data.total).toBe(23.1);
  });

  it('busca por nome inexistente devolve vazio', async () => {
    const res = await request(app)
      .get('/api/reports/search?category=Inexistente')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(0);
    expect(res.body.data.total).toBe(0);
    expect(res.body.data.transactions).toHaveLength(0);
  });

  it('filtra por intervalo de datas (from/to)', async () => {
    // Apenas o dia 10 (intervalo [10, 11) de março).
    const res = await request(app)
      .get('/api/reports/search?from=2026-03-10&to=2026-03-11')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    // iFood (49,90) + Uber (23,10) = 73,00 ; 2 transações.
    expect(res.body.data.count).toBe(2);
    expect(res.body.data.total).toBe(73.0);
  });

  it('filtra por texto em description (q)', async () => {
    const res = await request(app)
      .get(`/api/reports/search?q=Uber&month=${MONTH}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(1);
    expect(res.body.data.total).toBe(23.1);
    expect(res.body.data.transactions[0].description).toBe('Uber centro');
  });

  it('by-category devolve a quebra de despesas do mês', async () => {
    const res = await request(app)
      .get(`/api/reports/by-category?month=${MONTH}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].name).toBe('Alimentação');
    expect(res.body.data[0].total).toBe(200.4);
  });

  it('exige autenticação no export', async () => {
    const res = await request(app).get('/api/reports/export');
    expect(res.status).toBe(401);
  });

  it('exporta as transações do mês em CSV', async () => {
    const res = await request(app)
      .get(`/api/reports/export?month=${MONTH}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain(`fincontrol-transacoes-${MONTH}.csv`);

    const text = res.text as string;
    const lines = text.replace(/^\uFEFF/, '').split('\r\n');
    expect(lines[0]).toBe('Data,Descrição,Categoria,Tipo,Origem,Valor');
    // Cabeçalho + 4 transações de março (2 Alimentação + 1 Transporte + 1 Salário).
    expect(lines).toHaveLength(5);
    expect(text).toContain('iFood almoço');
    expect(text).toContain('49,90');
    expect(text).toContain('Salário mensal');
    expect(text).toContain('Receita');
  });

  it('export respeita filtro de categoria', async () => {
    const res = await request(app)
      .get(`/api/reports/export?category=Transporte&month=${MONTH}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const lines = (res.text as string).replace(/^\uFEFF/, '').split('\r\n');
    expect(lines).toHaveLength(2); // cabeçalho + 1 transação
    expect(res.text).toContain('Uber centro');
  });

  it('não vaza transações de outro usuário (posse)', async () => {
    const other = await createTestUser('outro@fincontrol.dev');
    const otherCat = await createCategoryFor(other.user.id, {
      name: 'Alimentação',
      type: 'EXPENSE',
    });
    await prisma.transaction.create({
      data: {
        userId: other.user.id,
        categoryId: otherCat.id,
        description: 'Mercado do outro',
        amountCents: 999999,
        type: 'EXPENSE',
        date: new Date(Date.UTC(2026, 2, 5)),
        source: 'APP',
      },
    });

    const res = await request(app)
      .get(`/api/reports/search?category=Alimentação&month=${MONTH}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    // Continua apenas com as 2 transações do usuário original.
    expect(res.body.data.count).toBe(2);
    expect(res.body.data.total).toBe(200.4);
  });
});
