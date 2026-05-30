import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import FridgeItemCard from '@/components/fridge/FridgeItemCard';
import InviteFamilyMember from '@/components/fridge/InviteFamilyMember';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Camera, Plus, ArrowLeft } from 'lucide-react';

export default async function FridgeDetailPage({
  params,
}: {
  params: { fridgeId: string };
}) {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  // Load fridge + verify membership
  const fridge = await prisma.fridge.findFirst({
    where: {
      id: params.fridgeId,
      family: { members: { some: { userId } } },
    },
    include: {
      family: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      },
    },
  });

  if (!fridge) notFound();

  const [items, usedItems] = await Promise.all([
    prisma.fridgeItem.findMany({
      where: { fridgeId: params.fridgeId, used: false },
      include: { addedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.fridgeItem.findMany({
      where: { fridgeId: params.fridgeId, used: true },
      include: { addedBy: { select: { id: true, name: true } } },
      orderBy: { usedAt: 'desc' },
      take: 5,
    }),
  ]);

  const expiringSoon = items.filter(
    (i) => i.expiresAt && new Date(i.expiresAt).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000
  ).length;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

      {/* Breadcrumb */}
      <div>
        <Link
          href="/fridge"
          className="inline-flex items-center gap-1.5 text-[12px] text-neutral-400 hover:text-neutral-700 transition-colors mb-4"
        >
          <ArrowLeft className="h-3 w-3" />
          所有冰箱
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-2xl">
              {fridge.emoji}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
                {fridge.name}
              </h1>
              <p className="text-sm text-neutral-500 mt-0.5">
                {items.length} 樣食材
                {expiringSoon > 0 && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-[11px] font-medium text-orange-700">
                    {expiringSoon} 樣即將到期
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/fridge/scan?fridgeId=${params.fridgeId}`}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-[13px] font-medium text-neutral-700 hover:border-neutral-300 hover:shadow-sm transition-all"
            >
              <Camera className="h-3.5 w-3.5" />
              掃描收據
            </Link>
            <Link
              href={`/fridge/new?fridgeId=${params.fridgeId}`}
              className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-2 text-[13px] font-medium text-white hover:bg-neutral-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              新增食材
            </Link>
          </div>
        </div>
      </div>

      {/* Family members */}
      <section>
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
          家庭成員
        </h2>
        <div className="rounded-xl border border-neutral-200 bg-white px-5 py-4">
          <div className="flex items-center gap-3 flex-wrap mb-4">
            {fridge.family.members.map((m: { id: string; userId: string; user: { name: string | null } }) => (
              <div key={m.id} className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-neutral-100 text-neutral-600 text-[11px] font-semibold">
                    {m.user.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[13px] text-neutral-700">
                  {m.user.name}
                  {m.userId === userId && (
                    <span className="ml-1 text-[11px] text-neutral-400">（你）</span>
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-neutral-100 pt-3">
            <InviteFamilyMember />
          </div>
        </div>
      </section>

      {/* Item list */}
      <section>
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
          食材
        </h2>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 py-16 text-center">
            <div className="text-4xl mb-3">🥬</div>
            <p className="text-sm font-medium text-neutral-600 mb-1">冰箱是空的</p>
            <p className="text-[12px] text-neutral-400 mb-5">新增食材或掃描購物收據</p>
            <div className="flex gap-2.5 justify-center">
              <Link
                href={`/fridge/scan?fridgeId=${params.fridgeId}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <Camera className="h-3.5 w-3.5" />
                掃描收據
              </Link>
              <Link
                href={`/fridge/new?fridgeId=${params.fridgeId}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                手動新增
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => (
              <FridgeItemCard
                key={item.id}
                item={item}
                addedByName={item.addedBy.name ?? ''}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recently used */}
      {usedItems.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
            最近用完的食材
          </h2>
          <div className="rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-100 overflow-hidden">
            {usedItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-[13px] text-neutral-400 line-through">{item.name}</span>
                  <span className="text-[11px] text-neutral-400/70">
                    {item.quantity} {item.unit}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-neutral-400/60">
                  <span>{item.addedBy.name}</span>
                  {item.usedAt && (
                    <span>{new Date(item.usedAt).toLocaleDateString('zh-TW')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
