import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { resetDb, createTestUser } from './helpers';

const app = createApp();

describe('Categories API', () => {
  let token: string;

  beforeEach(async () => {
    await resetDb();
    ({ token } = await createTestUser());
  });

  it('exige autenticação', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(401);
  });

  it('cria uma categoria', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Alimentação',
        type: 'EXPENSE',
        icon: 'ti-tools-kitchen-2',
        color: '#f59e0b',
        monthlyLimit: 800,
      });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: 'Alimentação',
      type: 'EXPENSE',
      monthlyLimit: 800,
    });
    expect(res.body.data.id).toBeDefined();
  });

  it('rejeita payload inválido', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '', type: 'OUTRO' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('impede nome duplicado', async () => {
    const payload = { name: 'Transporte', type: 'EXPENSE' };
    await request(app).post('/api/categories').set('Authorization', `Bearer ${token}`).send(payload);
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(res.status).toBe(409);
  });

  it('lista categorias e filtra por tipo', async () => {
    await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Salário', type: 'INCOME' });
    await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Lazer', type: 'EXPENSE' });

    const all = await request(app).get('/api/categories').set('Authorization', `Bearer ${token}`);
    expect(all.body.data).toHaveLength(2);

    const income = await request(app)
      .get('/api/categories?type=INCOME')
      .set('Authorization', `Bearer ${token}`);
    expect(income.body.data).toHaveLength(1);
    expect(income.body.data[0].name).toBe('Salário');
  });

  it('atualiza e deleta uma categoria', async () => {
    const created = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Saúde', type: 'EXPENSE', monthlyLimit: 400 });
    const id = created.body.data.id;

    const updated = await request(app)
      .patch(`/api/categories/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ monthlyLimit: 500 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.monthlyLimit).toBe(500);

    const del = await request(app)
      .delete(`/api/categories/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);

    const after = await request(app).get('/api/categories').set('Authorization', `Bearer ${token}`);
    expect(after.body.data).toHaveLength(0);
  });
});
