import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function GroupsPage() {
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">群組</h1>
          <p className="text-gray-500 text-sm mt-1">管理你的家庭群組</p>
        </div>
        <Link
          href="/groups/new"
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
        >
          + 新增群組
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-16 text-center">
          <div className="text-4xl mb-4">👥</div>
          <p className="text-gray-500 font-medium mb-2">還沒有群組</p>
          <p className="text-gray-400 text-sm mb-6">建立一個群組，開始和家人一起記帳</p>
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
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">
                  {categoryIcon(g.category)}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{g.name}</div>
                  {g.description && (
                    <div className="text-xs text-gray-400 mt-0.5">{g.description}</div>
                  )}
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
  );
}