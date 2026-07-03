import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { resetDb, createTestUser, createCategoryFor } from './helpers';

const app = createApp();

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('Transactions API', () => {
  let token: string;
  let userId: string;

  beforeEach(async () => {
    await resetDb();
    const created = await createTestUser();
    token = created.token;
    userId = created.user.id;
  });

  it('exige autenticação', async () => {
    const res = await request(app).get('/api/transactions');
    expect(res.status).toBe(401);
  });

  it('cria uma despesa convertendo reais em centavos', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set(auth(token))
      .send({ description: 'Mercado', amount: 123.45, type: 'EXPENSE' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      description: 'Mercado',
      amount: 123.45,
      type: 'EXPENSE',
      source: 'APP',
      category: null,
      account: null,
    });
    expect(res.body.data.id).toBeDefined();
  });

  it('rejeita amount <= 0', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set(auth(token))
      .send({ description: 'Inválido', amount: 0, type: 'EXPENSE' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('rejeita categoria de outro dono', async () => {
    const other = await createTestUser('outro@fincontrol.dev');
    const otherCat = await createCategoryFor(other.user.id, { name: 'Alheia' });

    const res = await request(app)
      .post('/api/transactions')
      .set(auth(token))
      .send({ description: 'Tentativa', amount: 10, type: 'EXPENSE', categoryId: otherCat.id });
    expect(res.status).toBe(400);
  });

  it('lista e filtra por categoryId e por type', async () => {
    const cat = await createCategoryFor(userId, { name: 'Alimentação' });

    await request(app)
      .post('/api/transactions')
      .set(auth(token))
      .send({ description: 'Almoço', amount: 30, type: 'EXPENSE', categoryId: cat.id });
    await request(app)
      .post('/api/transactions')
      .set(auth(token))
      .send({ description: 'Salário', amount: 5000, type: 'INCOME' });

    const all = await request(app).get('/api/transactions').set(auth(token));
    expect(all.status).toBe(200);
    expect(all.body.data).toHaveLength(2);
    expect(all.body.meta.total).toBe(2);

    const byCategory = await request(app)
      .get(`/api/transactions?categoryId=${cat.id}`)
      .set(auth(token));
    expect(byCategory.body.data).toHaveLength(1);
    expect(byCategory.body.data[0].description).toBe('Almoço');
    expect(byCategory.body.data[0].category.id).toBe(cat.id);

    const income = await request(app).get('/api/transactions?type=INCOME').set(auth(token));
    expect(income.body.data).toHaveLength(1);
    expect(income.body.data[0].type).toBe('INCOME');
  });

  it('busca por texto na descrição (q)', async () => {
    await request(app)
      .post('/api/transactions')
      .set(auth(token))
      .send({ description: 'Padaria do bairro', amount: 12, type: 'EXPENSE' });
    await request(app)
      .post('/api/transactions')
      .set(auth(token))
      .send({ description: 'Posto de gasolina', amount: 200, type: 'EXPENSE' });

    const res = await request(app).get('/api/transactions?q=padaria').set(auth(token));
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].description).toBe('Padaria do bairro');
  });

  it('pagina mantendo meta.total correto', async () => {
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/transactions')
        .set(auth(token))
        .send({ description: `Item ${i}`, amount: 10 + i, type: 'EXPENSE' });
    }

    const res = await request(app)
      .get('/api/transactions?limit=2&offset=0')
      .set(auth(token));
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ total: 3, limit: 2, offset: 0 });

    const page2 = await request(app)
      .get('/api/transactions?limit=2&offset=2')
      .set(auth(token));
    expect(page2.body.data).toHaveLength(1);
    expect(page2.body.meta.total).toBe(3);
  });

  it('atualiza o amount corretamente em reais', async () => {
    const created = await request(app)
      .post('/api/transactions')
      .set(auth(token))
      .send({ description: 'Conta de luz', amount: 100, type: 'EXPENSE' });
    const id = created.body.data.id;

    const updated = await request(app)
      .patch(`/api/transactions/${id}`)
      .set(auth(token))
      .send({ amount: 250.5 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.amount).toBe(250.5);

    const fetched = await request(app).get(`/api/transactions/${id}`).set(auth(token));
    expect(fetched.body.data.amount).toBe(250.5);
  });

  it('deleta retornando 204', async () => {
    const created = await request(app)
      .post('/api/transactions')
      .set(auth(token))
      .send({ description: 'Removível', amount: 5, type: 'EXPENSE' });
    const id = created.body.data.id;

    const del = await request(app).delete(`/api/transactions/${id}`).set(auth(token));
    expect(del.status).toBe(204);

    const after = await request(app).get(`/api/transactions/${id}`).set(auth(token));
    expect(after.status).toBe(404);
  });

  it('retorna 404 ao buscar transação de outro usuário', async () => {
    const other = await createTestUser('terceiro@fincontrol.dev');
    const otherTx = await request(app)
      .post('/api/transactions')
      .set(auth(other.token))
      .send({ description: 'Privada', amount: 99, type: 'EXPENSE' });

    const res = await request(app)
      .get(`/api/transactions/${otherTx.body.data.id}`)
      .set(auth(token));
    expect(res.status).toBe(404);
  });
});
