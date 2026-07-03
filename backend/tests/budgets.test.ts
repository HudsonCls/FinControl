import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb, createTestUser, createCategoryFor } from './helpers';
import { evaluateAlerts } from '../src/modules/budgets/budgets.service';

const app = createApp();
const MONTH = '2026-06';

/** Semeia uma transação de despesa dentro do mês de teste. */
async function seedExpense(userId: string, categoryId: string, amountCents: number) {
  return prisma.transaction.create({
    data: {
      userId,
      categoryId,
      description: 'Gasto teste',
      amountCents,
      type: 'EXPENSE',
      date: new Date(Date.UTC(2026, 5, 15)), // junho/2026
    },
  });
}

describe('Budgets & Alerts API', () => {
  let token: string;
  let userId: string;

  beforeEach(async () => {
    await resetDb();
    const created = await createTestUser();
    token = created.token;
    userId = created.user.id;
  });

  it('exige autenticação', async () => {
    const res = await request(app).get('/api/budgets');
    expect(res.status).toBe(401);
  });

  it('cria um orçamento (setBudget)', async () => {
    const category = await createCategoryFor(userId);
    const res = await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId: category.id, month: MONTH, limit: 800 });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      categoryId: category.id,
      month: MONTH,
      limit: 800,
    });
    expect(res.body.data.id).toBeDefined();
  });

  it('atualiza (upsert) o orçamento existente sem duplicar', async () => {
    const category = await createCategoryFor(userId);
    await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId: category.id, month: MONTH, limit: 800 });
    const updated = await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId: category.id, month: MONTH, limit: 1000 });

    expect(updated.status).toBe(201);
    expect(updated.body.data.limit).toBe(1000);

    const count = await prisma.budget.count({ where: { userId, categoryId: category.id, month: MONTH } });
    expect(count).toBe(1);
  });

  it('rejeita payload inválido (400)', async () => {
    const res = await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId: '', month: 'junho', limit: -5 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('rejeita categoria de outro usuário (404)', async () => {
    const other = await createTestUser('outro@fincontrol.dev');
    const otherCategory = await createCategoryFor(other.user.id, { name: 'Outra' });
    const res = await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId: otherCategory.id, month: MONTH, limit: 500 });
    expect(res.status).toBe(404);
  });

  it('getBudgetsStatus retorna spent calculado das transações', async () => {
    const category = await createCategoryFor(userId);
    await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId: category.id, month: MONTH, limit: 1000 });

    await seedExpense(userId, category.id, 25000); // R$ 250,00
    await seedExpense(userId, category.id, 15000); // R$ 150,00

    const res = await request(app)
      .get(`/api/budgets?month=${MONTH}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    const status = res.body.data[0];
    expect(status.limit).toBe(1000);
    expect(status.spent).toBe(400);
    expect(status.pct).toBeCloseTo(0.4, 5);
    expect(status.remaining).toBe(600);
    expect(status.categoryName).toBe('Alimentação');
  });

  it('deleta um orçamento (204) e respeita posse (404)', async () => {
    const category = await createCategoryFor(userId);
    const created = await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId: category.id, month: MONTH, limit: 500 });
    const id = created.body.data.id;

    const del = await request(app)
      .delete(`/api/budgets/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);

    const again = await request(app)
      .delete(`/api/budgets/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(again.status).toBe(404);
  });

  it('evaluateAlerts cria alerta ao passar 80% do limite e é idempotente', async () => {
    const category = await createCategoryFor(userId);
    await prisma.budget.create({
      data: { userId, categoryId: category.id, month: MONTH, limitCents: 100000 }, // R$ 1000
    });
    await seedExpense(userId, category.id, 85000); // 85% -> threshold 0.8

    const first = await evaluateAlerts(userId, MONTH);
    expect(first).toHaveLength(1);
    expect(first[0].threshold).toBe(0.8);
    expect(first[0].message).toContain('Alimentação');
    expect(first[0].message).toContain('85%');

    // Rodar de novo NÃO duplica o alerta não-lido.
    const second = await evaluateAlerts(userId, MONTH);
    expect(second).toHaveLength(0);

    const total = await prisma.alert.count({ where: { userId, categoryId: category.id, month: MONTH } });
    expect(total).toBe(1);
  });

  it('evaluateAlerts cria alerta de 100% quando estoura o limite', async () => {
    const category = await createCategoryFor(userId);
    await prisma.budget.create({
      data: { userId, categoryId: category.id, month: MONTH, limitCents: 100000 },
    });
    await seedExpense(userId, category.id, 120000); // 120% -> threshold 1.0

    const alerts = await evaluateAlerts(userId, MONTH);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].threshold).toBe(1.0);
  });

  it('GET /api/alerts lista (mais novos primeiro) e filtra por read', async () => {
    const category = await createCategoryFor(userId);
    await prisma.budget.create({
      data: { userId, categoryId: category.id, month: MONTH, limitCents: 100000 },
    });
    await seedExpense(userId, category.id, 90000);
    await evaluateAlerts(userId, MONTH);

    const list = await request(app).get('/api/alerts').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].read).toBe(false);

    const unread = await request(app)
      .get('/api/alerts?read=false')
      .set('Authorization', `Bearer ${token}`);
    expect(unread.body.data).toHaveLength(1);

    const readOnly = await request(app)
      .get('/api/alerts?read=true')
      .set('Authorization', `Bearer ${token}`);
    expect(readOnly.body.data).toHaveLength(0);
  });

  it('PATCH /api/alerts/:id marca como lido', async () => {
    const category = await createCategoryFor(userId);
    await prisma.budget.create({
      data: { userId, categoryId: category.id, month: MONTH, limitCents: 100000 },
    });
    await seedExpense(userId, category.id, 90000);
    const [alert] = await evaluateAlerts(userId, MONTH);

    const res = await request(app)
      .patch(`/api/alerts/${alert.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ read: true });

    expect(res.status).toBe(200);
    expect(res.body.data.read).toBe(true);
  });

  it('PATCH /api/alerts/:id respeita posse (404)', async () => {
    const res = await request(app)
      .patch('/api/alerts/inexistente')
      .set('Authorization', `Bearer ${token}`)
      .send({ read: true });
    expect(res.status).toBe(404);
  });
});
