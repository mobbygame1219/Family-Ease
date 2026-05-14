import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { formatCurrency } from '@/utils/balance';
import ActivityFeed from '@/components/ActivityFeed';
import ExpenseChart from '@/components/ExpenseChart';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';

async function getDashboardData(userId: string) {
  const [groups, recentExpenses] = await Promise.all([
    prisma.group.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        _count: { select: { expenses: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
    prisma.expense.findMany({
      where: { group: { members: { some: { userId } } } },
      include: {
        paidBy: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } },
        splits: { where: { userId }, select: { amount: true, settled: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ]);

  const unsettledSplits = await prisma.expenseSplit.findMany({
    where: { userId, settled: false },
    include: { expense: { select: { paidById: true, amount: true } } },
  });

  let totalOwe = 0;
  for (const split of unsettledSplits) {
    if (split.expense.paidById === userId) continue;
    totalOwe += split.amount;
  }

  const myPaidSplits = await prisma.expenseSplit.findMany({
    where: { expense: { paidById: userId }, settled: false, userId: { not: userId } },
    select: { amount: true },
  });
  const totalOwed = myPaidSplits.reduce((sum, s) => sum + s.amount, 0);

  const categoryStats = await prisma.expense.groupBy({
    by: ['category'],
    where: { group: { members: { some: { userId } } } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const activities = await prisma.activity.findMany({
    where: {
      group: { members: { some: { userId } } },
      createdAt: { gte: sevenDaysAgo },
    },
    include: {
      user: { select: { id: true, name: true } },
      group: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return { groups, recentExpenses, totalOwed, totalOwe, categoryStats, activities };
}

// ── Feature cards ─────────────────────────────────────────────────────────────
const features = [
  {
    href: '/splitease',
    icon: '💰',
    iconBg: 'bg-emerald-50',
    title: 'SplitEase',
    desc: '分帳、記錄支出、結清帳款',
  },
  {
    href: '/fridge',
    icon: '🧊',
    iconBg: 'bg-blue-50',
    title: 'Family Fridge',
    desc: '管理冰箱食材、掃描收據、設計菜單',
  },
  {
    href: '/ledgerease',
    icon: '📒',
    iconBg: 'bg-violet-50',
    title: 'LedgerEase',
    desc: '記錄個人支出、圖表分析、掌握花費',
  },
  {
    href: '/calendarease',
    icon: '📅',
    iconBg: 'bg-purple-50',
    title: 'CalendarEase',
    desc: '家庭行事曆、行程提醒、寵物記錄',
  },
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const { recentExpenses, totalOwed, totalOwe, categoryStats, activities } =
    await getDashboardData(session!.user.id);

  const netBalance = totalOwed - totalOwe;
  const firstName = session!.user.name?.split(' ')[0];

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">

      {/* ── Welcome ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
          嗨，{firstName} 👋
        </h1>
        <p className="text-sm text-neutral-500 mt-1">歡迎回到 FamilyEase</p>
      </div>

      {/* ── Feature modules ──────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
          功能模組
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {features.map((f) => (
            <Link key={f.href} href={f.href} className="group block">
              <div className="flex items-start gap-3.5 rounded-xl border border-neutral-200 bg-white px-4 py-3.5 hover:border-neutral-300 hover:shadow-sm transition-all duration-150">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-[18px] flex-shrink-0 ${f.iconBg}`}>
                  {f.icon}
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  <div className="text-[13px] font-semibold text-neutral-900 leading-tight">
                    {f.title}
                  </div>
                  <div className="text-[12px] text-neutral-500 mt-0.5 leading-relaxed">
                    {f.desc}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-neutral-300 flex-shrink-0 mt-1 group-hover:text-neutral-500 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── SplitEase overview ───────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
            SplitEase 總覽
          </h2>
          <Link
            href="/splitease"
            className="text-[12px] text-neutral-500 hover:text-neutral-800 transition-colors"
          >
            查看全部 →
          </Link>
        </div>

        {/* Balance row */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {[
            {
              label: '別人欠你',
              value: formatCurrency(totalOwed),
              color: totalOwed > 0 ? 'text-emerald-600' : 'text-neutral-700',
            },
            {
              label: '你欠別人',
              value: formatCurrency(totalOwe),
              color: totalOwe > 0 ? 'text-red-500' : 'text-neutral-700',
            },
            {
              label: '淨餘額',
              value: `${netBalance >= 0 ? '+' : ''}${formatCurrency(netBalance)}`,
              color: netBalance >= 0 ? 'text-emerald-600' : 'text-red-500',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-3"
            >
              <div className="text-[11px] font-medium text-neutral-400 mb-1.5 uppercase tracking-wide">
                {stat.label}
              </div>
              <div className={`text-lg font-semibold ${stat.color} leading-none`}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Recent expenses */}
        {recentExpenses.length > 0 && (
          <div className="rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-100 overflow-hidden">
            {recentExpenses.slice(0, 4).map((e) => {
              const myShare = e.splits[0]?.amount ?? 0;
              const iPaid = e.paidBy.id === session!.user.id;
              return (
                <div key={e.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-neutral-900 truncate">
                      {e.title}
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      {e.group.name} · {e.paidBy.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0 ml-4">
                    <span className="text-[13px] font-semibold text-neutral-700">
                      {formatCurrency(e.amount)}
                    </span>
                    {iPaid ? (
                      <Badge className="text-[10px] h-5 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
                        你付款
                      </Badge>
                    ) : myShare > 0 ? (
                      <Badge className="text-[10px] h-5 px-1.5 bg-red-50 text-red-600 border-red-200 font-medium">
                        欠 {formatCurrency(myShare)}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Category chart ───────────────────────────────────────────── */}
      {categoryStats.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
            支出類別分析
          </h2>
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <ExpenseChart data={categoryStats} />
          </div>
        </section>
      )}

      {/* ── Activity feed ────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
          最近動態
        </h2>
        <ActivityFeed activities={activities} />
      </section>

    </div>
  );
}
