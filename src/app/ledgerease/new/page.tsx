'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CATEGORY_META, PAYMENT_SOURCES } from '@/lib/ledger';

export default function NewTransactionPage() {
  const router = useRouter();
  const today = format(new Date(), 'yyyy-MM-dd');

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('FOOD');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(today);
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError('請輸入有效金額');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          category,
          description: description.trim() || null,
          date: new Date(date).toISOString(),
          source: source || null,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      router.push('/ledgerease');
    } catch {
      setError('儲存失敗，請再試一次');
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild className="h-9 w-9">
          <Link href="/ledgerease">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">新增記帳</h1>
          <p className="text-muted-foreground text-sm">記錄一筆支出</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 金額 */}
            <div className="space-y-1.5">
              <Label htmlFor="amount">金額 *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7 text-lg font-semibold"
                  required
                />
              </div>
            </div>

            {/* 類別 */}
            <div className="space-y-1.5">
              <Label>類別 *</Label>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(CATEGORY_META).map(([key, meta]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key)}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 text-xs font-medium transition-all ${
                      category === key
                        ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
                        : 'border-border bg-background text-muted-foreground hover:border-muted-foreground/40'
                    }`}
                  >
                    <span className="text-xl">{meta.icon}</span>
                    <span className="leading-tight text-center">{meta.label.split('＋')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 說明 */}
            <div className="space-y-1.5">
              <Label htmlFor="description">說明（選填）</Label>
              <Input
                id="description"
                type="text"
                placeholder="例如：早餐、計程車…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* 日期 */}
            <div className="space-y-1.5">
              <Label htmlFor="date">日期 *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            {/* 付款方式 */}
            <div className="space-y-1.5">
              <Label htmlFor="source">付款方式（選填）</Label>
              <select
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">— 請選擇 —</option>
                {PAYMENT_SOURCES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              {loading ? '儲存中…' : '儲存記帳'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
