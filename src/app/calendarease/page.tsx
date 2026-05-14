import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, PawPrint } from 'lucide-react';
import CreateGroupForm from '@/components/calendarease/CreateGroupForm';

export default async function CalendarEasePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const groups = await prisma.calendarGroup.findMany({
    where: { members: { some: { userId: session.user.id } } },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      _count: { select: { events: true, pets: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get pets across all groups
  const groupIds = groups.map((g) => g.id);
  const pets = groupIds.length > 0
    ? await prisma.pet.findMany({
        where: { groupId: { in: groupIds } },
        include: { createdBy: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
        take: 5,
      })
    : [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100 text-2xl">
            📅
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">CalendarEase</h1>
            <p className="text-muted-foreground text-sm">行事曆與寵物管理</p>
          </div>
        </div>
      </div>

      {/* Groups Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">我的行事曆群組</h2>
          <Badge variant="outline" className="text-purple-600 border-purple-300">
            {groups.length} 個群組
          </Badge>
        </div>

        {groups.length === 0 ? (
          <Card className="mb-4">
            <CardContent className="pt-6 pb-6 text-center">
              <Calendar className="h-12 w-12 text-purple-300 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">尚無行事曆群組，建立一個開始吧！</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {groups.map((group) => (
              <Link key={group.id} href={`/calendarease/${group.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-purple-100 hover:border-purple-300">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-foreground truncate">{group.name}</h3>
                      <span className="text-purple-600 text-lg ml-2">📅</span>
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {group.members.length} 人
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {group._count.events} 筆活動
                      </span>
                      <span className="flex items-center gap-1">
                        <PawPrint className="h-3 w-3" />
                        {group._count.pets} 隻寵物
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {group.members.slice(0, 4).map((m) => (
                        <span
                          key={m.id}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-xs font-medium"
                          title={m.user.name ?? m.user.email ?? ''}
                        >
                          {(m.user.name ?? m.user.email ?? '?')[0].toUpperCase()}
                        </span>
                      ))}
                      {group.members.length > 4 && (
                        <span className="text-xs text-muted-foreground">+{group.members.length - 4}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <CreateGroupForm />
      </div>

      {/* Pets Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">寵物成員</h2>
          <Link
            href="/calendarease/pets"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            查看全部 →
          </Link>
        </div>

        {pets.length === 0 ? (
          <Card>
            <CardContent className="pt-6 pb-6 text-center">
              <PawPrint className="h-12 w-12 text-blue-300 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">尚無寵物，前往群組新增寵物！</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {pets.map((pet) => {
              const emoji =
                pet.type === 'DOG' ? '🐕' :
                pet.type === 'CAT' ? '🐈' :
                pet.type === 'RABBIT' ? '🐇' :
                pet.type === 'FISH' ? '🐠' :
                pet.type === 'BIRD' ? '🐦' :
                pet.type === 'HAMSTER' ? '🐹' : '🐾';
              return (
                <Card key={pet.id} className="border-blue-100">
                  <CardContent className="pt-4 pb-4">
                    <div className="text-2xl mb-1">{emoji}</div>
                    <div className="font-semibold text-foreground text-sm">{pet.name}</div>
                    <div className="text-xs text-muted-foreground">{pet.type}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
