import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { keywordCategoryName } from '../src/modules/chat/categorizer';
import { resetDb, createTestUser, createCategoryFor } from './helpers';

const app = createApp();
const DEFAULT_NAMES = ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Outros', 'Salário'];

describe('keywordCategoryName (unidade)', () => {
  it('NÃO classifica "gastei" como Moradia (bug do "gas" dentro de GAStei)', () => {
    expect(keywordCategoryName('gastei 50 em algo aleatorio', DEFAULT_NAMES)).toBeNull();
  });

  it('classifica "conta de gas" como Moradia (palavra inteira)', () => {
    expect(keywordCategoryName('paguei a conta de gas', DEFAULT_NAMES)).toBe('Moradia');
  });

  it('classifica os novos termos de Alimentação', () => {
    expect(keywordCategoryName('comprei um chocolate', DEFAULT_NAMES)).toBe('Alimentação');
    expect(keywordCategoryName('gastei num bolo', DEFAULT_NAMES)).toBe('Alimentação');
    expect(keywordCategoryName('paçoca na feira', DEFAULT_NAMES)).toBe('Alimentação');
    expect(keywordCategoryName('um sorvete', DEFAULT_NAMES)).toBe('Alimentação');
  });

  it('reconhece o nome direto da categoria', () => {
    expect(keywordCategoryName('quanto gastei em alimentação?', DEFAULT_NAMES)).toBe('Alimentação');
  });

  it('não confunde o valor 99 com Transporte', () => {
    expect(keywordCategoryName('gastei 99 num lugar', DEFAULT_NAMES)).toBeNull();
  });

  it('só retorna categoria que o usuário realmente possui', () => {
    expect(keywordCategoryName('conta de gas', ['Alimentação', 'Outros'])).toBeNull();
  });
});

describe('categorizeExpense via chat (integração, sem IA)', () => {
  let token: string;
  let userId: string;

  beforeEach(async () => {
    await resetDb();
    const created = await createTestUser();
    token = created.token;
    userId = created.user.id;
    const cats: Array<[string, string]> = [
      ['Moradia', 'EXPENSE'],
      ['Alimentação', 'EXPENSE'],
      ['Transporte', 'EXPENSE'],
      ['Outros', 'EXPENSE'],
      ['Salário', 'INCOME'],
    ];
    for (const [name, type] of cats) {
      await createCategoryFor(userId, { name, type });
    }
  });

  it('gasto sem palavra-chave cai em Outros (não em Moradia)', async () => {
    const res = await request(app)
      .post('/api/chat/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'gastei 50 em uma coisa qualquer' });
    expect(res.status).toBe(201);
    expect(res.body.data.transaction.category.name).toBe('Outros');
  });

  it('gasto com "chocolate" cai em Alimentação', async () => {
    const res = await request(app)
      .post('/api/chat/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'comprei um chocolate por 8' });
    expect(res.status).toBe(201);
    expect(res.body.data.transaction.category.name).toBe('Alimentação');
  });

  it('gasto no "ifood" cai em Alimentação (não vira Salário/receita)', async () => {
    const res = await request(app)
      .post('/api/chat/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'gastei 30 no ifood' });
    expect(res.status).toBe(201);
    expect(res.body.data.transaction.category.name).toBe('Alimentação');
    expect(res.body.data.transaction.type).toBe('EXPENSE');
  });
});
