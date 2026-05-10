import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function getFamilyId(userId: string) {
  let membership = await prisma.familyMember.findFirst({
    where: { userId },
  });

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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const familyId = await getFamilyId(session.user.id);

  const items = await prisma.fridgeItem.findMany({
    where: { familyId, used: false },
    include: {
      addedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, quantity, unit, price, expiresAt } = await request.json();

  if (!name || !quantity || !unit) {
    return NextResponse.json({ error: '請填寫必要欄位' }, { status: 400 });
  }

  const familyId = await getFamilyId(session.user.id);

  const item = await prisma.fridgeItem.create({
    data: {
      name,
      quantity,
      unit,
      price: price ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      addedById: session.user.id,
      familyId,
    },
  });

  return NextResponse.json(item, { status: 201 });
}