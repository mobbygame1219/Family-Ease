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

  const pets = await prisma.pet.findMany({
    where: { groupId },
    include: {
      _count: { select: { logs: true } },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(pets);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, type, birthday, groupId } = body as {
      name: string;
      type: string;
      birthday?: string;
      groupId: string;
    };

    if (!name || !type || !groupId) {
      return NextResponse.json(
        { error: 'name, type, and groupId are required' },
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

    const pet = await prisma.pet.create({
      data: {
        name,
        type,
        birthday: birthday ? new Date(birthday) : undefined,
        groupId,
        createdById: session.user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { logs: true } },
      },
    });

    return NextResponse.json(pet, { status: 201 });
  } catch (error) {
    console.error('[calendarease/pets/POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
