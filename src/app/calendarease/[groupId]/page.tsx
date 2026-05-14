import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft } from 'lucide-react';
import CalendarGrid from '@/components/calendarease/CalendarGrid';
import InviteMemberForm from '@/components/calendarease/InviteMemberForm';

interface PageProps {
  params: { groupId: string };
  searchParams: { year?: string; month?: string };
}

export default async function GroupCalendarPage({ params, searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const group = await prisma.calendarGroup.findUnique({
    where: { id: params.groupId },
    include: { members: { include: { user: { select: { id: true, name: true } } } } },
  });

  const isMember = group?.members.some((m) => m.userId === session.user.id);
  if (!group || !isMember) redirect('/calendarease');

  const now = new Date();
  const year = Number(searchParams.year ?? now.getFullYear());
  const month = Number(searchParams.month ?? now.getMonth() + 1);
  const startOf = new Date(year, month - 1, 1);
  const endOf = new Date(year, month, 0, 23, 59, 59);

  const events = await prisma.calendarEvent.findMany({
    where: { groupId: params.groupId, startAt: { gte: startOf, lte: endOf } },
    include: { createdBy: { select: { id: true, name: true } } },
    orderBy: { startAt: 'asc' },
  });

  // Serialize events (include isFromPetLog so CalendarGrid can hide edit/delete)
  const serializedEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    color: e.color,
    startAt: e.startAt.toISOString(),
    endAt: e.endAt.toISOString(),
    isAllDay: e.isAllDay,
    isFromPetLog: e.isFromPetLog,
    location: e.location ?? null,
    description: e.description ?? null,
    createdBy: { id: e.createdBy.id, name: e.createdBy.name ?? '' },
  }));

  const currentUserRole = group.members.find((m) => m.userId === session.user.id)?.role ?? 'MEMBER';

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link href="/calendarease" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">{group.name}</h1>
            <p className="text-xs text-muted-foreground">{group.members.length} 位成員</p>
          </div>
        </div>
        <Button asChild className="bg-purple-600 hover:bg-purple-700 text-white">
          <Link href={`/calendarease/${params.groupId}/events/new`}>
            <Plus className="h-4 w-4 mr-1" />
            新增活動
          </Link>
        </Button>
      </div>

      {/* Members + Invite */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {group.members.map((m) => (
            <div
              key={m.id}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-sm font-semibold"
              title={`${m.user.name ?? '?'} (${m.role === 'OWNER' ? '管理員' : '成員'})`}
            >
              {(m.user.name ?? '?')[0].toUpperCase()}
            </div>
          ))}
        </div>
        {/* OWNER can invite */}
        {currentUserRole === 'OWNER' && (
          <InviteMemberForm groupId={params.groupId} />
        )}
      </div>

      {/* Calendar Grid */}
      <CalendarGrid
        year={year}
        month={month}
        events={serializedEvents}
        groupId={params.groupId}
      />
    </div>
  );
}
