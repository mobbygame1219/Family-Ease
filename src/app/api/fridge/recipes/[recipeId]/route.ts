import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type Params = { params: { recipeId: string } };

async function verifyAccess(recipeId: string, userId: string) {
  const recipe = await prisma.recipe.findFirst({
    where: {
      id: recipeId,
      family: { members: { some: { userId } } },
    },
    include: {
      ingredients: true,
      steps: { orderBy: { order: 'asc' } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  return recipe;
}

// GET /api/fridge/recipes/[recipeId]
export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const recipe = await verifyAccess(params.recipeId, session.user.id);
  if (!recipe) return NextResponse.json({ error: '找不到此食譜' }, { status: 404 });

  return NextResponse.json(recipe);
}

// PUT /api/fridge/recipes/[recipeId] — full update
export async function PUT(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await verifyAccess(params.recipeId, session.user.id);
  if (!existing) return NextResponse.json({ error: '找不到此食譜' }, { status: 404 });

  const { title, description, servings, cookTime, category, ingredients, steps } =
    await request.json();

  if (!title?.trim()) {
    return NextResponse.json({ error: '請輸入食譜名稱' }, { status: 400 });
  }

  // Replace ingredients and steps atomically
  const recipe = await prisma.$transaction(async (tx) => {
    await tx.recipeIngredient.deleteMany({ where: { recipeId: params.recipeId } });
    await tx.recipeStep.deleteMany({ where: { recipeId: params.recipeId } });

    return tx.recipe.update({
      where: { id: params.recipeId },
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        servings: parseInt(servings) || 2,
        cookTime: cookTime ? parseInt(cookTime) : null,
        category: category ?? 'DINNER',
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
  });

  return NextResponse.json(recipe);
}

// DELETE /api/fridge/recipes/[recipeId]
export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await verifyAccess(params.recipeId, session.user.id);
  if (!existing) return NextResponse.json({ error: '找不到此食譜' }, { status: 404 });

  await prisma.recipe.delete({ where: { id: params.recipeId } });
  return NextResponse.json({ success: true });
}
