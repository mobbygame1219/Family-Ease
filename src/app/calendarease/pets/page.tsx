import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, PawPrint } from 'lucide-react';
import AddPetForm from '@/components/calendarease/AddPetForm';
import PetLogButtons from '@/components/calendarease/PetLogButtons';

const PET_EMOJI: Record<string, string> = {
  DOG: '🐕',
  CAT: '🐈',
  RABBIT: '🐇',
  FISH: '🐠',
  BIRD: '🐦',
  HAMSTER: '🐹',
  OTHER: '🐾',
};

const PET_TYPE_LABEL: Record<string, string> = {
  DOG: '狗',
  CAT: '貓',
  RABBIT: '兔',
  FISH: '魚',
  BIRD: '鳥',
  HAMSTER: '倉鼠',
  OTHER: '其他',
};

export default async function PetsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const groups = await prisma.calendarGroup.findMany({
    where: { members: { some: { userId: session.user.id } } },
    select: { id: true, name: true },
    orderBy: { createdAt: 'desc' },
  });

  const groupIds = groups.map((g) => g.id);

  const pets = groupIds.length > 0
    ? await prisma.pet.findMany({
        where: { groupId: { in: groupIds } },
        include: {
          _count: { select: { logs: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { name: 'asc' },
      })
    : [];

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link href="/calendarease" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-xl">
              🐾
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">寵物成員</h1>
              <p className="text-xs text-muted-foreground">{pets.length} 隻寵物</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Pet Form */}
      <div className="mb-6">
        <AddPetForm groups={groups} />
      </div>

      {/* Pet Cards */}
      {pets.length === 0 ? (
        <Card className="border-blue-100">
          <CardContent className="pt-8 pb-8 text-center">
            <PawPrint className="h-14 w-14 text-blue-200 mx-auto mb-3" />
            <p className="text-muted-foreground">尚無寵物紀錄，新增一隻吧！</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {pets.map((pet) => {
            const emoji = PET_EMOJI[pet.type] ?? '🐾';
            const birthday = pet.birthday
              ? new Date(pet.birthday).toLocaleDateString('zh-TW', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })
              : null;

            return (
              <Card key={pet.id} className="border-blue-100 hover:border-blue-300 transition-colors">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                      {emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{pet.name}</h3>
                        <Badge
                          variant="outline"
                          className="text-blue-600 border-blue-200 text-xs"
                        >
                          {PET_TYPE_LABEL[pet.type] ?? pet.type}
                        </Badge>
                      </div>
                      {birthday && (
                        <p className="text-xs text-muted-foreground mt-0.5">🎂 {birthday}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        記錄 {pet._count.logs} 筆 · 由 {pet.createdBy.name} 新增
                      </p>
                    </div>
                  </div>

                  {/* Quick Log Buttons */}
                  <PetLogButtons petId={pet.id} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
