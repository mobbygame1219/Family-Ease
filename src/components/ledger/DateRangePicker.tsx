'use client';

import { useRouter, usePathname } from 'next/navigation';
import { format } from 'date-fns';

interface Props {
  from: string;
  to: string;
}

export default function DateRangePicker({ from, to }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const update = (key: 'from' | 'to', value: string) => {
    const params = new URLSearchParams({ from, to, [key]: value });
    router.push(`${pathname}?${params.toString()}`);
  };

  // Quick presets
  const setPreset = (months: number) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const params = new URLSearchParams({
      from: format(start, 'yyyy-MM-dd'),
      to: format(end, 'yyyy-MM-dd'),
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={from}
          onChange={(e) => update('from', e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <span className="text-muted-foreground text-sm">至</span>
        <input
          type="date"
          value={to}
          onChange={(e) => update('to', e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      <div className="flex gap-1.5">
        {[
          { label: '本月', months: 1 },
          { label: '近三月', months: 3 },
          { label: '近半年', months: 6 },
        ].map((p) => (
          <button
            key={p.label}
            onClick={() => setPreset(p.months)}
            className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
