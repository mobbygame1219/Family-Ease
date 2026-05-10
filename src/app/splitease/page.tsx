import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { formatCurrency } from '@/utils/balance';

export default async function SplitEasePage() {
  const session = await getServerSession(authOptions);

  const groups = await prisma.group.findMany({
    where: { members: { some: { userId: session!.user.id } } },
    include: {
      members: { include: { user: { select: { id: true, name: true } } } },
      _count: { select: { expenses: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const categoryIcon = (cat: string) => {
    if (cat === 'TRIP') return '✈️';
    if (cat === 'HOME') return '🏠';
    if (cat === 'FOOD') return '🍕';
    if (cat === 'WORK') return '💼';
    return '👥';
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-xl">
            💰
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SplitEase</h1>
        </div>
        <p className="text-gray-500 text-sm">分帳、記錄支出、結清帳款</p>
      </div>

      {/* 快捷功能 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { href: '/groups/new', icon: '➕', label: '新增群組' },
          { href: '/groups', icon: '👥', label: '我的群組' },
          { href: '/expenses', icon: '🧾', label: '支出記錄' },
          { href: '/settlements', icon: '✅', label: '結清帳款' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-gray-200 bg-white p-4 text-center hover:border-green-300 hover:shadow-sm transition-all"
          >
            <div className="text-2xl mb-2">{item.icon}</div>
            <div className="text-xs font-medium text-gray-700">{item.label}</div>
          </Link>
        ))}
      </div>

      {/* 群組列表 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">你的群組</h2>
          <Link href="/groups/new" className="text-sm text-green-600 font-medium hover:underline">
            + 新增群組
          </Link>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-16 text-center">
            <div className="text-4xl mb-4">👥</div>
            <p className="text-gray-500 font-medium mb-2">還沒有群組</p>
            <Link
              href="/groups/new"
              className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
            >
              建立第一個群組
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                className="rounded-xl border border-gray-200 bg-white p-5 hover:border-green-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">
                    {categoryIcon(g.category)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{g.name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>👤 {g.members.length} 位成員</span>
                  <span>🧾 {g._count.expenses} 筆支出</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}