import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function getFamilyId(userId: string): Promise<string> {
  let membership = await prisma.familyMember.findFirst({ where: { userId } });
  if (!membership) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const family = await prisma.familyGroup.create({
      data: {
        name: `${user?.name}的家庭`,
        createdById: userId,
        members: { create: { userId, role: 'ADMIN' } },
      },
    });
    return family.id;
  }
  return membership.familyId;
}

// GET /api/fridge/fridges — list all fridges for the user's family
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const familyId = await getFamilyId(session.user.id);

  const fridges = await prisma.fridge.findMany({
    where: { familyId },
    include: {
      _count: { select: { items: { where: { used: false } } } },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Ensure there's always at least one fridge
  if (fridges.length === 0) {
    const fridge = await prisma.fridge.create({
      data: {
        name: '主冰箱',
        emoji: '🧊',
        familyId,
        createdById: session.user.id,
      },
      include: { _count: { select: { items: { where: { used: false } } } } },
    });
    return NextResponse.json([fridge]);
  }

  return NextResponse.json(fridges);
}

// POST /api/fridge/fridges — create a new fridge
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, emoji } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: '請輸入冰箱名稱' }, { status: 400 });
  }

  const familyId = await getFamilyId(session.user.id);

  const fridge = await prisma.fridge.create({
    data: {
      name: name.trim(),
      emoji: emoji ?? '🧊',
      familyId,
      createdById: session.user.id,
    },
    include: { _count: { select: { items: { where: { used: false } } } } },
  });

  return NextResponse.json(fridge, { status: 201 });
}
