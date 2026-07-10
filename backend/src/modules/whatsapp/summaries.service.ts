import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { formatBRL } from '../../lib/money';
import { sendWhatsapp } from './twilioAdapter';

/**
 * Resumos automáticos por WhatsApp (diário/semanal/mensal).
 * Períodos calculados no fuso de Brasília — fixo em -03:00, já que o Brasil
 * não adota horário de verão desde 2019.
 */
const SP_OFFSET_MS = 3 * 60 * 60 * 1000;

interface SpParts {
  year: number;
  month: number; // 0-11
  day: number;
  hour: number;
  weekday: number; // 0=domingo, 1=segunda...
}

function spParts(d: Date): SpParts {
  const local = new Date(d.getTime() - SP_OFFSET_MS);
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth(),
    day: local.getUTCDate(),
    hour: local.getUTCHours(),
    weekday: local.getUTCDay(),
  };
}

/** Instante UTC correspondente à meia-noite (00:00) de Brasília do dia dado. */
function spMidnightUtc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day) + SP_OFFSET_MS);
}

/** "dd/mm" no fuso de Brasília. */
function fmtDay(d: Date): string {
  const p = spParts(d);
  return `${String(p.day).padStart(2, '0')}/${String(p.month + 1).padStart(2, '0')}`;
}

export interface DuePeriod {
  start: Date; // inclusive
  end: Date; // exclusivo; também marca o início da janela de envio atual
  label: string;
}

/**
 * Decide se um resumo está "na hora" de ser enviado agora, e qual período cobre.
 * - DAILY: todo dia, cobrindo ONTEM.
 * - WEEKLY: às segundas, cobrindo a semana anterior (seg–dom).
 * - MONTHLY: no dia 1º, cobrindo o mês anterior.
 * Nada é enviado antes de SUMMARY_HOUR (hora de Brasília).
 */
export function computeDuePeriod(frequency: string, now: Date): DuePeriod | null {
  const p = spParts(now);
  if (p.hour < env.SUMMARY_HOUR) return null;
  const todayStart = spMidnightUtc(p.year, p.month, p.day);

  if (frequency === 'DAILY') {
    const start = new Date(todayStart.getTime() - 86400000);
    return { start, end: todayStart, label: `Resumo de ontem (${fmtDay(start)})` };
  }
  if (frequency === 'WEEKLY') {
    if (p.weekday !== 1) return null;
    const start = new Date(todayStart.getTime() - 7 * 86400000);
    const lastDay = new Date(todayStart.getTime() - 86400000);
    return { start, end: todayStart, label: `Resumo da semana (${fmtDay(start)} a ${fmtDay(lastDay)})` };
  }
  if (frequency === 'MONTHLY') {
    if (p.day !== 1) return null;
    const start = spMidnightUtc(p.year, p.month - 1, 1);
    const monthName = start.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo',
    });
    return { start, end: todayStart, label: `Resumo de ${monthName}` };
  }
  return null;
}

/** Monta o texto do resumo do período (somas em centavos; formata na borda). */
export async function buildSummaryText(userId: string, period: DuePeriod): Promise<string> {
  const txs = await prisma.transaction.findMany({
    where: { userId, date: { gte: period.start, lt: period.end } },
    include: { category: true },
  });

  if (!txs.length) return `📊 ${period.label}: nenhum lançamento no período.`;

  let expenseCents = 0;
  let incomeCents = 0;
  let expenseCount = 0;
  const byCategory = new Map<string, number>();

  for (const t of txs) {
    if (t.type === 'INCOME') {
      incomeCents += t.amountCents;
      continue;
    }
    expenseCents += t.amountCents;
    expenseCount += 1;
    const key = t.category?.name ?? 'Sem categoria';
    byCategory.set(key, (byCategory.get(key) ?? 0) + t.amountCents);
  }

  const top = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, cents]) => `${name} ${formatBRL(cents)}`)
    .join(', ');

  let msg = `📊 ${period.label}: gastos ${formatBRL(expenseCents)} em ${expenseCount} lançamento(s)`;
  if (incomeCents > 0) msg += `, receitas ${formatBRL(incomeCents)}`;
  if (top) msg += `. Top: ${top}`;
  return msg + '.';
}

export interface DispatchResult {
  checked: number;
  sent: number;
  details: Array<{ userId: string; frequency: string; message: string }>;
}

/**
 * Envia os resumos devidos. Idempotente por período: se summaryLastSentAt já é
 * posterior ao início da janela atual (period.end), pula. Deve ser chamado por
 * um ping externo periódico (ex.: cron-job.org a cada 30min) — que de quebra
 * mantém a instância free do Render acordada.
 */
export async function dispatchDueSummaries(now: Date = new Date()): Promise<DispatchResult> {
  const users = await prisma.user.findMany({
    where: {
      summaryFrequency: { in: ['DAILY', 'WEEKLY', 'MONTHLY'] },
      phone: { not: null },
    },
  });

  const details: DispatchResult['details'] = [];
  for (const u of users) {
    const period = computeDuePeriod(u.summaryFrequency, now);
    if (!period) continue;
    if (u.summaryLastSentAt && u.summaryLastSentAt >= period.end) continue;

    const message = await buildSummaryText(u.id, period);
    await sendWhatsapp(u.phone!, message);
    // Registra no histórico do chat, para o resumo aparecer também no app.
    await prisma.chatMessage.create({
      data: { userId: u.id, role: 'ASSISTANT', content: message, channel: 'WHATSAPP' },
    });
    await prisma.user.update({
      where: { id: u.id },
      data: { summaryLastSentAt: now },
    });
    details.push({ userId: u.id, frequency: u.summaryFrequency, message });
  }

  return { checked: users.length, sent: details.length, details };
}
