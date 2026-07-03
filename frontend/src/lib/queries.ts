import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  MonthlySummary,
  Transaction,
  Paginated,
  Category,
  Account,
  BudgetStatus,
  Alert,
  ChatMessage,
  ChatResult,
  SearchResult,
} from '@/lib/types';

export interface TxFilters {
  categoryId?: string;
  type?: string;
  source?: string;
  accountId?: string;
  from?: string;
  to?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface SearchParams {
  category?: string;
  q?: string;
  from?: string;
  to?: string;
  type?: string;
  month?: string;
}

/** Invalida tudo que depende de transações (dashboard, listas, orçamentos, alertas). */
function invalidateMoney(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['summary'] });
  qc.invalidateQueries({ queryKey: ['transactions'] });
  qc.invalidateQueries({ queryKey: ['budgets'] });
  qc.invalidateQueries({ queryKey: ['alerts'] });
  qc.invalidateQueries({ queryKey: ['search'] });
}

// ---------- Queries ----------

export function useSummary(month: string) {
  return useQuery({
    queryKey: ['summary', month],
    queryFn: async () =>
      (await api.get('/reports/summary', { params: { month } })).data.data as MonthlySummary,
  });
}

export function useTransactions(filters: TxFilters = {}) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () =>
      (await api.get('/transactions', { params: filters })).data as Paginated<Transaction>,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/categories')).data.data as Category[],
  });
}

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => (await api.get('/accounts')).data.data as Account[],
  });
}

export function useBudgets(month: string) {
  return useQuery({
    queryKey: ['budgets', month],
    queryFn: async () =>
      (await api.get('/budgets', { params: { month } })).data.data as BudgetStatus[],
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: async () => (await api.get('/alerts')).data.data as Alert[],
  });
}

export function useChatHistory() {
  return useQuery({
    queryKey: ['chat'],
    queryFn: async () => (await api.get('/chat/messages')).data.data as ChatMessage[],
  });
}

export function useSearch(params: SearchParams, enabled = true) {
  return useQuery({
    queryKey: ['search', params],
    enabled,
    queryFn: async () =>
      (await api.get('/reports/search', { params })).data.data as SearchResult,
  });
}

// ---------- Mutations ----------

export function useSendChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) =>
      (await api.post('/chat/messages', { content })).data.data as ChatResult,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat'] });
      invalidateMoney(qc);
    },
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      (await api.post('/transactions', body)).data.data as Transaction,
    onSuccess: () => invalidateMoney(qc),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/transactions/${id}`),
    onSuccess: () => invalidateMoney(qc),
  });
}

export function useSetBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { categoryId: string; month: string; limit: number }) =>
      (await api.post('/budgets', body)).data.data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      (await api.post('/categories', body)).data.data as Category,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      (await api.post('/accounts', body)).data.data as Account,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/accounts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useMarkAlertRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.patch(`/alerts/${id}`, { read: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}
