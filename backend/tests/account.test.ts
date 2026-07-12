import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb, createTestUser } from './helpers';

const app = createApp();

function sha256(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}

describe('Exclusão de conta (DELETE /api/auth/me)', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('exige autenticação', async () => {
    const res = await request(app).delete('/api/auth/me').send({ password: 'x' });
    expect(res.status).toBe(401);
  });

  it('recusa senha errada (401) e não apaga nada', async () => {
    const { token, user } = await createTestUser();
    const res = await request(app)
      .delete('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'senha-errada' });
    expect(res.status).toBe(401);
    expect(await prisma.user.findUnique({ where: { id: user.id } })).not.toBeNull();
  });

  it('apaga a conta e todos os dados em cascata com a senha correta', async () => {
    const { token, user } = await createTestUser();
    await prisma.transaction.create({
      data: { userId: user.id, description: 'Algo', amountCents: 1000, type: 'EXPENSE' },
    });

    const res = await request(app)
      .delete('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'senha123' });
    expect(res.status).toBe(204);

    expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
    expect(await prisma.transaction.count({ where: { userId: user.id } })).toBe(0);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'senha123' });
    expect(login.status).toBe(401);
  });
});

describe('Esqueci minha senha (forgot/reset)', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('POST /forgot responde 200 genérico para e-mail existente e inexistente', async () => {
    await createTestUser('existe@fincontrol.dev');
    const a = await request(app).post('/api/auth/forgot').send({ email: 'existe@fincontrol.dev' });
    const b = await request(app).post('/api/auth/forgot').send({ email: 'naoexiste@fincontrol.dev' });
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(a.body.data.message).toBe(b.body.data.message);

    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'existe@fincontrol.dev' } });
    expect(user.resetCodeHash).not.toBeNull();
    expect(user.resetCodeExpiresAt!.getTime()).toBeGreaterThan(Date.now());
  });

  it('redefine a senha com código válido e permite login com a nova', async () => {
    const { user } = await createTestUser('reset@fincontrol.dev');
    await prisma.user.update({
      where: { id: user.id },
      data: { resetCodeHash: sha256('123456'), resetCodeExpiresAt: new Date(Date.now() + 60000) },
    });

    const res = await request(app)
      .post('/api/auth/reset')
      .send({ email: 'reset@fincontrol.dev', code: '123456', newPassword: 'novaSenha9' });
    expect(res.status).toBe(200);

    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'reset@fincontrol.dev', password: 'senha123' });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'reset@fincontrol.dev', password: 'novaSenha9' });
    expect(newLogin.status).toBe(200);

    // Código não pode ser reutilizado.
    const again = await request(app)
      .post('/api/auth/reset')
      .send({ email: 'reset@fincontrol.dev', code: '123456', newPassword: 'outraSenha' });
    expect(again.status).toBe(400);
  });

  it('recusa código errado e código expirado', async () => {
    const { user } = await createTestUser('cod@fincontrol.dev');
    await prisma.user.update({
      where: { id: user.id },
      data: { resetCodeHash: sha256('123456'), resetCodeExpiresAt: new Date(Date.now() + 60000) },
    });
    const wrong = await request(app)
      .post('/api/auth/reset')
      .send({ email: 'cod@fincontrol.dev', code: '000000', newPassword: 'novaSenha9' });
    expect(wrong.status).toBe(400);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetCodeExpiresAt: new Date(Date.now() - 1000) },
    });
    const expired = await request(app)
      .post('/api/auth/reset')
      .send({ email: 'cod@fincontrol.dev', code: '123456', newPassword: 'novaSenha9' });
    expect(expired.status).toBe(400);
  });
});

describe('Verificação de e-mail', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('envia código e confirma o e-mail', async () => {
    const { token, user } = await createTestUser();
    const send = await request(app)
      .post('/api/auth/verify-email/send')
      .set('Authorization', `Bearer ${token}`);
    expect(send.status).toBe(200);

    // Substitui o código gerado por um conhecido para concluir o fluxo no teste.
    await prisma.user.update({
      where: { id: user.id },
      data: { verifyCodeHash: sha256('654321'), verifyCodeExpiresAt: new Date(Date.now() + 60000) },
    });

    const verify = await request(app)
      .post('/api/auth/verify-email')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: '654321' });
    expect(verify.status).toBe(200);
    expect(verify.body.data.user.emailVerifiedAt).not.toBeNull();

    // Reenviar depois de verificado é rejeitado.
    const resend = await request(app)
      .post('/api/auth/verify-email/send')
      .set('Authorization', `Bearer ${token}`);
    expect(resend.status).toBe(400);
  });

  it('recusa código de verificação errado', async () => {
    const { token, user } = await createTestUser();
    await prisma.user.update({
      where: { id: user.id },
      data: { verifyCodeHash: sha256('654321'), verifyCodeExpiresAt: new Date(Date.now() + 60000) },
    });
    const verify = await request(app)
      .post('/api/auth/verify-email')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: '111111' });
    expect(verify.status).toBe(400);
  });
});
