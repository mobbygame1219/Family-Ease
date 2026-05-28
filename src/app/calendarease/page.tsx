import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import {
  CalendarHeart, Users, PawPrint,
  Dog, Cat, Rabbit, Fish, Bird, Squirrel,
  type LucideIcon,
} from 'lucide-react';
import CreateGroupForm from '@/components/calendarease/CreateGroupForm';

const PET_ICON: Record<string, LucideIcon> = {
  DOG:     Dog,
  CAT:     Cat,
  RABBIT:  Rabbit,
  FISH:    Fish,
  BIRD:    Bird,
  HAMSTER: Squirrel,
};
const petIcon = (type: string): LucideIcon => PET_ICON[type] ?? PawPrint;

export default async function CalendarEasePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const groups = await prisma.calendarGroup.findMany({
    where: { members: { some: { userId: session.user.id } } },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      _count: { select: { events: true, pets: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const groupIds = groups.map((g) => g.id);
  const pets = groupIds.length > 0
    ? await prisma.pet.findMany({
        where: { groupId: { in: groupIds } },
        include: { createdBy: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
        take: 5,
      })
    : [];

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* ── Purple gradient banner ────────────────────── */}
      <div className="page-banner bg-gradient-to-r from-calendar-600 to-calendar-500 text-white mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <CalendarHeart className="h-6 w-6 text-white" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">CalendarEase</h1>
            <p className="text-calendar-100 text-sm mt-0.5">行事曆與寵物管理</p>
          </div>
        </div>
      </div>

      {/* Groups Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-800">我的行事曆群組</h2>
          <span className="inline-flex items-center rounded-full border border-calendar-200 bg-calendar-50 px-2.5 py-0.5 text-[11px] font-semibold text-calendar-700">
            {groups.length} 個群組
          </span>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 mb-4 py-10 text-center">
            <CalendarHeart className="h-12 w-12 text-calendar-200 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-neutral-500 text-sm">尚無行事曆群組，建立一個開始吧！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {groups.map((group) => (
              <Link key={group.id} href={`/calendarease/${group.id}`}>
                <div className="rounded-2xl border border-calendar-100 bg-white hover:border-calendar-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-4 cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-neutral-900 truncate">{group.name}</h3>
                    <CalendarHeart className="h-4 w-4 text-calendar-400 ml-2 flex-shrink-0" strokeWidth={1.75} />
                  </div>
                  <div className="flex gap-3 text-xs text-neutral-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {group.members.length} 人
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarHeart className="h-3 w-3" />
                      {group._count.events} 筆活動
                    </span>
                    <span className="flex items-center gap-1">
                      <PawPrint className="h-3 w-3" />
                      {group._count.pets} 隻寵物
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {group.members.slice(0, 4).map((m) => (
                      <span
                        key={m.id}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-calendar-100 text-calendar-700 text-xs font-semibold"
                        title={m.user.name ?? m.user.email ?? ''}
                      >
                        {(m.user.name ?? m.user.email ?? '?')[0].toUpperCase()}
                      </span>
                    ))}
                    {group.members.length > 4 && (
                      <span className="text-xs text-neutral-400">+{group.members.length - 4}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <CreateGroupForm />
      </div>

      {/* Pets Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-800">寵物成員</h2>
          <Link
            href="/calendarease/pets"
            className="text-sm text-calendar-600 hover:text-calendar-700 font-medium transition-colors"
          >
            查看全部 →
          </Link>
        </div>

        {pets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 py-10 text-center">
            <PawPrint className="h-12 w-12 text-calendar-200 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-neutral-500 text-sm">尚無寵物，前往群組新增寵物！</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {pets.map((pet) => {
              const PetIcon = petIcon(pet.type);
              return (
                <div key={pet.id} className="rounded-2xl border border-calendar-100 bg-calendar-50/60 hover:border-calendar-200 hover:shadow-sm transition-all p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-calendar-100 mb-2">
                    <PetIcon className="h-5 w-5 text-calendar-600" strokeWidth={1.75} />
                  </div>
                  <div className="font-semibold text-neutral-900 text-sm">{pet.name}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">{pet.type}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
