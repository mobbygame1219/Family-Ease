'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CATEGORY_META } from '@/lib/ledger';

export interface ImportItem {
  date: string;
  storeName: string;
  description: string;
  amount: number;
  category: string;
}

interface Props {
  items: ImportItem[];
  onReset: () => void;
}

export default function CsvImportPreview({ items: initial, onReset }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(
    initial.map((item, i) => ({ ...item, _id: i, selected: true }))
  );
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const selectedCount = rows.filter((r) => r.selected).length;
  const allSelected = selectedCount === rows.length;

  const toggleAll = () =>
    setRows((prev) => prev.map((r) => ({ ...r, selected: !allSelected })));

  const toggleOne = (id: number) =>
    setRows((prev) =>
      prev.map((r) => (r._id === id ? { ...r, selected: !r.selected } : r))
    );

  const updateCategory = (id: number, category: string) =>
    setRows((prev) =>
      prev.map((r) => (r._id === id ? { ...r, category } : r))
    );

  const handleImport = async () => {
    const selected = rows.filter((r) => r.selected);
    if (selected.length === 0) return;
    setLoading(true);

    await Promise.all(
      selected.map((item) =>
        fetch('/api/ledger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: item.amount,
            category: item.category,
            description: item.description,
            date: new Date(item.date).toISOString(),
            source: item.storeName || null,
          }),
        })
      )
    );

    setLoading(false);
    setDone(true);
    setTimeout(() => router.push('/ledgerease'), 1500);
  };

  /* ── Success state ── */
  if (done) {
    return (
      <Card>
        <div className="py-14 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
            <Check className="h-7 w-7 text-green-600" />
          </div>
          <p className="font-medium text-foreground">匯入成功！</p>
          <p className="text-sm text-muted-foreground">正在返回 LedgerEase…</p>
        </div>
      </Card>
    );
  }

  /* ── Preview table ── */
  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground">
            預覽（{rows.length} 筆）
          </span>
          <button
            onClick={toggleAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
          >
            {allSelected ? '取消全選' : '全選'}
          </button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onReset} disabled={loading}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            重新上傳
          </Button>
          <Button
            size="sm"
            disabled={selectedCount === 0 || loading}
            onClick={handleImport}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {loading ? '匯入中…' : `批次新增 ${selectedCount} 筆`}
          </Button>
        </div>
      </div>

      <Card>
        <div className="divide-y divide-border">
          {rows.map((row) => {
            const meta = CATEGORY_META[row.category] ?? CATEGORY_META.OTHER;
            return (
              <div
                key={row._id}
                className={`flex items-center gap-3 px-4 py-3 transition-opacity ${
                  row.selected ? 'opacity-100' : 'opacity-35'
                }`}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={row.selected}
                  onChange={() => toggleOne(row._id)}
                  className="h-4 w-4 rounded accent-violet-600 shrink-0 cursor-pointer"
                />

                {/* Category icon */}
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-lg shrink-0">
                  {meta.icon}
                </div>

                {/* Description + meta */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {row.description}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {row.storeName} · {row.date}
                  </div>
                </div>

                {/* Editable category */}
                <select
                  value={row.category}
                  onChange={(e) => updateCategory(row._id, e.target.value)}
                  className="rounded-lg border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring shrink-0 max-w-[130px]"
                >
                  {Object.entries(CATEGORY_META).map(([key, m]) => (
                    <option key={key} value={key}>
                      {m.icon} {m.label}
                    </option>
                  ))}
                </select>

                {/* Amount */}
                <span className="text-sm font-semibold text-foreground shrink-0 w-16 text-right">
                  ${row.amount.toLocaleString('zh-TW')}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
