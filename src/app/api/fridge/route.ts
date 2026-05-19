import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function getDefaultFridgeId(userId: string): Promise<string> {
  // Ensure the user has a family
  const existingMembership = await prisma.familyMember.findFirst({ where: { userId } });
  let familyId: string;

  if (!existingMembership) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const family = await prisma.familyGroup.create({
      data: {
        name: `${user?.name}的家庭`,
        createdById: userId,
        members: { create: { userId, role: 'ADMIN' } },
      },
    });
    familyId = family.id;
  } else {
    familyId = existingMembership.familyId;
  }

  // Get or create default fridge
  let fridge = await prisma.fridge.findFirst({
    where: { familyId },
    orderBy: { createdAt: 'asc' },
  });

  if (!fridge) {
    fridge = await prisma.fridge.create({
      data: {
        name: '主冰箱',
        emoji: '🧊',
        familyId,
        createdById: userId,
      },
    });
  }

  return fridge.id;
}

// GET /api/fridge?fridgeId=xxx — items for a specific fridge
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fridgeId = searchParams.get('fridgeId') ?? (await getDefaultFridgeId(session.user.id));

  // Verify user has access to this fridge
  const fridge = await prisma.fridge.findFirst({
    where: {
      id: fridgeId,
      family: { members: { some: { userId: session.user.id } } },
    },
  });
  if (!fridge) {
    return NextResponse.json({ error: '找不到此冰箱' }, { status: 404 });
  }

  const items = await prisma.fridgeItem.findMany({
    where: { fridgeId, used: false },
    include: { addedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(items);
}

// POST /api/fridge — create item in a fridge
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, quantity, unit, price, expiresAt, fridgeId: bodyFridgeId } = await request.json();

  if (!name || !quantity || !unit) {
    return NextResponse.json({ error: '請填寫必要欄位' }, { status: 400 });
  }

  const fridgeId = bodyFridgeId ?? (await getDefaultFridgeId(session.user.id));

  // Verify user has access
  const fridge = await prisma.fridge.findFirst({
    where: {
      id: fridgeId,
      family: { members: { some: { userId: session.user.id } } },
    },
  });
  if (!fridge) {
    return NextResponse.json({ error: '找不到此冰箱' }, { status: 404 });
  }

  const item = await prisma.fridgeItem.create({
    data: {
      name,
      quantity,
      unit,
      price: price ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      addedById: session.user.id,
      fridgeId,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
