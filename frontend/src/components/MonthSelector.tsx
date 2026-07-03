import { recentMonths, monthLabel } from '@/lib/format';

export function MonthSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (m: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm capitalize text-slate-700 outline-none focus:border-brand"
    >
      {recentMonths(12).map((m) => (
        <option key={m} value={m} className="capitalize">
          {monthLabel(m)}
        </option>
      ))}
    </select>
  );
}
