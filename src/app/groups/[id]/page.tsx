import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency } from '@/utils/balance';

export default async function GroupPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  const group = await prisma.group.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      expenses: {
        include: {
          paidBy: { select: { id: true, name: true } },
          splits: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!group) notFound();

  const isMember = group.members.some((m) => m.userId === session!.user.id);
  if (!isMember) notFound();

  const categoryIcon = (cat: string) => {
    if (cat === 'TRIP') return '✈️';
    if (cat === 'HOME') return '🏠';
    if (cat === 'FOOD') return '🍕';
    if (cat === 'WORK') return '💼';
    return '👥';
  };

  const totalExpenses = group.expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* 群組標題 */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl">
          {categoryIcon(group.category)}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
          {group.description && (
            <p className="text-gray-500 text-sm mt-0.5">{group.description}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左欄：支出列表 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">支出記錄</h2>
            <Link
              href={`/groups/${group.id}/expenses/new`}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors"
            >
              + 新增支出
            </Link>
          </div>

          {group.expenses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
              <div className="text-3xl mb-3">🧾</div>
              <p className="text-gray-400 text-sm mb-4">還沒有支出記錄</p>
              <Link
                href={`/groups/${group.id}/expenses/new`}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                新增第一筆支出
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
              {group.expenses.map((e) => {
                const mysplits = e.splits.filter((s) => s.userId === session!.user.id);
                const myAmount = mysplits.reduce((sum, s) => sum + s.amount, 0);
                const iPaid = e.paidBy.id === session!.user.id;
                return (
                  <div key={e.id} className="flex items-center justify-between p-4">
                    <div>
                      <div className="font-medium text-sm text-gray-900">{e.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {e.paidBy.name} 付款 · {new Date(e.date).toLocaleDateString('zh-TW')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">{formatCurrency(e.amount)}</div>
                      {iPaid ? (
                        <div className="text-xs text-green-600">你付款</div>
                      ) : myAmount > 0 ? (
                        <div className="text-xs text-red-500">你欠 {formatCurrency(myAmount)}</div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 右欄：群組資訊 */}
        <div className="space-y-4">
          {/* 統計 */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">群組統計</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">總支出</span>
                <span className="font-semibold">{formatCurrency(totalExpenses)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">支出筆數</span>
                <span className="font-semibold">{group.expenses.length} 筆</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">成員人數</span>
                <span className="font-semibold">{group.members.length} 人</span>
              </div>
            </div>
          </div>

          {/* 成員列表 */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">群組成員</h3>
            <div className="space-y-2">
              {group.members.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-700">
                    {m.user.name?.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {m.user.name}
                      {m.userId === session!.user.id && (
                        <span className="ml-1 text-xs text-gray-400">（你）</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">{m.user.email}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}