// Gera prisma/schema.prod.prisma a partir do schema de dev (SQLite), trocando
// apenas o bloco datasource para PostgreSQL (Supabase) com directUrl.
// Os modelos são idênticos — assim dev/testes continuam em SQLite sem divergência.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'prisma', 'schema.prisma'), 'utf8');

const pgDatasource = `datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}`;

const out = src.replace(/datasource db \{[\s\S]*?\n\}/, pgDatasource);

if (!out.includes('postgresql')) {
  console.error('Falha: bloco datasource não encontrado em schema.prisma');
  process.exit(1);
}

writeFileSync(join(root, 'prisma', 'schema.prod.prisma'), out);
console.log('prisma/schema.prod.prisma gerado (PostgreSQL).');
