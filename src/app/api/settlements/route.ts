import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // 取得所有未結清的分帳
  const unsettledSplits = await prisma.expenseSplit.findMany({
    where: { settled: false },
    include: {
      expense: {
        include: {
          paidBy: { select: { id: true, name: true } },
          group: { select: { id: true, name: true } },
        },
      },
      user: { select: { id: true, name: true } },
    },
  });

  // 計算每個群組的淨餘額
  const balances: Record<string, Record<string, number>> = {};

  for (const split of unsettledSplits) {
    const groupId = split.expense.groupId;
    const payerId = split.expense.paidById;
    const owerId = split.userId;

    if (payerId === owerId) continue;

    if (!balances[groupId]) balances[groupId] = {};
    const key = `${owerId}:${payerId}`;
    balances[groupId][key] = (balances[groupId][key] ?? 0) + split.amount;
  }

  // 取得群組資訊
  const groups = await prisma.group.findMany({
    where: { members: { some: { userId } } },
    select: { id: true, name: true },
  });
  const groupMap = Object.fromEntries(groups.map((g) => [g.id, g.name]));

  // 取得所有相關用戶名稱
  const userIds = new Set<string>();
  Object.values(balances).forEach((gb) => {
    Object.keys(gb).forEach((key) => {
      const [a, b] = key.split(':');
      userIds.add(a);
      userIds.add(b);
    });
  });

  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(userIds) } },
    select: { id: true, name: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

  // 只回傳跟目前用戶有關的帳款
  const debts: {
    fromId: string; fromName: string;
    toId: string; toName: string;
    amount: number;
    groupId: string; groupName: string;
  }[] = [];

  for (const [groupId, groupBalances] of Object.entries(balances)) {
    if (!groupMap[groupId]) continue;
    for (const [key, amount] of Object.entries(groupBalances)) {
      const [fromId, toId] = key.split(':');
      if (fromId !== userId && toId !== userId) continue;
      if (amount < 0.01) continue;
      debts.push({
        fromId,
        fromName: userMap[fromId] ?? '未知',
        toId,
        toName: userMap[toId] ?? '未知',
        amount: Math.round(amount * 100) / 100,
        groupId,
        groupName: groupMap[groupId],
      });
    }
  }

  return NextResponse.json({ debts, currentUserId: userId });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { payerId, receiverId, amount, groupId } = await request.json();

  // 把相關的 splits 標記為已結清
  await prisma.expenseSplit.updateMany({
    where: {
      userId: payerId,
      settled: false,
      expense: {
        groupId,
        paidById: receiverId,
      },
    },
    data: { settled: true, settledAt: new Date() },
  });

  // 記錄結清記錄
  await prisma.settlement.create({
    data: {
      payerId,
      receiverId,
      amount,
      groupId,
    },
  });

  return NextResponse.json({ success: true });
}