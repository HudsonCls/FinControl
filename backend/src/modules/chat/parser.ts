/**
 * Parser de linguagem natural (pt-BR) para mensagens financeiras.
 * Determinístico — funciona sem IA. A IA (quando há chave) só refina a categorização.
 */

export type Intent = 'ADD_EXPENSE' | 'ADD_INCOME' | 'QUERY_SPENT' | 'SET_LIMIT' | 'UNKNOWN';

export interface ParsedMessage {
  intent: Intent;
  amountCents: number | null;
  description: string;
  text: string;
}

/** Remove acentos e baixa a caixa, para comparações robustas. */
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Extrai um valor monetário em centavos. Aceita "R$ 42,90", "42,90", "42.90",
 * "1.234,56", "42 reais", "150".
 */
export function parseAmountCents(text: string): number | null {
  const match = text.match(
    /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/i,
  );
  if (!match) return null;

  let raw = match[1];
  if (raw.includes('.') && raw.includes(',')) {
    // 1.234,56 -> ponto = milhar, vírgula = decimal
    raw = raw.replace(/\./g, '').replace(',', '.');
  } else if (raw.includes(',')) {
    // 42,90 -> vírgula = decimal
    raw = raw.replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
    // 1.234 -> ponto = milhar (sem decimais)
    raw = raw.replace(/\./g, '');
  }

  const value = parseFloat(raw);
  if (Number.isNaN(value)) return null;
  return Math.round(value * 100);
}

function detectIntent(text: string, hasAmount: boolean): Intent {
  const t = normalizeText(text);

  if (/\bquanto\b/.test(t) && /gast/.test(t)) return 'QUERY_SPENT';
  if (/(limite|orcamento)/.test(t) && hasAmount) return 'SET_LIMIT';
  if (/(recebi|ganhei|salario|entrou|recebimento|deposito)/.test(t) && hasAmount) {
    return 'ADD_INCOME';
  }
  if (hasAmount) return 'ADD_EXPENSE';
  if (/(quanto|gast|saldo|resumo|relatorio|extrato)/.test(t)) return 'QUERY_SPENT';
  return 'UNKNOWN';
}

const STOP_WORDS = new Set([
  'gastei', 'gasto', 'gastos', 'paguei', 'pagar', 'comprei', 'comprar', 'recebi',
  'ganhei', 'foi', 'de', 'do', 'da', 'no', 'na', 'em', 'com', 'um', 'uma', 'os',
  'as', 'reais', 'real', 'rs', 'hoje', 'ontem', 'agora', 'pra', 'para', 'meu', 'minha',
]);

/** Limpa a mensagem para extrair a descrição (estabelecimento/origem). */
function cleanDescription(text: string): string {
  let s = text.replace(/(?:r\$\s*)?\d[\d.,]*\s*(reais|real)?/i, ' ');
  const words = s
    .split(/\s+/)
    .filter((w) => w && !STOP_WORDS.has(normalizeText(w)));
  s = words.join(' ').trim();
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function parse(text: string): ParsedMessage {
  const amountCents = parseAmountCents(text);
  const intent = detectIntent(text, amountCents !== null);
  return {
    intent,
    amountCents,
    description: cleanDescription(text),
    text,
  };
}
