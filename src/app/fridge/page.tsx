import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import FridgeItemCard from '@/components/fridge/FridgeItemCard';
import InviteFamilyMember from '@/components/fridge/InviteFamilyMember';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Camera, Plus, ChefHat, Refrigerator } from 'lucide-react';

async function getFamilyData(userId: string) {
  let membership = await prisma.familyMember.findFirst({
    where: { userId },
    include: {
      family: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      },
    },
  });

  if (!membership) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const family = await prisma.familyGroup.create({
      data: {
        name: `${user?.name}的家庭`,
        createdById: userId,
        members: { create: { userId, role: 'ADMIN' } },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
    return { family, familyId: family.id };
  }

  return { family: membership.family, familyId: membership.familyId };
}

export default async function FridgePage() {
  const session = await getServerSession(authOptions);
  const { family, familyId } = await getFamilyData(session!.user.id);

  const items = await prisma.fridgeItem.findMany({
    where: { familyId, used: false },
    include: { addedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const usedItems = await prisma.fridgeItem.findMany({
    where: { familyId, used: true },
    include: { addedBy: { select: { id: true, name: true } } },
    orderBy: { usedAt: 'desc' },
    take: 5,
  });

  const expiringSoon = items.filter(
    (i) => i.expiresAt && new Date(i.expiresAt).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000
  ).length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-2xl">
              🧊
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Family Fridge</h1>
              <p className="text-muted-foreground text-sm">
                目前有 {items.length} 樣食材
                {expiringSoon > 0 && (
                  <Badge variant="warning" className="ml-2 text-xs">
                    {expiringSoon} 樣即將到期
                  </Badge>
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/fridge/scan">
              <Camera className="h-4 w-4" />
              掃描收據
            </Link>
          </Button>
          <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700">
            <Link href="/fridge/new">
              <Plus className="h-4 w-4" />
              新增食材
            </Link>
          </Button>
        </div>
      </div>

      {/* 家庭成員 */}
      <Card className="mb-5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">家庭成員</h3>
            <Badge variant="secondary">{family.members.length} 人</Badge>
          </div>
          <div className="flex items-center gap-3 flex-wrap mb-3">
            {family.members.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">
                    {m.user.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-foreground">
                  {m.user.name}
                  {m.userId === session!.user.id && (
                    <span className="ml-1 text-xs text-muted-foreground">（你）</span>
                  )}
                </span>
              </div>
            ))}
          </div>
          <Separator className="mb-3" />
          <InviteFamilyMember />
        </CardContent>
      </Card>

      {/* AI 菜單入口 */}
      <Link href="/fridge/menu" className="group block mb-6">
        <Card className="border-orange-200 bg-orange-50/50 hover:border-orange-300 hover:shadow-md transition-all duration-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-2xl shrink-0">
                👨‍🍳
              </div>
              <div className="flex-1">
                <div className="font-semibold text-orange-900">設計今天的菜單</div>
                <div className="text-sm text-orange-600/80">根據冰箱食材和預算，讓 AI 幫你設計菜單</div>
              </div>
              <ChefHat className="h-5 w-5 text-orange-400 group-hover:text-orange-600 transition-colors" />
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* 食材列表 */}
      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="text-4xl mb-4">🥬</div>
            <p className="text-foreground font-medium mb-1">冰箱是空的</p>
            <p className="text-muted-foreground text-sm mb-6">新增食材或掃描購物收據</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" asChild>
                <Link href="/fridge/scan">
                  <Camera className="h-4 w-4" />
                  掃描收據
                </Link>
              </Button>
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href="/fridge/new">
                  <Plus className="h-4 w-4" />
                  手動新增
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {items.map((item) => (
            <FridgeItemCard key={item.id} item={item} addedByName={item.addedBy.name ?? ''} />
          ))}
        </div>
      )}

      {/* 最近用完的食材 */}
      {usedItems.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            最近用完的食材
          </h2>
          <Card>
            <div className="divide-y divide-border">
              {usedItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground/50 line-through text-sm">{item.name}</span>
                    <span className="text-xs text-muted-foreground/40">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground/40">
                    <span>{item.addedBy.name}</span>
                    <span>{item.usedAt ? new Date(item.usedAt).toLocaleDateString('zh-TW') : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
