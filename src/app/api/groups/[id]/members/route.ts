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

  const group = await prisma.group.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  const isMember = group.members.some((m) => m.userId === session.user.id);
  if (!isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({
    members: group.members,
    currentUserId: session.user.id,
  });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { email } = await request.json();
  if (!email) {
    return NextResponse.json({ error: '請輸入 Email' }, { status: 400 });
  }

  // 確認操作者是群組成員
  const group = await prisma.group.findUnique({
    where: { id: params.id },
    include: { members: true },
  });

  if (!group) {
    return NextResponse.json({ error: '找不到群組' }, { status: 404 });
  }

  const isMember = group.members.some((m) => m.userId === session.user.id);
  if (!isMember) {
    return NextResponse.json({ error: '你不是此群組的成員' }, { status: 403 });
  }

  // 找到要邀請的用戶
  const invitedUser = await prisma.user.findUnique({ where: { email } });
  if (!invitedUser) {
    return NextResponse.json(
      { error: '找不到此 Email 的用戶，請確認對方已經註冊' },
      { status: 404 }
    );
  }

  // 確認對方還不是成員
  const alreadyMember = group.members.some((m) => m.userId === invitedUser.id);
  if (alreadyMember) {
    return NextResponse.json(
      { error: '此用戶已經是群組成員' },
      { status: 409 }
    );
  }

  // 加入群組
  await prisma.groupMember.create({
    data: {
      groupId: params.id,
      userId: invitedUser.id,
      role: 'MEMBER',
    },
  });

  return NextResponse.json({ success: true, name: invitedUser.name });
}