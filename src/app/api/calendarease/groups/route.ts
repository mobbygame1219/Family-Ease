import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const groups = await prisma.calendarGroup.findMany({
    where: {
      members: { some: { userId: session.user.id } },
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      _count: { select: { events: true, pets: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(groups);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name } = body as { name: string };

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const group = await prisma.calendarGroup.create({
      data: {
        name: name.trim(),
        createdById: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: 'OWNER',
          },
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        _count: { select: { events: true, pets: true } },
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error('[calendarease/groups/POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
