import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { Plus, NotebookPen, BookOpen, TrendingDown, Upload } from 'lucide-react';
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

      {/* ── Orange gradient banner ────────────────────── */}
      <div className="page-banner bg-gradient-to-r from-ledger-600 to-ledger-500 text-white mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <NotebookPen className="h-6 w-6 text-white" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">記帳本</h1>
              <p className="text-ledger-100 text-sm mt-0.5">
                {format(fromDate, 'yyyy/MM/dd')} — {format(toDate, 'yyyy/MM/dd')}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/ledgerease/import"
              className="flex items-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 px-3 py-1.5 text-[13px] font-medium text-white transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              匯入 CSV
            </Link>
            <Link
              href="/ledgerease/new"
              className="flex items-center gap-1.5 rounded-xl bg-white text-ledger-600 hover:bg-ledger-50 px-3 py-1.5 text-[13px] font-semibold transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              新增記帳
            </Link>
          </div>
        </div>
      </div>

      {/* 日期選擇器 */}
      <div className="mb-6">
        <DateRangePicker from={fromStr} to={toStr} />
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="rounded-2xl border border-ledger-100 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
            <TrendingDown className="h-3.5 w-3.5 text-ledger-500" />
            期間總支出
          </div>
          <div className="text-2xl font-bold text-ledger-600">
            ${total.toLocaleString('zh-TW', { minimumFractionDigits: 0 })}
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
            <BookOpen className="h-3.5 w-3.5" />
            記錄筆數
          </div>
          <div className="text-2xl font-bold text-neutral-800">{count} 筆</div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 col-span-2 sm:col-span-1">
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
            最多支出類別
          </div>
          {topCategory ? (() => {
              const meta = CATEGORY_META[topCategory.category] ?? CATEGORY_META.OTHER;
              return (
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 flex-shrink-0">
                    <meta.Icon className="h-4 w-4" strokeWidth={1.75} style={{ color: meta.color }} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-neutral-800 leading-tight">
                      {meta.label}
                    </div>
                    <div className="text-xs text-neutral-500">
                      ${topCategory.total.toLocaleString('zh-TW', { minimumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
              );
            })() : (
            <div className="text-sm text-neutral-400">—</div>
          )}
        </div>
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
