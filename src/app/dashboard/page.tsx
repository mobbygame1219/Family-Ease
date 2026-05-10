// src/app/dashboard/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { formatCurrency } from '@/utils/balance';

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

  return { groups, recentExpenses, totalOwed, totalOwe };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const { groups, recentExpenses, totalOwed, totalOwe } = await getDashboardData(session!.user.id);

  const netBalance = totalOwed - totalOwe;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          嗨，{session!.user.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">這是你的支出總覽</p>
      </div>

      {/* 餘額卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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

      {/* 群組 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">你的群組</h2>
          <Link href="/groups/new" className="text-sm text-green-600 font-medium hover:underline">
            + 新增群組
          </Link>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
            <p className="text-gray-400 text-sm mb-3">還沒有群組</p>
            <Link href="/groups/new" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
              建立第一個群組
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {groups.map((g) => (
              <Link key={g.id} href={`/groups/${g.id}`}
                className="rounded-xl border border-gray-200 bg-white p-4 hover:border-green-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-lg">
                    {g.category === 'TRIP' ? '✈️' : g.category === 'HOME' ? '🏠' : g.category === 'FOOD' ? '🍕' : '👥'}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{g.name}</div>
                    <div className="text-xs text-gray-400">{g.members.length} 位成員 · {g._count.expenses} 筆支出</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 最近支出 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">最近的支出</h2>
        {recentExpenses.length === 0 ? (
          <p className="text-gray-400 text-sm">還沒有支出記錄</p>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {recentExpenses.map((e) => {
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
                    {!iPaid && myShare > 0 && (
                      <div className="text-xs text-red-500">你欠 {formatCurrency(myShare)}</div>
                    )}
                    {iPaid && (
                      <div className="text-xs text-green-600">你付款</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}