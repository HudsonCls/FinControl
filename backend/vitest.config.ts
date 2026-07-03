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
    },
    // Banco SQLite único compartilhado: evita corridas rodando os arquivos em sequência.
    fileParallelism: false,
    pool: 'forks',
  },
});
