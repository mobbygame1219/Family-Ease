import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: { petId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { petId } = params;

  const logs = await prisma.petLog.findMany({
    where: { petId },
    include: {
      loggedBy: { select: { id: true, name: true } },
    },
    orderBy: { loggedAt: 'desc' },
    take: 50,
  });

  return NextResponse.json(logs);
}

export async function POST(
  request: Request,
  { params }: { params: { petId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { petId } = params;
    const body = await request.json();
    const { type, note, loggedAt } = body as {
      type: 'FEED' | 'POOP' | 'WATER' | 'BATH' | 'MEDICINE' | 'VET' | 'OTHER';
      note?: string;
      loggedAt?: string;
    };

    if (!type) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 });
    }

    const validTypes = ['FEED', 'POOP', 'WATER', 'BATH', 'MEDICINE', 'VET', 'OTHER'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid log type' }, { status: 400 });
    }

    const log = await prisma.petLog.create({
      data: {
        petId,
        type,
        note,
        loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
        loggedById: session.user.id,
      },
      include: {
        loggedBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error('[calendarease/pets/[petId]/logs/POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
