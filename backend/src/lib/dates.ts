/** Helpers de mês no formato "YYYY-MM" (sempre em UTC, determinístico). */

export function currentMonth(d: Date = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Intervalo [start, end) do mês: do dia 1 ao dia 1 do mês seguinte. */
export function monthRange(month: string): { start: Date; end: Date } {
  const [year, mon] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, mon - 1, 1));
  const end = new Date(Date.UTC(year, mon, 1));
  return { start, end };
}

export function isValidMonth(month: string): boolean {
  return /^\d{4}-\d{2}$/.test(month);
}

/**
 * Dias restantes (incluindo hoje) até o fim do mês informado, contados a
 * partir de `now`. Retorna 0 se `month` não for o mês corrente de `now`
 * (não faz sentido calcular "ritmo de gasto" para um mês passado/futuro).
 */
export function daysRemainingInMonth(month: string, now: Date = new Date()): number {
  if (month !== currentMonth(now)) return 0;
  const { end } = monthRange(month);
  const msPerDay = 86400000;
  return Math.max(Math.ceil((end.getTime() - now.getTime()) / msPerDay), 0);
}

/** "YYYY-MM-DD" em UTC, para séries diárias. */
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
