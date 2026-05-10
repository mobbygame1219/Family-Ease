import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { formatCurrency } from '@/utils/balance';
import ActivityFeed from '@/components/ActivityFeed';
import ExpenseChart from '@/components/ExpenseChart';

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

  let totalOwed = 0;
  let totalOwe = 0;

  for (const split of unsettledSplits) {
    if (split.expense.paidById === userId) continue;
    totalOwe += split.amount;
  }

  const myPaidSplits = await prisma.expenseSplit.findMany({
    where: { expense: { paidById: userId }, settled: false, userId: { not: userId } },
    select: { amount: true },
  });
  totalOwed = myPaidSplits.reduce((sum, s) => sum + s.amount, 0);

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

const features = [
  {
    href: '/splitease',
    icon: '💰',
    title: 'SplitEase',
    desc: '分帳、記錄支出、結清帳款',
    color: 'bg-green-50 border-green-200 hover:border-green-400',
    iconBg: 'bg-green-100',
  },
  {
    href: '/fridge',
    icon: '🧊',
    title: 'Family Fridge',
    desc: '管理冰箱食材、掃描收據、設計菜單',
    color: 'bg-blue-50 border-blue-200 hover:border-blue-400',
    iconBg: 'bg-blue-100',
  },
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const { groups, recentExpenses, totalOwed, totalOwe, categoryStats, activities } =
    await getDashboardData(session!.user.id);

  const netBalance = totalOwed - totalOwe;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* 歡迎標題 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          嗨，{session!.user.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">歡迎回到 FamilyEase</p>
      </div>

      {/* 功能模組卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {features.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className={`rounded-xl border p-6 transition-all hover:shadow-md ${f.color}`}
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${f.iconBg} text-2xl mb-4`}>
              {f.icon}
            </div>
            <div className="font-bold text-gray-900 text-lg mb-1">{f.title}</div>
            <div className="text-sm text-gray-500">{f.desc}</div>
          </Link>
        ))}
      </div>

      {/* SplitEase 快速總覽 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">💰 SplitEase 總覽</h2>
          <Link href="/splitease" className="text-sm text-green-600 hover:underline">
            查看更多 →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">別人欠你</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalOwed)}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">你欠別人</div>
            <div className="text-2xl font-bold text-red-500">{formatCurrency(totalOwe)}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">淨餘額</div>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance)}
            </div>
          </div>
        </div>

        {/* 最近支出 */}
        {recentExpenses.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {recentExpenses.slice(0, 4).map((e) => {
              const myShare = e.splits[0]?.amount ?? 0;
              const iPaid = e.paidBy.id === session!.user.id;
              return (
                <div key={e.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium text-sm text-gray-900">{e.title}</div>
                    <div className="text-xs text-gray-400">{e.group.name} · {e.paidBy.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">{formatCurrency(e.amount)}</div>
                    {iPaid ? (
                      <div className="text-xs text-green-600">你付款</div>
                    ) : myShare > 0 ? (
                      <div className="text-xs text-red-500">你欠 {formatCurrency(myShare)}</div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 支出圖表 */}
      {categoryStats.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">支出類別分析</h2>
          <ExpenseChart data={categoryStats} />
        </div>
      )}

      {/* 最近動態 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">最近動態</h2>
        <ActivityFeed activities={activities} />
      </div>
    </div>
  );
}