import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// 移除成員 / 離開群組
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; userId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const group = await prisma.group.findUnique({
    where: { id: params.id },
    include: { members: true },
  });

  if (!group) {
    return NextResponse.json({ error: '找不到群組' }, { status: 404 });
  }

  const currentMember = group.members.find((m) => m.userId === session.user.id);
  if (!currentMember) {
    return NextResponse.json({ error: '你不是此群組的成員' }, { status: 403 });
  }

  const isAdmin = currentMember.role === 'ADMIN';
  const isSelf = params.userId === session.user.id;

  // 只有管理員可以移除他人，一般成員只能移除自己
  if (!isSelf && !isAdmin) {
    return NextResponse.json({ error: '你沒有權限移除其他成員' }, { status: 403 });
  }

  // 如果是管理員要離開，必須先轉移管理員身份
  if (isSelf && isAdmin && group.members.length > 1) {
    return NextResponse.json(
      { error: '請先將管理員轉移給其他成員再離開群組' },
      { status: 400 }
    );
  }

  await prisma.groupMember.deleteMany({
    where: { groupId: params.id, userId: params.userId },
  });

  return NextResponse.json({ success: true });
}