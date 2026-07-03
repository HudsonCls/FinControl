import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { resetDb, createTestUser } from './helpers';

const app = createApp();

describe('Accounts API', () => {
  let token: string;

  beforeEach(async () => {
    await resetDb();
    ({ token } = await createTestUser());
  });

  it('exige autenticação', async () => {
    const res = await request(app).get('/api/accounts');
    expect(res.status).toBe(401);
  });

  it('cria uma conta', async () => {
    const res = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Conta Corrente',
        type: 'CHECKING',
        institution: 'Banco do Brasil',
        balance: 1500.5,
      });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: 'Conta Corrente',
      type: 'CHECKING',
      institution: 'Banco do Brasil',
      balance: 1500.5,
    });
    expect(res.body.data.id).toBeDefined();
  });

  it('usa saldo padrão zero quando não informado', async () => {
    const res = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Carteira', type: 'CASH' });
    expect(res.status).toBe(201);
    expect(res.body.data.balance).toBe(0);
  });

  it('rejeita tipo inválido', async () => {
    const res = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Conta X', type: 'INVALIDO' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('lista contas do usuário', async () => {
    await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Conta Corrente', type: 'CHECKING' });
    await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Poupança', type: 'SAVINGS' });

    const all = await request(app).get('/api/accounts').set('Authorization', `Bearer ${token}`);
    expect(all.status).toBe(200);
    expect(all.body.data).toHaveLength(2);
  });

  it('busca uma conta por id', async () => {
    const created = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cartão', type: 'CREDIT_CARD', balance: 200 });
    const id = created.body.data.id;

    const res = await request(app)
      .get(`/api/accounts/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ name: 'Cartão', type: 'CREDIT_CARD', balance: 200 });
  });

  it('atualiza e deleta uma conta', async () => {
    const created = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Conta Corrente', type: 'CHECKING', balance: 100 });
    const id = created.body.data.id;

    const updated = await request(app)
      .patch(`/api/accounts/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Conta Principal', balance: 350.75 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe('Conta Principal');
    expect(updated.body.data.balance).toBe(350.75);

    const del = await request(app)
      .delete(`/api/accounts/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);

    const after = await request(app).get('/api/accounts').set('Authorization', `Bearer ${token}`);
    expect(after.body.data).toHaveLength(0);
  });

  it('retorna 404 para id inexistente', async () => {
    const res = await request(app)
      .get('/api/accounts/nao-existe')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('impede acesso a conta de outro usuário', async () => {
    const created = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Conta Corrente', type: 'CHECKING' });
    const id = created.body.data.id;

    const { token: otherToken } = await createTestUser('outro@fincontrol.dev');
    const res = await request(app)
      .get(`/api/accounts/${id}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });
});
