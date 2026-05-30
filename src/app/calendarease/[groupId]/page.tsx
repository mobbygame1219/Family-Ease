import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import InviteMemberForm from '@/components/calendarease/InviteMemberForm';
import CalendarEaseShell from '@/components/calendarease/CalendarEaseShell';

interface PageProps {
  params: { groupId: string };
}

export default async function GroupCalendarPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const group = await prisma.calendarGroup.findUnique({
    where: { id: params.groupId },
    include: { members: { include: { user: { select: { id: true, name: true } } } } },
  });

  const isMember = group?.members.some((m) => m.userId === session.user.id);
  if (!group || !isMember) redirect('/calendarease');

  const currentUserRole = group.members.find((m) => m.userId === session.user.id)?.role ?? 'MEMBER';

  return (
    <div
      className="flex flex-col h-[calc(100vh-64px)] p-4 gap-4"
      data-cal=""
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/calendarease" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">{group.name}</h1>
            <p className="text-xs text-muted-foreground">{group.members.length} 位成員</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Member avatars */}
          <div className="flex gap-1 flex-wrap">
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
          {currentUserRole === 'OWNER' && (
            <InviteMemberForm groupId={params.groupId} />
          )}
        </div>
      </div>

      {/* LeftPanel + CalendarView */}
      <CalendarEaseShell
        groupId={params.groupId}
        currentUserId={session.user.id}
      />
    </div>
  );
}
