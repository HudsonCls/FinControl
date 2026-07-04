import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { resetDb, createTestUser } from './helpers';

// Arquivo isolado (Vitest dá módulo/estado próprio por arquivo): o contador do
// rate limiter aqui não interfere nas chamadas de login de outros arquivos.
const app = createApp();

describe('Rate limit de login', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('bloqueia após exceder o limite de tentativas (LOGIN_RATE_LIMIT_MAX=5 em teste)', async () => {
    await createTestUser('ratelimit@fincontrol.dev');

    let lastStatus = 0;
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ratelimit@fincontrol.dev', password: 'errada' });
      lastStatus = res.status;
    }
    // As 5 primeiras (dentro do limite) devem falhar por credencial, não por rate limit.
    expect(lastStatus).toBe(401);

    const blocked = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ratelimit@fincontrol.dev', password: 'errada' });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
  });
});
