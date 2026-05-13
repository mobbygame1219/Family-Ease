import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { formatCurrency } from '@/utils/balance';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users, Receipt, CheckCircle, ArrowRight } from 'lucide-react';

export default async function SplitEasePage() {
  const session = await getServerSession(authOptions);

  const groups = await prisma.group.findMany({
    where: { members: { some: { userId: session!.user.id } } },
    include: {
      members: { include: { user: { select: { id: true, name: true } } } },
      _count: { select: { expenses: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const categoryIcon = (cat: string) => {
    if (cat === 'TRIP') return '✈️';
    if (cat === 'HOME') return '🏠';
    if (cat === 'FOOD') return '🍕';
    if (cat === 'WORK') return '💼';
    return '👥';
  };

  const quickActions = [
    { href: '/groups/new', icon: PlusCircle, label: '新增群組', desc: '建立新的分帳群組' },
    { href: '/groups', icon: Users, label: '我的群組', desc: '查看所有群組' },
    { href: '/expenses', icon: Receipt, label: '支出記錄', desc: '所有支出明細' },
    { href: '/settlements', icon: CheckCircle, label: '結清帳款', desc: '處理待結清款項' },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
            💰
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">SplitEase</h1>
            <p className="text-muted-foreground text-sm">分帳、記錄支出、結清帳款</p>
          </div>
        </div>
      </div>

      {/* 快捷功能 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {quickActions.map((item) => (
          <Link key={item.href} href={item.href} className="group">
            <Card className="h-full hover:shadow-md hover:border-primary/30 transition-all duration-200">
              <CardContent className="pt-4 pb-4 flex flex-col items-center text-center gap-2">
                <item.icon className="h-6 w-6 text-primary" />
                <div className="text-sm font-semibold text-foreground">{item.label}</div>
                <div className="text-xs text-muted-foreground hidden sm:block">{item.desc}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* 群組列表 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">你的群組</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/groups/new">
              <PlusCircle className="h-4 w-4" />
              新增群組
            </Link>
          </Button>
        </div>

        {groups.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <div className="text-4xl mb-4">👥</div>
              <p className="text-foreground font-medium mb-1">還沒有群組</p>
              <p className="text-muted-foreground text-sm mb-6">建立群組後，邀請家人或朋友一起分帳</p>
              <Button asChild>
                <Link href="/groups/new">建立第一個群組</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groups.map((g) => (
              <Link key={g.id} href={`/groups/${g.id}`} className="group">
                <Card className="hover:shadow-md hover:border-primary/30 transition-all duration-200">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-2xl shrink-0">
                        {categoryIcon(g.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground truncate">{g.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {new Date(g.updatedAt).toLocaleDateString('zh-TW')}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="gap-1">
                        <Users className="h-3 w-3" />
                        {g.members.length} 位
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <Receipt className="h-3 w-3" />
                        {g._count.expenses} 筆
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
