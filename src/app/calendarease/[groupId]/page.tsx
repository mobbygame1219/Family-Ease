import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import CalendarEaseShell from '@/components/calendarease/CalendarEaseShell';

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
    <CalendarEaseShell
      groupId={params.groupId}
      groupName={group.name}
      members={group.members}
      isOwner={isOwner}
      currentUserId={session.user.id}
    />
  );
}
