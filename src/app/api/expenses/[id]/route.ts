import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const expense = await prisma.expense.findUnique({
    where: { id: params.id },
    include: { group: { include: { members: true } } },
  });

  if (!expense) {
    return NextResponse.json({ error: '找不到此支出' }, { status: 404 });
  }

  const isMember = expense.group.members.some((m) => m.userId === session.user.id);
  if (!isMember) {
    return NextResponse.json({ error: '你沒有權限刪除此支出' }, { status: 403 });
  }

  await prisma.expense.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}