import { AlertTriangle, Check, BellOff } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, Button, Spinner, EmptyState } from '@/components/ui';
import { formatBRL, formatDate, monthLabel } from '@/lib/format';
import { useAlerts, useMarkAlertRead } from '@/lib/queries';

export default function AlertsPage() {
  const alerts = useAlerts();
  const markRead = useMarkAlertRead();

  return (
    <Layout title="Alertas">
      {alerts.isLoading ? (
        <Spinner />
      ) : alerts.data?.length ? (
        <div className="mx-auto max-w-2xl space-y-2.5">
          {alerts.data.map((a) => (
            <Card
              key={a.id}
              className={`flex items-center gap-3 p-4 ${a.read ? 'opacity-60' : 'border-amber-200 bg-amber-50'}`}
            >
              <div
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                  a.read ? 'bg-slate-100 text-slate-400' : 'bg-amber-100 text-amber-600'
                }`}
              >
                <AlertTriangle size={17} />
              </div>
              <div className="flex-1">
                <div className="text-sm text-slate-700">{a.message}</div>
                <div className="mt-0.5 text-[11px] text-slate-400">
                  {formatBRL(a.spentCents / 100)} de {formatBRL(a.limitCents / 100)} ·{' '}
                  <span className="capitalize">{monthLabel(a.month)}</span> · {formatDate(a.createdAt)}
                </div>
              </div>
              {!a.read && (
                <Button onClick={() => markRead.mutate(a.id)} loading={markRead.isPending && markRead.variables === a.id}>
                  <Check size={14} /> Lido
                </Button>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={<BellOff size={28} />} text="Nenhum alerta no momento. Tudo sob controle!" />
      )}
    </Layout>
  );
}
