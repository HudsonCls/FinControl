import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/globalSetup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./test.db',
      JWT_SECRET: 'test-secret-0123456789',
      JWT_EXPIRES_IN: '1h',
      // Baixo o suficiente para testar o limite sem esperar 15min reais;
      // confortavelmente acima do nº de chamadas de login usadas nos outros testes.
      LOGIN_RATE_LIMIT_MAX: '5',
      LOGIN_RATE_LIMIT_WINDOW_MS: '60000',
    },
    // Banco SQLite único compartilhado: evita corridas rodando os arquivos em sequência.
    fileParallelism: false,
    pool: 'forks',
  },
});
