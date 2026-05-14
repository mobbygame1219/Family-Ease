import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function canModifyEvent(
  eventId: string,
  userId: string
): Promise<{ allowed: boolean; event?: { id: string; groupId: string; createdById: string; isFromPetLog: boolean } }> {
  const event = await prisma.calendarEvent.findUnique({
    where: { id: eventId },
    select: { id: true, groupId: true, createdById: true, isFromPetLog: true },
  });

  if (!event) {
    return { allowed: false };
  }

  // Creator can always modify
  if (event.createdById === userId) {
    return { allowed: true, event };
  }

  // Group OWNER can also modify
  const ownerMembership = await prisma.calendarMember.findFirst({
    where: {
      userId,
      groupId: event.groupId,
      role: 'OWNER',
    },
  });

  return { allowed: !!ownerMembership, event };
}

export async function PUT(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { eventId } = params;
    const { allowed, event } = await canModifyEvent(eventId, session.user.id);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (event.isFromPetLog) {
      return NextResponse.json({ error: '寵物記錄行程不能編輯' }, { status: 403 });
    }

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
    } = body as {
      title?: string;
      description?: string;
      location?: string;
      startAt?: string;
      endAt?: string;
      isAllDay?: boolean;
      color?: string;
      notifyBefore?: number;
    };

    const updated = await prisma.calendarEvent.update({
      where: { id: eventId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(location !== undefined && { location }),
        ...(startAt !== undefined && { startAt: new Date(startAt) }),
        ...(endAt !== undefined && { endAt: new Date(endAt) }),
        ...(isAllDay !== undefined && { isAllDay }),
        ...(color !== undefined && { color }),
        ...(notifyBefore !== undefined && { notifyBefore }),
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[calendarease/events/[eventId]/PUT]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { eventId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { eventId } = params;
    const { allowed, event } = await canModifyEvent(eventId, session.user.id);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (event.isFromPetLog) {
      return NextResponse.json({ error: '寵物記錄行程不能手動刪除' }, { status: 403 });
    }

    await prisma.calendarEvent.delete({ where: { id: eventId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[calendarease/events/[eventId]/DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
