import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, BookOpen, TrendingDown } from 'lucide-react';
import DateRangePicker from '@/components/ledger/DateRangePicker';
import LedgerCharts from '@/components/ledger/LedgerCharts';
import TransactionList from '@/components/ledger/TransactionList';
import { CATEGORY_META } from '@/lib/ledger';

interface PageProps {
  searchParams: { from?: string; to?: string };
}

export default async function LedgerPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const now = new Date();
  const fromDate = searchParams.from
    ? parseISO(searchParams.from)
    : startOfMonth(now);
  const toDate = searchParams.to
    ? parseISO(searchParams.to)
    : endOfMonth(now);

  const fromStr = format(fromDate, 'yyyy-MM-dd');
  const toStr = format(toDate, 'yyyy-MM-dd');

  // 取得期間內的交易
  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      date: { gte: fromDate, lte: new Date(toStr + 'T23:59:59') },
    },
    orderBy: { date: 'desc' },
  });

  // 計算總計
  const total = transactions.reduce((s, t) => s + t.amount, 0);
  const count = transactions.length;

  // 類別統計
  const categoryMap: Record<string, number> = {};
  for (const t of transactions) {
    categoryMap[t.category] = (categoryMap[t.category] ?? 0) + t.amount;
  }
  const categoryData = Object.entries(categoryMap)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  // 每日統計
  const dailyMap: Record<string, number> = {};
  for (const t of transactions) {
    const key = format(new Date(t.date), 'yyyy-MM-dd');
    dailyMap[key] = (dailyMap[key] ?? 0) + t.amount;
  }
  const days = eachDayOfInterval({ start: fromDate, end: toDate > now ? now : toDate });
  const dailyData = days.map((d) => {
    const key = format(d, 'yyyy-MM-dd');
    return { date: key, total: dailyMap[key] ?? 0 };
  });

  // 找最大支出類別
  const topCategory = categoryData[0];

  // 序列化 transactions 供 client 元件使用
  const txSerialized = transactions.map((t) => ({
    id: t.id,
    amount: t.amount,
    category: t.category,
    description: t.description,
    date: t.date.toISOString(),
    source: t.source,
  }));

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-2xl">
              📒
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">記帳本</h1>
              <p className="text-muted-foreground text-sm">
                {format(fromDate, 'yyyy/MM/dd')} — {format(toDate, 'yyyy/MM/dd')}
              </p>
            </div>
          </div>
        </div>
        <Button asChild className="bg-violet-600 hover:bg-violet-700">
          <Link href="/ledgerease/new">
            <Plus className="h-4 w-4" />
            新增記帳
          </Link>
        </Button>
      </div>

      {/* 日期選擇器 */}
      <div className="mb-6">
        <DateRangePicker from={fromStr} to={toStr} />
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              <TrendingDown className="h-3.5 w-3.5 text-violet-500" />
              期間總支出
            </div>
            <div className="text-2xl font-bold text-violet-600">
              ${total.toLocaleString('zh-TW', { minimumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              <BookOpen className="h-3.5 w-3.5" />
              記錄筆數
            </div>
            <div className="text-2xl font-bold text-foreground">{count} 筆</div>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="pt-4 pb-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              最多支出類別
            </div>
            {topCategory ? (
              <div className="flex items-center gap-2">
                <span className="text-xl">{CATEGORY_META[topCategory.category]?.icon ?? '📦'}</span>
                <div>
                  <div className="text-sm font-bold text-foreground leading-tight">
                    {CATEGORY_META[topCategory.category]?.label ?? topCategory.category}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ${topCategory.total.toLocaleString('zh-TW', { minimumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">—</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 圖表 */}
      <div className="mb-6">
        <LedgerCharts categoryData={categoryData} dailyData={dailyData} />
      </div>

      {/* 明細列表 */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          支出明細（{count} 筆）
        </h2>
        <TransactionList transactions={txSerialized} />
      </div>
    </div>
  );
}
