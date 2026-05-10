// src/app/api/expenses/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { splitEqually } from '@/utils/balance';

const createExpenseSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  category: z.enum(['FOOD', 'TRANSPORT', 'ACCOMMODATION', 'ENTERTAINMENT', 'UTILITIES', 'SHOPPING', 'HEALTH', 'OTHER']).default('OTHER'),
  date: z.string().datetime().optional(),
  groupId: z.string(),
  paidById: z.string(),
  splitType: z.enum(['EQUAL', 'EXACT', 'PERCENTAGE']).default('EQUAL'),
  // For EXACT: { userId: string, amount: number }[]
  // For PERCENTAGE: { userId: string, percentage: number }[]
  // For EQUAL: just memberIds
  splits: z.array(z.object({
    userId: z.string(),
    amount: z.number().optional(),
    percentage: z.number().optional(),
  })).optional(),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createExpenseSchema.parse(body);

    // Verify user is member of the group
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: session.user.id, groupId: data.groupId } },
    });
    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });
    }

    // Calculate splits
    let splitAmounts: Array<{ userId: string; amount: number }> = [];

    if (data.splitType === 'EQUAL') {
      const memberIds = data.splits?.map((s) => s.userId) ?? [session.user.id];
      const amounts = splitEqually(data.amount, memberIds.length);
      splitAmounts = memberIds.map((userId, i) => ({ userId, amount: amounts[i] }));
    } else if (data.splitType === 'EXACT') {
      splitAmounts = (data.splits ?? []).map((s) => ({ userId: s.userId, amount: s.amount! }));
    } else if (data.splitType === 'PERCENTAGE') {
      splitAmounts = (data.splits ?? []).map((s) => ({
        userId: s.userId,
        amount: Math.round((data.amount * s.percentage!) / 100 * 100) / 100,
      }));
    }

    const expense = await prisma.expense.create({
      data: {
        title: data.title,
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        category: data.category,
        date: data.date ? new Date(data.date) : new Date(),
        groupId: data.groupId,
        paidById: data.paidById,
        splits: {
          create: splitAmounts,
        },
      },
      include: {
        paidBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
        splits: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
      },
    });

    // 記錄活動
await prisma.activity.create({
  data: {
    type: 'EXPENSE_ADDED',
    message: `新增了支出「${expense.title}」$${expense.amount}`,
    userId: session.user.id,
    groupId: data.groupId,
  },
});
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('[expenses/POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
