import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb, createTestUser, createCategoryFor } from './helpers';
import {
  computeDuePeriod,
  dispatchDueSummaries,
} from '../src/modules/whatsapp/summaries.service';

const app = createApp();

// Datas fixas (2026-03-09 é segunda-feira; 03-10, terça).
// 13:00Z = 10:00 em Brasília (>= SUMMARY_HOUR padrão 8).
const TUE_10H_SP = new Date('2026-03-10T13:00:00Z');
const MON_10H_SP = new Date('2026-03-09T13:00:00Z');
const DAY1_10H_SP = new Date('2026-03-01T13:00:00Z');
const TUE_7H_SP = new Date('2026-03-10T10:00:00Z'); // 07:00 SP, antes da hora de envio

describe('computeDuePeriod', () => {
  it('não envia antes de SUMMARY_HOUR (hora de Brasília)', () => {
    expect(computeDuePeriod('DAILY', TUE_7H_SP)).toBeNull();
  });

  it('DAILY cobre o dia anterior (meia-noite a meia-noite de Brasília)', () => {
    const p = computeDuePeriod('DAILY', TUE_10H_SP)!;
    expect(p.start.toISOString()).toBe('2026-03-09T03:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-03-10T03:00:00.000Z');
    expect(p.label).toContain('09/03');
  });

  it('WEEKLY só dispara na segunda, cobrindo a semana anterior', () => {
    expect(computeDuePeriod('WEEKLY', TUE_10H_SP)).toBeNull();
    const p = computeDuePeriod('WEEKLY', MON_10H_SP)!;
    expect(p.start.toISOString()).toBe('2026-03-02T03:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-03-09T03:00:00.000Z');
    expect(p.label).toContain('02/03 a 08/03');
  });

  it('MONTHLY só dispara no dia 1º, cobrindo o mês anterior', () => {
    expect(computeDuePeriod('MONTHLY', TUE_10H_SP)).toBeNull();
    const p = computeDuePeriod('MONTHLY', DAY1_10H_SP)!;
    expect(p.start.toISOString()).toBe('2026-02-01T03:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-03-01T03:00:00.000Z');
    expect(p.label.toLowerCase()).toContain('fevereiro');
  });
});

describe('dispatchDueSummaries', () => {
  let userId: string;

  beforeEach(async () => {
    await resetDb();
    const created = await createTestUser();
    userId = created.user.id;
    await prisma.user.update({
      where: { id: userId },
      data: { phone: '+5561999990000', summaryFrequency: 'DAILY' },
    });
    const cat = await createCategoryFor(userId, { name: 'Alimentação' });
    // Ontem (09/03 em Brasília): dois gastos. Hoje (10/03): um gasto — fora do resumo.
    await prisma.transaction.createMany({
      data: [
        { userId, categoryId: cat.id, description: 'iFood', amountCents: 4000, type: 'EXPENSE', date: new Date('2026-03-09T15:00:00Z') },
        { userId, categoryId: cat.id, description: 'Padaria', amountCents: 1000, type: 'EXPENSE', date: new Date('2026-03-09T20:00:00Z') },
        { userId, categoryId: cat.id, description: 'Hoje', amountCents: 9900, type: 'EXPENSE', date: new Date('2026-03-10T12:00:00Z') },
      ],
    });
  });

  it('envia o resumo diário com o total de ontem e registra no histórico', async () => {
    const result = await dispatchDueSummaries(TUE_10H_SP);
    expect(result.sent).toBe(1);
    const msg = result.details[0].message;
    expect(msg).toContain('50,00'); // 40 + 10, sem o gasto de hoje
    expect(msg).toContain('2 lançamento');
    expect(msg).toContain('Alimentação');

    const history = await prisma.chatMessage.findMany({ where: { userId } });
    expect(history).toHaveLength(1);
    expect(history[0].channel).toBe('WHATSAPP');
  });

  it('é idempotente: segunda chamada no mesmo dia não reenvia', async () => {
    await dispatchDueSummaries(TUE_10H_SP);
    const again = await dispatchDueSummaries(new Date('2026-03-10T18:00:00Z'));
    expect(again.sent).toBe(0);
  });

  it('volta a enviar no dia seguinte', async () => {
    await dispatchDueSummaries(TUE_10H_SP);
    const nextDay = await dispatchDueSummaries(new Date('2026-03-11T13:00:00Z'));
    expect(nextDay.sent).toBe(1);
  });

  it('ignora usuário sem telefone vinculado', async () => {
    await prisma.user.update({ where: { id: userId }, data: { phone: null } });
    const result = await dispatchDueSummaries(TUE_10H_SP);
    expect(result.checked).toBe(0);
    expect(result.sent).toBe(0);
  });

  it('endpoint de despacho responde com contagem', async () => {
    const res = await request(app).get('/api/whatsapp/dispatch-summaries');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('checked');
    expect(res.body.data).toHaveProperty('sent');
  });
});

describe('assinatura de resumo via chat', () => {
  let token: string;
  let userId: string;

  beforeEach(async () => {
    await resetDb();
    const created = await createTestUser();
    token = created.token;
    userId = created.user.id;
  });

  it('"resumo semanal" assina e avisa que o WhatsApp não está vinculado', async () => {
    const res = await request(app)
      .post('/api/chat/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'quero resumo semanal' });
    expect(res.status).toBe(201);
    expect(res.body.data.reply).toContain('semanal');
    expect(res.body.data.reply).toContain('vinculado');

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.summaryFrequency).toBe('WEEKLY');
  });

  it('"resumo diário" assina DAILY sem aviso quando há telefone', async () => {
    await prisma.user.update({ where: { id: userId }, data: { phone: '+5561988887777' } });
    const res = await request(app)
      .post('/api/chat/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'resumo diário' });
    expect(res.status).toBe(201);
    expect(res.body.data.reply).toContain('diário');
    expect(res.body.data.reply).not.toContain('vinculado');

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.summaryFrequency).toBe('DAILY');
  });

  it('"cancelar resumo" volta para NONE (e não apaga transações)', async () => {
    await prisma.transaction.create({
      data: { userId, description: 'Algo', amountCents: 1000, type: 'EXPENSE' },
    });
    await request(app)
      .post('/api/chat/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'resumo mensal' });
    const res = await request(app)
      .post('/api/chat/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'cancelar resumo' });
    expect(res.status).toBe(201);
    expect(res.body.data.reply).toContain('cancelados');

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.summaryFrequency).toBe('NONE');
    // Garante que não colidiu com DELETE_LAST:
    expect(await prisma.transaction.count({ where: { userId } })).toBe(1);
  });

  it('"resumo" sozinho continua sendo consulta imediata do mês', async () => {
    const res = await request(app)
      .post('/api/chat/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'resumo' });
    expect(res.status).toBe(201);
    expect(res.body.data.reply).toContain('gastos');
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.summaryFrequency).toBe('NONE');
  });
});
