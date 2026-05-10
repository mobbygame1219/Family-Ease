import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const expense = await prisma.expense.findUnique({
    where: { id: params.id },
    include: {
      splits: { include: { user: { select: { id: true, name: true } } } },
      paidBy: { select: { id: true, name: true } },
    },
  });

  if (!expense) {
    return NextResponse.json({ error: '找不到此支出' }, { status: 404 });
  }

  return NextResponse.json(expense);
}

export async function PUT(
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
    return NextResponse.json({ error: '你沒有權限編輯此支出' }, { status: 403 });
  }

  const { title, amount, category, paidById, date, splits } = await request.json();

  // 刪除舊的分帳，重新建立
  await prisma.expenseSplit.deleteMany({ where: { expenseId: params.id } });

  const updated = await prisma.expense.update({
    where: { id: params.id },
    data: {
      title,
      amount,
      category,
      paidById,
      date: new Date(date),
      splits: {
        create: splits,
      },
    },
  });

  return NextResponse.json(updated);
}

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