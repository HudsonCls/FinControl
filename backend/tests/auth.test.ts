import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { resetDb, createTestUser } from './helpers';

const app = createApp();

describe('Auth API', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('registra um usuário e retorna token sem senha', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'novo@fincontrol.dev',
      password: 'senha123',
      name: 'Novo Usuário',
      phone: '+5511999998888',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeDefined();
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.data.user).toMatchObject({
      email: 'novo@fincontrol.dev',
      name: 'Novo Usuário',
      phone: '+5511999998888',
    });
    expect(res.body.data.user.id).toBeDefined();
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('rejeita payload inválido', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'nao-eh-email', password: '123', name: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('impede e-mail duplicado', async () => {
    const payload = {
      email: 'dup@fincontrol.dev',
      password: 'senha123',
      name: 'Duplicado',
    };
    await request(app).post('/api/auth/register').send(payload);
    const res = await request(app).post('/api/auth/register').send(payload);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('faz login com credenciais válidas', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'login@fincontrol.dev',
      password: 'senha123',
      name: 'Login User',
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@fincontrol.dev', password: 'senha123' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('login@fincontrol.dev');
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('recusa login com senha errada', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'senha@fincontrol.dev',
      password: 'senha123',
      name: 'Senha User',
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'senha@fincontrol.dev', password: 'errada' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('recusa login de usuário inexistente', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'naoexiste@fincontrol.dev', password: 'senha123' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('retorna o usuário atual em /me com token', async () => {
    const { user, token } = await createTestUser();
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(user.id);
    expect(res.body.data.user.email).toBe(user.email);
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('exige autenticação em /me', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('atualiza nome e telefone via PATCH /me, normalizando o telefone', async () => {
    const { token } = await createTestUser();
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Novo Nome', phone: '+55 (11) 99999-8888' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Novo Nome');
    expect(res.body.data.user.phone).toBe('+5511999998888');
  });

  it('rejeita telefone em formato inválido', async () => {
    const { token } = await createTestUser();
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: 'abc' });
    expect(res.status).toBe(400);
  });

  it('impede vincular telefone já usado por outra conta', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'dono@fincontrol.dev',
      password: 'senha123',
      name: 'Dono',
      phone: '+5511988887777',
    });
    const { token } = await createTestUser('outro@fincontrol.dev');
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '+5511988887777' });
    expect(res.status).toBe(409);
  });

  it('permite desvincular o telefone enviando null', async () => {
    const { token } = await createTestUser('comfone@fincontrol.dev');
    await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '+5511977776666' });
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: null });
    expect(res.status).toBe(200);
    expect(res.body.data.user.phone).toBeNull();
  });

  it('exige autenticação em PATCH /me', async () => {
    const res = await request(app).patch('/api/auth/me').send({ name: 'X' });
    expect(res.status).toBe(401);
  });
});
