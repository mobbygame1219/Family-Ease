import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// 取得或建立家庭群組
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 查看用戶是否已有家庭群組
  const membership = await prisma.familyMember.findFirst({
    where: { userId: session.user.id },
    include: {
      family: {
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
    },
  });

  if (membership) {
    return NextResponse.json(membership.family);
  }

  // 沒有就自動建立一個
  const family = await prisma.familyGroup.create({
    data: {
      name: `${session.user.name}的家庭`,
      createdById: session.user.id,
      members: {
        create: { userId: session.user.id, role: 'ADMIN' },
      },
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  return NextResponse.json(family);
}
