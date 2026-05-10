import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/utils/balance';
import Link from 'next/link';

const categoryLabel: Record<string, string> = {
  FOOD: '🍕 餐飲',
  TRANSPORT: '🚗 交通',
  ACCOMMODATION: '🏨 住宿',
  ENTERTAINMENT: '🎮 娛樂',
  UTILITIES: '💡 水電',
  SHOPPING: '🛍️ 購物',
  HEALTH: '🏥 醫療',
  OTHER: '📦 其他',
};

export default async function ExpensesPage() {
  const session = await getServerSession(authOptions);

  const expenses = await prisma.expense.findMany({
    where: {
      group: { members: { some: { userId: session!.user.id } } },
    },
    include: {
      paidBy: { select: { id: true, name: true } },
      group: { select: { id: true, name: true } },
      splits: {
        where: { userId: session!.user.id },
        select: { amount: true, settled: true },
      },
    },
    orderBy: { date: 'desc' },
  });

  const totalSpent = expenses
    .filter((e) => e.paidBy.id === session!.user.id)
    .reduce((sum, e) => sum + e.amount, 0);

  const totalOwe = expenses
    .filter((e) => e.paidBy.id !== session!.user.id)
    .reduce((sum, e) => sum + (e.splits[0]?.amount ?? 0), 0);

  // 按月份分組
  const grouped: Record<string, typeof expenses> = {};
  expenses.forEach((e) => {
    const month = new Date(e.date).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
    });
    if (!grouped[month]) grouped[month] = [];
    grouped[month].push(e);
  });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">支出記錄</h1>
        <p className="text-gray-500 text-sm mt-1">所有群組的支出總覽</p>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">我的付款總額</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalSpent)}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">我應付金額</div>
          <div className="text-2xl font-bold text-red-500">{formatCurrency(totalOwe)}</div>
        </div>
      </div>

      {/* 支出列表 */}
      {expenses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-16 text-center">
          <div className="text-4xl mb-4">🧾</div>
          <p className="text-gray-500 font-medium mb-2">還沒有支出記錄</p>
          <p className="text-gray-400 text-sm mb-6">先建立一個群組，再新增支出</p>
          <Link
            href="/groups/new"
            className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            建立群組
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([month, monthExpenses]) => (
            <div key={month}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-500">{month}</h2>
                <span className="text-sm text-gray-400">
                  {formatCurrency(monthExpenses.reduce((s, e) => s + e.amount, 0))}
                </span>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
                {monthExpenses.map((e) => {
                  const myShare = e.splits[0]?.amount ?? 0;
                  const iPaid = e.paidBy.id === session!.user.id;
                  const settled = e.splits[0]?.settled ?? false;
                  return (
                    <Link
                      key={e.id}
                      href={`/groups/${e.group.id}`}
                      className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                    >
                      {/* 類別圖示 */}
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-lg flex-shrink-0">
                        {categoryLabel[e.category]?.split(' ')[0] ?? '📦'}
                      </div>

                      {/* 支出資訊 */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900">{e.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {e.group.name} · {e.paidBy.name} 付款 · {new Date(e.date).toLocaleDateString('zh-TW')}
                        </div>
                      </div>

                      {/* 金額 */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(e.amount)}
                        </div>
                        {iPaid ? (
                          <div className="text-xs text-green-600">你付款</div>
                        ) : settled ? (
                          <div className="text-xs text-gray-400">已結清</div>
                        ) : myShare > 0 ? (
                          <div className="text-xs text-red-500">
                            你欠 {formatCurrency(myShare)}
                          </div>
                        ) : null}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}