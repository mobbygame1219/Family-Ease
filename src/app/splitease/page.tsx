import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { formatCurrency } from '@/utils/balance';
import {
  PlusCircle, Users, Receipt, CheckCircle, ArrowRight,
  HandCoins, Plane, Home, UtensilsCrossed, Briefcase,
  type LucideIcon,
} from 'lucide-react';

// Map group category to a Lucide icon
const CATEGORY_ICON: Record<string, LucideIcon> = {
  TRIP: Plane,
  HOME: Home,
  FOOD: UtensilsCrossed,
  WORK: Briefcase,
};
const categoryIcon = (cat: string): LucideIcon => CATEGORY_ICON[cat] ?? Users;

const quickActions = [
  { href: '/groups/new', icon: PlusCircle,  label: '新增群組', desc: '建立新的分帳群組' },
  { href: '/groups',     icon: Users,        label: '我的群組', desc: '查看所有群組'   },
  { href: '/expenses',   icon: Receipt,      label: '支出記錄', desc: '所有支出明細'   },
  { href: '/settlements',icon: CheckCircle,  label: '結清帳款', desc: '處理待結清款項' },
];

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

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* ── Green gradient banner ─────────────────────── */}
      <div className="page-banner bg-gradient-to-r from-split-600 to-split-500 text-white mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <HandCoins className="h-6 w-6 text-white" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SplitEase</h1>
            <p className="text-split-100 text-sm mt-0.5">分帳、記錄支出、結清帳款</p>
          </div>
        </div>
      </div>

      {/* 快捷功能 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {quickActions.map((item) => (
          <Link key={item.href} href={item.href} className="group">
            <div className="h-full rounded-2xl border border-split-100 bg-split-50 hover:border-split-500 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 px-4 py-4 flex flex-col items-center text-center gap-2">
              <item.icon className="h-6 w-6 text-split-600" strokeWidth={1.75} />
              <div className="text-sm font-semibold text-neutral-800">{item.label}</div>
              <div className="text-xs text-neutral-500 hidden sm:block">{item.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* 群組列表 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-800">你的群組</h2>
          <Link
            href="/groups/new"
            className="flex items-center gap-1.5 rounded-xl bg-split-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-split-500 transition-colors"
          >
            <PlusCircle className="h-4 w-4" strokeWidth={1.75} />
            新增群組
          </Link>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 py-16 text-center">
            <Users className="h-10 w-10 text-neutral-300 mx-auto mb-4" strokeWidth={1.5} />
            <p className="text-neutral-700 font-medium mb-1">還沒有群組</p>
            <p className="text-neutral-500 text-sm mb-6">建立群組後，邀請家人或朋友一起分帳</p>
            <Link
              href="/groups/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-split-600 px-4 py-2 text-sm font-semibold text-white hover:bg-split-500 transition-colors"
            >
              建立第一個群組
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groups.map((g) => {
              const CatIcon = categoryIcon(g.category);
              return (
                <Link key={g.id} href={`/groups/${g.id}`} className="group">
                  <div className="rounded-2xl border border-neutral-200 bg-white hover:border-split-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-split-50 shrink-0">
                        <CatIcon className="h-5 w-5 text-split-600" strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-neutral-900 truncate">{g.name}</div>
                        <div className="text-xs text-neutral-400 mt-0.5">
                          {new Date(g.updatedAt).toLocaleDateString('zh-TW')}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-neutral-300 group-hover:text-split-500 group-hover:translate-x-0.5 transition-all" strokeWidth={1.75} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-split-50 border border-split-100 px-2.5 py-0.5 text-[11px] font-medium text-split-700">
                        <Users className="h-3 w-3" />
                        {g.members.length} 位
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-neutral-50 border border-neutral-200 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600">
                        <Receipt className="h-3 w-3" />
                        {g._count.expenses} 筆
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
