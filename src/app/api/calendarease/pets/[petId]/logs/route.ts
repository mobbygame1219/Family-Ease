import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const LOG_LABELS: Record<string, string> = {
  FEED:     '餵食',
  POOP:     '大便',
  WATER:    '換水',
  BATH:     '洗澡',
  MEDICINE: '吃藥',
  VET:      '看醫生',
  OTHER:    '其他',
};

const VALID_TYPES = ['FEED', 'POOP', 'WATER', 'BATH', 'MEDICINE', 'VET', 'OTHER'] as const;
type LogType = typeof VALID_TYPES[number];

export async function GET(
  _request: Request,
  { params }: { params: { petId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const logs = await prisma.petLog.findMany({
    where: { petId: params.petId },
    include: { loggedBy: { select: { id: true, name: true } } },
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
    const { type, note, loggedAt } = (await request.json()) as {
      type: LogType;
      note?: string;
      loggedAt?: string;
    };

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: '無效的記錄類型' }, { status: 400 });
    }

    // Fetch pet to get name and groupId
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      select: { id: true, name: true, groupId: true },
    });
    if (!pet) {
      return NextResponse.json({ error: '找不到此寵物' }, { status: 404 });
    }

    const loggedAtDate = loggedAt ? new Date(loggedAt) : new Date();

    // Create the pet log AND a corresponding CalendarEvent in one transaction
    const [log] = await prisma.$transaction([
      prisma.petLog.create({
        data: {
          petId,
          type,
          note,
          loggedAt: loggedAtDate,
          loggedById: session.user.id,
        },
        include: { loggedBy: { select: { id: true, name: true } } },
      }),
      prisma.calendarEvent.create({
        data: {
          title:        `🐾 ${pet.name} - ${LOG_LABELS[type]}`,
          startAt:      loggedAtDate,
          endAt:        loggedAtDate,
          isAllDay:     false,
          color:        '#f97316', // orange — visually distinct from regular events
          notifyBefore: 0,
          isFromPetLog: true,
          groupId:      pet.groupId,
          createdById:  session.user.id,
        },
      }),
    ]);

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error('[pets/[petId]/logs POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
