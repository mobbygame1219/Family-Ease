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

// GET /api/fridge/recipes — list family recipes
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const familyId = await getFamilyId(session.user.id);

  const recipes = await prisma.recipe.findMany({
    where: { familyId },
    include: {
      ingredients: true,
      steps: { orderBy: { order: 'asc' } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { ingredients: true, steps: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(recipes);
}

// POST /api/fridge/recipes — create a recipe
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, description, servings, cookTime, category, ingredients, steps } =
    await request.json();

  if (!title?.trim()) {
    return NextResponse.json({ error: '請輸入食譜名稱' }, { status: 400 });
  }

  const familyId = await getFamilyId(session.user.id);

  const recipe = await prisma.recipe.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      servings: parseInt(servings) || 2,
      cookTime: cookTime ? parseInt(cookTime) : null,
      category: category ?? 'DINNER',
      familyId,
      createdById: session.user.id,
      ingredients: {
        create: (ingredients ?? []).map((ing: {
          name: string; quantity: number; unit: string; optional?: boolean;
        }) => ({
          name: ing.name.trim(),
          quantity: Number(ing.quantity),
          unit: ing.unit,
          optional: ing.optional ?? false,
        })),
      },
      steps: {
        create: (steps ?? []).map((s: { order: number; description: string }) => ({
          order: s.order,
          description: s.description.trim(),
        })),
      },
    },
    include: { ingredients: true, steps: { orderBy: { order: 'asc' } } },
  });

  return NextResponse.json(recipe, { status: 201 });
}
