import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { currentMonth, monthRange } from '../src/lib/dates';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@fincontrol.dev';
const DEMO_PASSWORD = 'demo1234';

/** Data dentro do mês corrente, no dia informado (UTC). */
function dayOfThisMonth(day: number): Date {
  const { start } = monthRange(currentMonth());
  const d = new Date(start);
  d.setUTCDate(day);
  return d;
}

async function main() {
  // Idempotente: remove o usuário demo (cascade limpa tudo) e recria.
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      phone: '+5561999990000',
      name: 'Hudson (demo)',
      password: await bcrypt.hash(DEMO_PASSWORD, 10),
    },
  });

  const contaCorrente = await prisma.account.create({
    data: { userId: user.id, name: 'Nubank', type: 'CHECKING', institution: 'Nu', balanceCents: 255900 },
  });
  const cartao = await prisma.account.create({
    data: { userId: user.id, name: 'Cartão Nubank', type: 'CREDIT_CARD', institution: 'Nu', balanceCents: 0 },
  });

  const cats = {
    alimentacao: await prisma.category.create({
      data: { userId: user.id, name: 'Alimentação', icon: 'ti-tools-kitchen-2', color: '#f59e0b', type: 'EXPENSE', monthlyLimitCents: 80000 },
    }),
    transporte: await prisma.category.create({
      data: { userId: user.id, name: 'Transporte', icon: 'ti-car', color: '#3b82f6', type: 'EXPENSE', monthlyLimitCents: 80000 },
    }),
    moradia: await prisma.category.create({
      data: { userId: user.id, name: 'Moradia', icon: 'ti-home', color: '#8b5cf6', type: 'EXPENSE', monthlyLimitCents: 150000 },
    }),
    lazer: await prisma.category.create({
      data: { userId: user.id, name: 'Lazer', icon: 'ti-device-tv', color: '#ec4899', type: 'EXPENSE', monthlyLimitCents: 50000 },
    }),
    saude: await prisma.category.create({
      data: { userId: user.id, name: 'Saúde', icon: 'ti-heart', color: '#10b981', type: 'EXPENSE', monthlyLimitCents: 40000 },
    }),
    outros: await prisma.category.create({
      data: { userId: user.id, name: 'Outros', icon: 'ti-tag', color: '#6b7280', type: 'EXPENSE' },
    }),
    salario: await prisma.category.create({
      data: { userId: user.id, name: 'Salário', icon: 'ti-cash', color: '#16a34a', type: 'INCOME' },
    }),
  };

  type TxSeed = {
    description: string;
    amountCents: number;
    type: string;
    day: number;
    categoryId: string | null;
    accountId: string | null;
    source?: string;
  };

  const txs: TxSeed[] = [
    { description: 'Salário', amountCents: 480000, type: 'INCOME', day: 5, categoryId: cats.salario.id, accountId: contaCorrente.id },
    { description: 'Freelance', amountCents: 100000, type: 'INCOME', day: 12, categoryId: cats.salario.id, accountId: contaCorrente.id },
    { description: 'Aluguel', amountCents: 120000, type: 'EXPENSE', day: 5, categoryId: cats.moradia.id, accountId: contaCorrente.id },
    { description: 'Supermercado Extra', amountCents: 31200, type: 'EXPENSE', day: 8, categoryId: cats.alimentacao.id, accountId: cartao.id },
    { description: 'iFood', amountCents: 4290, type: 'EXPENSE', day: 10, categoryId: cats.alimentacao.id, accountId: cartao.id, source: 'WHATSAPP' },
    { description: 'iFood', amountCents: 5380, type: 'EXPENSE', day: 14, categoryId: cats.alimentacao.id, accountId: cartao.id, source: 'WHATSAPP' },
    { description: 'Padaria São João', amountCents: 8750, type: 'EXPENSE', day: 16, categoryId: cats.alimentacao.id, accountId: contaCorrente.id, source: 'WHATSAPP' },
    { description: 'iFood', amountCents: 4290, type: 'EXPENSE', day: 18, categoryId: cats.alimentacao.id, accountId: cartao.id, source: 'WHATSAPP' },
    { description: 'Posto Shell', amountCents: 12000, type: 'EXPENSE', day: 9, categoryId: cats.transporte.id, accountId: cartao.id },
    { description: 'Uber', amountCents: 2400, type: 'EXPENSE', day: 15, categoryId: cats.transporte.id, accountId: cartao.id, source: 'WHATSAPP' },
    { description: 'Uber', amountCents: 3600, type: 'EXPENSE', day: 20, categoryId: cats.transporte.id, accountId: cartao.id, source: 'WHATSAPP' },
    { description: 'Netflix', amountCents: 3990, type: 'EXPENSE', day: 7, categoryId: cats.lazer.id, accountId: cartao.id, source: 'WHATSAPP' },
    { description: 'Cinema', amountCents: 6000, type: 'EXPENSE', day: 17, categoryId: cats.lazer.id, accountId: contaCorrente.id },
    { description: 'Farmácia', amountCents: 8500, type: 'EXPENSE', day: 11, categoryId: cats.saude.id, accountId: cartao.id },
    { description: 'Consulta', amountCents: 6000, type: 'EXPENSE', day: 19, categoryId: cats.saude.id, accountId: contaCorrente.id },
    { description: 'Presente', amountCents: 10300, type: 'EXPENSE', day: 21, categoryId: cats.outros.id, accountId: cartao.id },
  ];

  for (const t of txs) {
    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: t.accountId,
        categoryId: t.categoryId,
        description: t.description,
        amountCents: t.amountCents,
        type: t.type,
        date: dayOfThisMonth(t.day),
        source: t.source ?? 'APP',
      },
    });
  }

  const month = currentMonth();
  for (const [catKey, limitCents] of [
    ['alimentacao', 80000],
    ['transporte', 80000],
    ['lazer', 50000],
    ['saude', 40000],
  ] as const) {
    await prisma.budget.create({
      data: { userId: user.id, categoryId: cats[catKey].id, month, limitCents },
    });
  }

  // Alerta de exemplo (Alimentação ~82% do limite).
  await prisma.alert.create({
    data: {
      userId: user.id,
      categoryId: cats.alimentacao.id,
      month,
      threshold: 0.8,
      spentCents: 65600,
      limitCents: 80000,
      message: 'Você atingiu 82% do limite em Alimentação este mês.',
    },
  });

  // Histórico de chat de exemplo.
  await prisma.chatMessage.createMany({
    data: [
      { userId: user.id, role: 'USER', content: 'gastei 42,90 no iFood', channel: 'WHATSAPP' },
      { userId: user.id, role: 'ASSISTANT', content: 'Anotado! R$ 42,90 em Alimentação.', channel: 'WHATSAPP' },
    ],
  });

  console.log('Seed concluído.');
  console.log('Login demo -> email:', DEMO_EMAIL, '| senha:', DEMO_PASSWORD);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
