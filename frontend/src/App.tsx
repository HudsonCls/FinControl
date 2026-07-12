import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui';
import LoginPage from '@/pages/LoginPage';
import { TermsPage, PrivacyPage } from '@/pages/LegalPages';
import DashboardPage from '@/pages/DashboardPage';
import TransactionsPage from '@/pages/TransactionsPage';
import SearchPage from '@/pages/SearchPage';
import ChatPage from '@/pages/ChatPage';
import BudgetsPage from '@/pages/BudgetsPage';
import CategoriesPage from '@/pages/CategoriesPage';
import AccountsPage from '@/pages/AccountsPage';
import AlertsPage from '@/pages/AlertsPage';
import { type ReactNode } from 'react';

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid h-screen place-items-center"><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/termos" element={<TermsPage />} />
      <Route path="/privacidade" element={<PrivacyPage />} />
      <Route path="/" element={<Protected><DashboardPage /></Protected>} />
      <Route path="/transacoes" element={<Protected><TransactionsPage /></Protected>} />
      <Route path="/busca" element={<Protected><SearchPage /></Protected>} />
      <Route path="/orcamentos" element={<Protected><BudgetsPage /></Protected>} />
      <Route path="/chat" element={<Protected><ChatPage /></Protected>} />
      <Route path="/categorias" element={<Protected><CategoriesPage /></Protected>} />
      <Route path="/contas" element={<Protected><AccountsPage /></Protected>} />
      <Route path="/alertas" element={<Protected><AlertsPage /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
