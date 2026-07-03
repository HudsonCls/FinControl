import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';
import { signToken } from '../src/lib/jwt';

/** Limpa todas as tabelas respeitando as foreign keys. */
export async function resetDb(): Promise<void> {
  await prisma.alert.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.category.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
}

/** Cria um usuário de teste e devolve o usuário + um JWT válido. */
export async function createTestUser(email = 'test@fincontrol.dev') {
  const user = await prisma.user.create({
    data: {
      email,
      name: 'Usuário Teste',
      password: await bcrypt.hash('senha123', 4),
    },
  });
  return { user, token: signToken(user.id) };
}

/** Cria uma categoria diretamente no banco (atalho para montar cenários de teste). */
export async function createCategoryFor(
  userId: string,
  overrides: Partial<{
    name: string;
    type: string;
    icon: string;
    color: string;
    monthlyLimitCents: number | null;
  }> = {},
) {
  return prisma.category.create({
    data: {
      userId,
      name: overrides.name ?? 'Alimentação',
      type: overrides.type ?? 'EXPENSE',
      icon: overrides.icon ?? 'ti-tools-kitchen-2',
      color: overrides.color ?? '#f59e0b',
      monthlyLimitCents: overrides.monthlyLimitCents ?? null,
    },
  });
}
