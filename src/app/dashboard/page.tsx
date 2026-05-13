import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { formatCurrency } from '@/utils/balance';
import ActivityFeed from '@/components/ActivityFeed';
import ExpenseChart from '@/components/ExpenseChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';

async function getDashboardData(userId: string) {
  const [groups, recentExpenses] = await Promise.all([
    prisma.group.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        _count: { select: { expenses: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
    prisma.expense.findMany({
      where: { group: { members: { some: { userId } } } },
      include: {
        paidBy: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } },
        splits: { where: { userId }, select: { amount: true, settled: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ]);

  const unsettledSplits = await prisma.expenseSplit.findMany({
    where: { userId, settled: false },
    include: { expense: { select: { paidById: true, amount: true } } },
  });

  let totalOwe = 0;
  for (const split of unsettledSplits) {
    if (split.expense.paidById === userId) continue;
    totalOwe += split.amount;
  }

  const myPaidSplits = await prisma.expenseSplit.findMany({
    where: { expense: { paidById: userId }, settled: false, userId: { not: userId } },
    select: { amount: true },
  });
  const totalOwed = myPaidSplits.reduce((sum, s) => sum + s.amount, 0);

  const categoryStats = await prisma.expense.groupBy({
    by: ['category'],
    where: { group: { members: { some: { userId } } } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const activities = await prisma.activity.findMany({
    where: {
      group: { members: { some: { userId } } },
      createdAt: { gte: sevenDaysAgo },
    },
    include: {
      user: { select: { id: true, name: true } },
      group: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return { groups, recentExpenses, totalOwed, totalOwe, categoryStats, activities };
}

const features = [
  {
    href: '/splitease',
    icon: '💰',
    title: 'SplitEase',
    desc: '分帳、記錄支出、結清帳款',
    gradient: 'from-green-500 to-emerald-600',
    badge: 'bg-green-100 text-green-700',
  },
  {
    href: '/fridge',
    icon: '🧊',
    title: 'Family Fridge',
    desc: '管理冰箱食材、掃描收據、設計菜單',
    gradient: 'from-blue-500 to-cyan-600',
    badge: 'bg-blue-100 text-blue-700',
  },
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const { groups, recentExpenses, totalOwed, totalOwe, categoryStats, activities } =
    await getDashboardData(session!.user.id);

  const netBalance = totalOwed - totalOwe;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* 歡迎標題 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          嗨，{session!.user.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">歡迎回到 FamilyEase</p>
      </div>

      {/* 功能模組卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {features.map((f) => (
          <Link key={f.href} href={f.href} className="group">
            <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
              <div className={`h-1.5 bg-gradient-to-r ${f.gradient}`} />
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-2xl shrink-0">
                    {f.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-foreground text-base mb-0.5">{f.title}</div>
                    <div className="text-sm text-muted-foreground">{f.desc}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all mt-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* SplitEase 快速總覽 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">💰 SplitEase 總覽</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/splitease" className="text-primary">
              查看更多 →
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                別人欠你
              </div>
              <div className="text-2xl font-bold text-primary">{formatCurrency(totalOwed)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                你欠別人
              </div>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(totalOwe)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                <Minus className="h-3.5 w-3.5" />
                淨餘額
              </div>
              <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 最近支出 */}
        {recentExpenses.length > 0 && (
          <Card>
            <div className="divide-y divide-border">
              {recentExpenses.slice(0, 4).map((e) => {
                const myShare = e.splits[0]?.amount ?? 0;
                const iPaid = e.paidBy.id === session!.user.id;
                return (
                  <div key={e.id} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <div className="font-medium text-sm text-foreground">{e.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {e.group.name} · {e.paidBy.name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-foreground">{formatCurrency(e.amount)}</div>
                      {iPaid ? (
                        <Badge variant="success" className="text-xs mt-0.5">你付款</Badge>
                      ) : myShare > 0 ? (
                        <Badge variant="destructive" className="text-xs mt-0.5 bg-red-100 text-red-700 border-0 shadow-none">
                          欠 {formatCurrency(myShare)}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* 支出圖表 */}
      {categoryStats.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">支出類別分析</h2>
          <Card>
            <CardContent className="pt-5">
              <ExpenseChart data={categoryStats} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* 最近動態 */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">最近動態</h2>
        <ActivityFeed activities={activities} />
      </div>
    </div>
  );
}
