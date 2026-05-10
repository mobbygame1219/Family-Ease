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

  const group = await prisma.group.findUnique({
    where: { id: params.id },
    include: { members: true },
  });

  if (!group) {
    return NextResponse.json({ error: '找不到群組' }, { status: 404 });
  }

  // 只有創建者可以刪除群組
  if (group.createdById !== session.user.id) {
    return NextResponse.json({ error: '只有群組創建者可以刪除群組' }, { status: 403 });
  }

  await prisma.group.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}