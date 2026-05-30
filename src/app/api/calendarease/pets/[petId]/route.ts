import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ─── Helper: verify caller is a group member of the pet's group ───────────────
async function getMembershipForPet(petId: string, userId: string) {
  const pet = await prisma.pet.findUnique({
    where: { id: petId },
    select: { groupId: true, color: true },
  });
  if (!pet) return null;

  const membership = await prisma.calendarMember.findUnique({
    where: { userId_groupId: { userId, groupId: pet.groupId } },
  });
  return membership ? pet : null;
}

// PUT /api/calendarease/pets/[petId]
// body: { name?, type?, color?, quickActions? }
export async function PUT(
  request: Request,
  { params }: { params: { petId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const petMeta = await getMembershipForPet(params.petId, session.user.id);
  if (!petMeta) {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });
  }

  try {
    const { name, type, color, quickActions } = (await request.json()) as {
      name?: string;
      type?: string;
      color?: string | null;
      quickActions?: string | null;
    };

    const updated = await prisma.pet.update({
      where: { id: params.petId },
      data: {
        ...(name         !== undefined && { name }),
        ...(type         !== undefined && { type }),
        ...(color        !== undefined && { color }),
        ...(quickActions !== undefined && { quickActions }),
      },
      include: { _count: { select: { logs: true } } },
    });

    // ── Sync color to all calendar events linked to this pet ──────────────────
    // Only update when the caller explicitly provided a (possibly null) color
    if (color !== undefined) {
      await prisma.calendarEvent.updateMany({
        where: { petId: params.petId },
        data:  { color: color ?? '#57a65f' },   // fallback to default green
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[pets/[petId] PUT]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/calendarease/pets/[petId]
export async function DELETE(
  _request: Request,
  { params }: { params: { petId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const petMeta = await getMembershipForPet(params.petId, session.user.id);
  if (!petMeta) {
    return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });
  }

  try {
    await prisma.pet.delete({ where: { id: params.petId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[pets/[petId] DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
