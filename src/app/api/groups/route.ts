// src/app/api/groups/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.enum(['HOME', 'TRIP', 'FOOD', 'WORK', 'OTHER']).default('OTHER'),
});

// GET /api/groups — list groups for the current user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const groups = await prisma.group.findMany({
    where: {
      members: { some: { userId: session.user.id } },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
      _count: { select: { expenses: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(groups);
}

// POST /api/groups — create a new group
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createGroupSchema.parse(body);

    const group = await prisma.group.create({
      data: {
        ...data,
        createdById: session.user.id,
        members: {
          create: { userId: session.user.id, role: 'ADMIN' },
        },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        _count: { select: { expenses: true } },
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('[groups/POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
