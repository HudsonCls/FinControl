export type TxType = 'EXPENSE' | 'INCOME';
export type TxSource = 'APP' | 'WHATSAPP' | 'IMPORT';
export type AccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'CASH';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TxType;
  monthlyLimit: number | null;
  createdAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  institution?: string | null;
  balance: number;
  createdAt: string;
}

export interface CategoryRef {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TxType;
  date: string;
  source: TxSource;
  notes: string | null;
  category: CategoryRef | null;
  account: { id: string; name: string } | null;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; limit: number; offset: number };
}

export interface BudgetStatus {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  limit: number;
  spent: number;
  pct: number;
  remaining: number;
}

export interface Alert {
  id: string;
  categoryId: string;
  month: string;
  threshold: number;
  spentCents: number;
  limitCents: number;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface SummaryCategory {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  total: number;
  pct: number;
}

export interface MonthlySummary {
  month: string;
  totalExpense: number;
  totalIncome: number;
  balance: number;
  viaWhatsappCount: number;
  byCategory: SummaryCategory[];
  daily: { date: string; expense: number }[];
}

export interface SearchResult {
  total: number;
  count: number;
  transactions: Transaction[];
}

export type ChatRole = 'USER' | 'ASSISTANT';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  channel: 'APP' | 'WHATSAPP';
  transactionId: string | null;
  createdAt: string;
}

export interface ChatResult {
  reply: string;
  message: ChatMessage;
  transaction?: Transaction;
}
