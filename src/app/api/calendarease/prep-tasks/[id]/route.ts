import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type Ctx = { params: { id: string } };

// PATCH /api/calendarease/prep-tasks/[id]
// body: { isDone?: boolean; title?: string }
export async function PATCH(request: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const task = await prisma.prepTask.findUnique({
      where: { id: params.id },
      select: { createdById: true, eventId: true, event: { select: { groupId: true } } },
    });

    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Allow creator or group member to update
    const membership = await prisma.calendarMember.findUnique({
      where: { userId_groupId: { userId: session.user.id, groupId: task.event.groupId } },
    });
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = (await request.json()) as { isDone?: boolean; title?: string };

    const updated = await prisma.prepTask.update({
      where: { id: params.id },
      data: {
        ...(body.isDone !== undefined && { isDone: body.isDone }),
        ...(body.title  !== undefined && { title: body.title.slice(0, 50) }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[prep-tasks/[id]/PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/calendarease/prep-tasks/[id]
export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const task = await prisma.prepTask.findUnique({
      where: { id: params.id },
      select: { createdById: true, event: { select: { groupId: true } } },
    });

    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const membership = await prisma.calendarMember.findUnique({
      where: { userId_groupId: { userId: session.user.id, groupId: task.event.groupId } },
    });
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await prisma.prepTask.delete({ where: { id: params.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[prep-tasks/[id]/DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
