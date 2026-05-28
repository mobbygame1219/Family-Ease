import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import CalendarView from '@/components/calendarease/CalendarView';
import LeftPanel from '@/components/calendarease/LeftPanel';
import InviteMemberForm from '@/components/calendarease/InviteMemberForm';

interface PageProps {
  params: { groupId: string };
}

export default async function GroupCalendarPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const group = await prisma.calendarGroup.findUnique({
    where: { id: params.groupId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  const membership = group?.members.find(m => m.userId === session.user.id);
  if (!group || !membership) redirect('/calendarease');

  const isOwner = membership.role === 'OWNER';

  return (
    <div
      data-cal
      className="flex h-full overflow-hidden"
      style={{ background: 'var(--cal-bg)' }}
    >
      {/* ── Left panel (next 7 days + pets) ───────────────────── */}
      <LeftPanel groupId={params.groupId} />

      {/* ── Main area ─────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Group header bar */}
        <div
          className="flex items-center gap-3 px-4 py-2.5 border-b flex-shrink-0"
          style={{ background: 'var(--cal-panel-bg)', borderColor: 'var(--cal-border)' }}
        >
          <Link
            href="/calendarease"
            className="p-1 rounded-lg hover:bg-black/5 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" style={{ color: 'var(--cal-text2)' }} />
          </Link>

          <div className="flex-1 min-w-0">
            <h1
              className="text-base font-semibold truncate"
              style={{ color: 'var(--cal-text)', fontFamily: "'Lora', serif" }}
            >
              {group.name}
            </h1>
          </div>

          {/* Member avatars */}
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" style={{ color: 'var(--cal-text3)' }} />
            <div className="flex -space-x-1.5">
              {group.members.slice(0, 5).map(m => (
                <div
                  key={m.id}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white border border-white"
                  style={{ background: 'var(--cal-personal-deep)' }}
                  title={m.user.name ?? m.user.email ?? '?'}
                >
                  {(m.user.name ?? m.user.email ?? '?')[0].toUpperCase()}
                </div>
              ))}
              {group.members.length > 5 && (
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold border border-white"
                  style={{ background: 'var(--cal-bg3)', color: 'var(--cal-text2)' }}
                >
                  +{group.members.length - 5}
                </div>
              )}
            </div>
          </div>

          {/* Invite (owner only) */}
          {isOwner && (
            <InviteMemberForm groupId={params.groupId} />
          )}
        </div>

        {/* Calendar */}
        <CalendarView
          groupId={params.groupId}
          currentUserId={session.user.id}
        />
      </div>
    </div>
  );
}
