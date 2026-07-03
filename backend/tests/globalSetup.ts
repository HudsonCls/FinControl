import { execSync } from 'node:child_process';

/**
 * Antes da suíte: recria o banco SQLite de teste a partir do schema.
 * Usa um arquivo separado (test.db) para não tocar no dev.db.
 */
export default function setup(): void {
  const databaseUrl = 'file:./test.db';
  process.env.DATABASE_URL = databaseUrl;
  execSync('npx prisma db push --skip-generate --force-reset', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
