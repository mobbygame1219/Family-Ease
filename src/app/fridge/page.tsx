import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import FridgeItemCard from '@/components/fridge/FridgeItemCard';
import InviteFamilyMember from '@/components/fridge/InviteFamilyMember';

async function getFamilyData(userId: string) {
  let membership = await prisma.familyMember.findFirst({
    where: { userId },
    include: {
      family: {
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
    },
  });

  if (!membership) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const family = await prisma.familyGroup.create({
      data: {
        name: `${user?.name}的家庭`,
        createdById: userId,
        members: { create: { userId, role: 'ADMIN' } },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
    return { family, familyId: family.id };
  }

  return { family: membership.family, familyId: membership.familyId };
}

export default async function FridgePage() {
  const session = await getServerSession(authOptions);
  const { family, familyId } = await getFamilyData(session!.user.id);

  const items = await prisma.fridgeItem.findMany({
    where: { familyId, used: false },
    include: {
      addedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const usedItems = await prisma.fridgeItem.findMany({
    where: { familyId, used: true },
    include: {
      addedBy: { select: { id: true, name: true } },
    },
    orderBy: { usedAt: 'desc' },
    take: 5,
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-xl">
              🧊
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Family Fridge</h1>
          </div>
          <p className="text-gray-500 text-sm">目前有 {items.length} 樣食材</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/fridge/scan"
            className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
          >
            📷 掃描收據
          </Link>
          <Link
            href="/fridge/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            + 新增食材
          </Link>
        </div>
      </div>

      {/* 家庭成員 */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">家庭成員</h3>
        <div className="flex items-center gap-3 flex-wrap">
          {family.members.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                {m.user.name?.charAt(0)}
              </div>
              <span className="text-sm text-gray-700">
                {m.user.name}
                {m.userId === session!.user.id && (
                  <span className="ml-1 text-xs text-gray-400">（你）</span>
                )}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-gray-100 pt-3">
          <InviteFamilyMember />
        </div>
      </div>

      {/* 菜單設計入口 */}
      <Link
        href="/fridge/menu"
        className="flex items-center gap-4 rounded-xl border border-orange-200 bg-orange-50 p-4 mb-6 hover:border-orange-300 transition-colors"
      >
        <div className="text-3xl">👨‍🍳</div>
        <div>
          <div className="font-semibold text-orange-900">設計今天的菜單</div>
          <div className="text-sm text-orange-600">根據冰箱食材和預算，讓 AI 幫你設計菜單</div>
        </div>
        <div className="ml-auto text-orange-400">→</div>
      </Link>

      {/* 食材列表 */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-16 text-center mb-6">
          <div className="text-4xl mb-4">🥬</div>
          <p className="text-gray-500 font-medium mb-2">冰箱是空的</p>
          <p className="text-gray-400 text-sm mb-6">新增食材或掃描購物收據</p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/fridge/scan"
              className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              📷 掃描收據
            </Link>
            <Link
              href="/fridge/new"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              手動新增
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {items.map((item) => (
            <FridgeItemCard key={item.id} item={item} addedByName={item.addedBy.name ?? ''} />
          ))}
        </div>
      )}

      {/* 最近用完的食材 */}
      {usedItems.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            最近用完的食材
          </h2>
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {usedItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <span className="text-gray-300 line-through text-sm">{item.name}</span>
                  <span className="text-xs text-gray-300">{item.quantity} {item.unit}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-300">{item.addedBy.name}</span>
                  <span className="text-xs text-gray-300">
                    {item.usedAt ? new Date(item.usedAt).toLocaleDateString('zh-TW') : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}