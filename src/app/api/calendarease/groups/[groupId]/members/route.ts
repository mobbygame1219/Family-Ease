import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { groupId } = params;
    const body = await request.json();
    const { email } = body as { email: string };

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Look up the user by email
    const targetUser = await prisma.user.findUnique({
      where: { email: email.trim() },
    });

    if (!targetUser) {
      return NextResponse.json({ error: '找不到此 Email 的用戶' }, { status: 404 });
    }

    // Check if already a member
    const existingMember = await prisma.calendarMember.findUnique({
      where: {
        userId_groupId: {
          userId: targetUser.id,
          groupId,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json({ error: '此用戶已是成員' }, { status: 409 });
    }

    // Verify the current user is OWNER of this group
    const ownerMembership = await prisma.calendarMember.findFirst({
      where: {
        userId: session.user.id,
        groupId,
        role: 'OWNER',
      },
    });

    if (!ownerMembership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create the new member
    const member = await prisma.calendarMember.create({
      data: {
        userId: targetUser.id,
        groupId,
        role: 'MEMBER',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('[calendarease/groups/[groupId]/members/POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
