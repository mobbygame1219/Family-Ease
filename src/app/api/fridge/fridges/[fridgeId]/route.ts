import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/fridge/fridges/[fridgeId]
export async function DELETE(
  _request: Request,
  { params }: { params: { fridgeId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const fridge = await prisma.fridge.findUnique({
    where: { id: params.fridgeId },
    include: { family: { include: { members: true } } },
  });

  if (!fridge) {
    return NextResponse.json({ error: '找不到此冰箱' }, { status: 404 });
  }

  // Verify the user belongs to this family
  const isMember = fridge.family.members.some((m: { userId: string }) => m.userId === session.user.id);
  if (!isMember) {
    return NextResponse.json({ error: '沒有權限' }, { status: 403 });
  }

  // Check this isn't the last fridge in the family
  const count = await prisma.fridge.count({ where: { familyId: fridge.familyId } });
  if (count <= 1) {
    return NextResponse.json({ error: '至少需保留一個冰箱' }, { status: 400 });
  }

  await prisma.fridge.delete({ where: { id: params.fridgeId } });
  return NextResponse.json({ success: true });
}

// PATCH /api/fridge/fridges/[fridgeId] — rename fridge
export async function PATCH(
  request: Request,
  { params }: { params: { fridgeId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, emoji } = await request.json();

  const fridge = await prisma.fridge.findUnique({
    where: { id: params.fridgeId },
    include: { family: { include: { members: true } } },
  });

  if (!fridge) {
    return NextResponse.json({ error: '找不到此冰箱' }, { status: 404 });
  }

  const isMember = fridge.family.members.some((m: { userId: string }) => m.userId === session.user.id);
  if (!isMember) {
    return NextResponse.json({ error: '沒有權限' }, { status: 403 });
  }

  const updated = await prisma.fridge.update({
    where: { id: params.fridgeId },
    data: {
      ...(name?.trim() ? { name: name.trim() } : {}),
      ...(emoji ? { emoji } : {}),
    },
  });

  return NextResponse.json(updated);
}
