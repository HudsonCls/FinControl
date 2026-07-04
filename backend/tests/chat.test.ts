import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb, createTestUser, createCategoryFor } from './helpers';
import { currentMonth } from '../src/lib/dates';

const app = createApp();

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe('Chat IA API', () => {
  let token: string;
  let userId: string;

  beforeEach(async () => {
    await resetDb();
    const created = await createTestUser();
    token = created.token;
    userId = created.user.id;
    await createCategoryFor(userId, { name: 'Alimentação' });
    await createCategoryFor(userId, { name: 'Lazer', icon: 'ti-device-tv', color: '#ec4899' });
    await createCategoryFor(userId, { name: 'Outros', icon: 'ti-tag', color: '#6b7280' });
  });

  it('exige autenticação', async () => {
    const res = await request(app).post('/api/chat/messages').send({ content: 'oi' });
    expect(res.status).toBe(401);
  });

  it('registra despesa por linguagem natural e categoriza', async () => {
    const res = await request(app)
      .post('/api/chat/messages')
      .set(auth(token))
      .send({ content: 'gastei 42,90 no iFood' });

    expect(res.status).toBe(201);
    expect(res.body.data.transaction).toBeDefined();
    expect(res.body.data.transaction.amount).toBe(42.9);
    expect(res.body.data.transaction.type).toBe('EXPENSE');
    expect(res.body.data.transaction.category.name).toBe('Alimentação');
    expect(res.body.data.reply).toContain('Anotado');

    const txs = await prisma.transaction.findMany({ where: { userId } });
    expect(txs).toHaveLength(1);
    expect(txs[0].amountCents).toBe(4290);
    expect(txs[0].source).toBe('APP');
  });

  it('registra receita com "recebi"', async () => {
    const res = await request(app)
      .post('/api/chat/messages')
      .set(auth(token))
      .send({ content: 'recebi 4800 de salário' });
    expect(res.status).toBe(201);
    expect(res.body.data.transaction.type).toBe('INCOME');
    expect(res.body.data.transaction.amount).toBe(4800);
  });

  it('responde "quanto gastei em alimentação" com a soma correta', async () => {
    const alim = await prisma.category.findFirstOrThrow({
      where: { userId, name: 'Alimentação' },
    });
    await prisma.transaction.createMany({
      data: [
        { userId, categoryId: alim.id, description: 'iFood', amountCents: 4290, type: 'EXPENSE' },
        { userId, categoryId: alim.id, description: 'Padaria', amountCents: 1710, type: 'EXPENSE' },
      ],
    });

    const res = await request(app)
      .post('/api/chat/messages')
      .set(auth(token))
      .send({ content: 'quanto gastei em alimentação?' });

    expect(res.status).toBe(201);
    // 42,90 + 17,10 = 60,00
    expect(res.body.data.reply).toContain('60,00');
    expect(res.body.data.reply).toContain('Alimentação');
    expect(res.body.data.reply).toContain('2 lançamento');
  });

  it('define limite de orçamento por mensagem', async () => {
    const res = await request(app)
      .post('/api/chat/messages')
      .set(auth(token))
      .send({ content: 'limite de 500 em lazer' });

    expect(res.status).toBe(201);
    expect(res.body.data.reply).toContain('Limite');
    expect(res.body.data.reply).toContain('Lazer');

    const lazer = await prisma.category.findFirstOrThrow({ where: { userId, name: 'Lazer' } });
    const budget = await prisma.budget.findFirst({
      where: { userId, categoryId: lazer.id, month: currentMonth() },
    });
    expect(budget?.limitCents).toBe(50000);
  });

  it('dispara alerta quando a despesa cruza o limite', async () => {
    const alim = await prisma.category.findFirstOrThrow({
      where: { userId, name: 'Alimentação' },
    });
    await prisma.budget.create({
      data: { userId, categoryId: alim.id, month: currentMonth(), limitCents: 10000 },
    });
    // Já gastou 85,00; o limite é 100,00.
    await prisma.transaction.create({
      data: { userId, categoryId: alim.id, description: 'Mercado', amountCents: 8500, type: 'EXPENSE' },
    });

    const res = await request(app)
      .post('/api/chat/messages')
      .set(auth(token))
      .send({ content: 'gastei 10 no ifood' });

    expect(res.status).toBe(201);
    expect(res.body.data.reply).toContain('⚠');

    const alerts = await prisma.alert.findMany({ where: { userId } });
    expect(alerts.length).toBeGreaterThanOrEqual(1);
  });

  it('persiste o histórico do chat', async () => {
    await request(app).post('/api/chat/messages').set(auth(token)).send({ content: 'oi' });
    const res = await request(app).get('/api/chat/messages').set(auth(token));
    expect(res.status).toBe(200);
    // mensagem do usuário + resposta do assistente
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].role).toBe('USER');
    expect(res.body.data[1].role).toBe('ASSISTANT');
  });

  it('apaga o último lançamento com "apaga o último"', async () => {
    await request(app)
      .post('/api/chat/messages')
      .set(auth(token))
      .send({ content: 'gastei 42,90 no iFood' });

    const res = await request(app)
      .post('/api/chat/messages')
      .set(auth(token))
      .send({ content: 'apaga o último' });

    expect(res.status).toBe(201);
    expect(res.body.data.reply).toContain('Apaguei');
    expect(res.body.data.reply).toContain('42,90');

    const txs = await prisma.transaction.findMany({ where: { userId } });
    expect(txs).toHaveLength(0);
  });

  it('avisa quando não há lançamento para apagar', async () => {
    const res = await request(app)
      .post('/api/chat/messages')
      .set(auth(token))
      .send({ content: 'apaga o último' });
    expect(res.status).toBe(201);
    expect(res.body.data.reply).toContain('Não encontrei');
  });

  it('corrige o valor do último lançamento com "corrige pra X"', async () => {
    await request(app)
      .post('/api/chat/messages')
      .set(auth(token))
      .send({ content: 'gastei 42,90 no iFood' });

    const res = await request(app)
      .post('/api/chat/messages')
      .set(auth(token))
      .send({ content: 'corrige pra 35,50' });

    expect(res.status).toBe(201);
    expect(res.body.data.transaction.amount).toBe(35.5);
    expect(res.body.data.reply).toContain('35,50');
    expect(res.body.data.reply).toContain('42,90');

    const txs = await prisma.transaction.findMany({ where: { userId } });
    expect(txs).toHaveLength(1);
    expect(txs[0].amountCents).toBe(3550);
  });

  it('responde ao ritmo de gasto ("quanto ainda posso gastar")', async () => {
    await prisma.transaction.createMany({
      data: [
        { userId, description: 'Salário', amountCents: 500000, type: 'INCOME' },
        { userId, description: 'Aluguel', amountCents: 100000, type: 'EXPENSE' },
      ],
    });

    const res = await request(app)
      .post('/api/chat/messages')
      .set(auth(token))
      .send({ content: 'quanto ainda posso gastar essa semana?' });

    expect(res.status).toBe(201);
    expect(res.body.data.reply).toContain('saldo livre');
    expect(res.body.data.reply).toMatch(/dia/);
  });

  it('avisa quando o saldo do ritmo de gasto já está negativo', async () => {
    await prisma.transaction.create({
      data: { userId, description: 'Aluguel', amountCents: 100000, type: 'EXPENSE' },
    });

    const res = await request(app)
      .post('/api/chat/messages')
      .set(auth(token))
      .send({ content: 'ritmo de gasto' });

    expect(res.status).toBe(201);
    expect(res.body.data.reply).toContain('Não sobrou margem');
  });
});
