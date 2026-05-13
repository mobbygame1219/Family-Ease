'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CATEGORY_META } from '@/lib/ledger';

interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  date: string;
  source: string | null;
}

interface Props {
  transactions: Transaction[];
}

export default function TransactionList({ transactions: initial }: Props) {
  const [items, setItems] = useState(initial);

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除這筆記錄嗎？')) return;
    await fetch(`/api/ledger/${id}`, { method: 'DELETE' });
    setItems((prev) => prev.filter((t) => t.id !== id));
  };

  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <div className="py-14 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-foreground font-medium mb-1">還沒有任何記帳記錄</p>
          <p className="text-muted-foreground text-sm">點擊右上角「新增記帳」開始記錄</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="divide-y divide-border">
        {items.map((t) => {
          const meta = CATEGORY_META[t.category] ?? CATEGORY_META.OTHER;
          const dateStr = new Date(t.date).toLocaleDateString('zh-TW', {
            month: 'numeric',
            day: 'numeric',
          });
          return (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-lg shrink-0">
                {meta.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground truncate">
                    {t.description || meta.label}
                  </span>
                  <Badge
                    variant="secondary"
                    className="text-xs shrink-0"
                    style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
                  >
                    {meta.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{dateStr}</span>
                  {t.source && (
                    <span className="text-xs text-muted-foreground">· {t.source}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-semibold text-foreground">
                  ${t.amount.toLocaleString('zh-TW', { minimumFractionDigits: 0 })}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(t.id)}
                  className="h-7 w-7 text-muted-foreground/40 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
