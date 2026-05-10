import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const items = await prisma.fridgeItem.findMany({
    where: { userId: session.user.id, used: false },
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

  const item = await prisma.fridgeItem.create({
    data: {
      name,
      quantity,
      unit,
      price: price ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      userId: session.user.id,
    },
  });

  return NextResponse.json(item, { status: 201 });
}