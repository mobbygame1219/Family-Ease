'use client';

import { useState } from 'react';
import { Trash2, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FridgeItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number | null;
  expiresAt: Date | null;
}

export default function FridgeItemCard({
  item,
  addedByName,
}: {
  item: FridgeItem;
  addedByName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleUse = async () => {
    setLoading(true);
    await fetch(`/api/fridge/${item.id}`, { method: 'PATCH' });
    setDone(true);
    setLoading(false);
    window.location.reload();
  };

  const handleDelete = async () => {
    if (!confirm(`確定要刪除「${item.name}」嗎？`)) return;
    await fetch(`/api/fridge/${item.id}`, { method: 'DELETE' });
    window.location.reload();
  };

  const isExpired = item.expiresAt && new Date(item.expiresAt) < new Date();
  const isExpiringSoon =
    !isExpired &&
    item.expiresAt &&
    new Date(item.expiresAt).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;

  return (
    <Card
      className={cn(
        'transition-all',
        isExpired && 'border-destructive/40 bg-red-50/50',
        isExpiringSoon && 'border-orange-300/60 bg-orange-50/50'
      )}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground truncate">{item.name}</div>
            <div className="text-sm text-muted-foreground mt-0.5">
              {item.quantity} {item.unit}
              {item.price != null && (
                <span className="ml-2 text-muted-foreground/70">${item.price}</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground/60 mt-0.5">由 {addedByName} 新增</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            className="h-7 w-7 text-muted-foreground/40 hover:text-destructive -mr-1 -mt-1 shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {item.expiresAt && (
          <Badge
            variant={isExpired ? 'destructive' : isExpiringSoon ? 'warning' : 'secondary'}
            className="mb-3 text-xs"
          >
            {isExpired ? '⚠️ 已過期：' : isExpiringSoon ? '⏰ 即將到期：' : '📅 '}
            {new Date(item.expiresAt).toLocaleDateString('zh-TW')}
          </Badge>
        )}

        <Button
          onClick={handleUse}
          disabled={loading || done}
          variant="secondary"
          size="sm"
          className="w-full text-xs gap-1.5"
        >
          {done ? (
            <>
              <CheckCircle className="h-3.5 w-3.5 text-primary" />
              已用完
            </>
          ) : loading ? (
            '處理中…'
          ) : (
            '標記用完'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
