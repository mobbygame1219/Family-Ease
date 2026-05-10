import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const activities = await prisma.activity.findMany({
    where: {
      group: {
        members: { some: { userId: session.user.id } },
      },
    },
    include: {
      user: { select: { id: true, name: true } },
      group: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return NextResponse.json(activities);
}