import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get('groupId');

  if (!groupId) {
    return NextResponse.json({ error: 'groupId is required' }, { status: 400 });
  }

  const events = await prisma.calendarEvent.findMany({
    where: { groupId },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { startAt: 'asc' },
  });

  return NextResponse.json(events);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      title,
      description,
      location,
      startAt,
      endAt,
      isAllDay,
      color,
      notifyBefore,
      groupId,
    } = body as {
      title: string;
      description?: string;
      location?: string;
      startAt: string;
      endAt: string;
      isAllDay?: boolean;
      color?: string;
      notifyBefore?: number;
      groupId: string;
    };

    if (!title || !startAt || !endAt || !groupId) {
      return NextResponse.json(
        { error: 'title, startAt, endAt, and groupId are required' },
        { status: 400 }
      );
    }

    // Verify user is a member of the group
    const membership = await prisma.calendarMember.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const event = await prisma.calendarEvent.create({
      data: {
        title,
        description,
        location,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        isAllDay: isAllDay ?? false,
        color,
        notifyBefore,
        groupId,
        createdById: session.user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('[calendarease/events/POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
