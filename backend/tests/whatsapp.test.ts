import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb, createTestUser, createCategoryFor } from './helpers';

const app = createApp();
const VERIFY_TOKEN = 'fincontrol-verify';

describe('WhatsApp webhook', () => {
  let userId: string;

  beforeEach(async () => {
    await resetDb();
    const created = await createTestUser();
    userId = created.user.id;
    await createCategoryFor(userId, { name: 'Alimentação' });
  });

  it('verifica o webhook (estilo Meta)', async () => {
    const res = await request(app)
      .get('/api/whatsapp/webhook')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': VERIFY_TOKEN,
        'hub.challenge': '123456',
      });
    expect(res.status).toBe(200);
    expect(res.text).toBe('123456');
  });

  it('rejeita verificação com token errado', async () => {
    const res = await request(app)
      .get('/api/whatsapp/webhook')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'errado', 'hub.challenge': 'x' });
    expect(res.status).toBe(403);
  });

  it('registra gasto recebido via webhook (resolvendo por userId)', async () => {
    const res = await request(app)
      .post('/api/whatsapp/webhook')
      .send({ userId, text: 'gastei 30 no ifood' });

    expect(res.status).toBe(200);
    expect(res.body.data.handled).toBe(true);
    expect(res.body.data.reply).toContain('Anotado');

    const txs = await prisma.transaction.findMany({ where: { userId } });
    expect(txs).toHaveLength(1);
    expect(txs[0].amountCents).toBe(3000);
    expect(txs[0].source).toBe('WHATSAPP');
  });

  it('resolve o usuário pelo telefone (formato Twilio From/Body)', async () => {
    await prisma.user.update({ where: { id: userId }, data: { phone: '+5561988887777' } });

    const res = await request(app)
      .post('/api/whatsapp/webhook')
      .send({ From: 'whatsapp:+5561988887777', Body: 'gastei 25,50 no mercado' });

    expect(res.status).toBe(200);
    expect(res.body.data.handled).toBe(true);

    const txs = await prisma.transaction.findMany({ where: { userId } });
    expect(txs).toHaveLength(1);
    expect(txs[0].amountCents).toBe(2550);
  });

  it('não vincula número desconhecido', async () => {
    const res = await request(app)
      .post('/api/whatsapp/webhook')
      .send({ from: '+5500000000000', text: 'gastei 10 no ifood' });
    expect(res.status).toBe(200);
    expect(res.body.data.handled).toBe(false);
  });

  it('valida corpo sem texto (400)', async () => {
    const res = await request(app).post('/api/whatsapp/webhook').send({ userId });
    expect(res.status).toBe(400);
  });
});
