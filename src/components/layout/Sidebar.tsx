'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  LogOut,
  Home,
  HandCoins,
  Refrigerator,
  NotebookPen,
  CalendarHeart,
} from 'lucide-react';

interface SidebarProps {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const navItems = [
  {
    href: '/dashboard',
    icon: Home,
    label: '家庭首頁',
    activeBorder: 'border-l-brand-500',
    activeBg:     'bg-brand-50',
    activeText:   'text-brand-700',
    inactiveIcon: 'text-neutral-400',
    activeIcon:   'text-brand-600',
  },
  {
    href: '/splitease',
    icon: HandCoins,
    label: 'SplitEase',
    activeBorder: 'border-l-split-500',
    activeBg:     'bg-split-50',
    activeText:   'text-split-600',
    inactiveIcon: 'text-neutral-400',
    activeIcon:   'text-split-600',
  },
  {
    href: '/fridge',
    icon: Refrigerator,
    label: 'Family Fridge',
    activeBorder: 'border-l-fridge-500',
    activeBg:     'bg-fridge-50',
    activeText:   'text-fridge-600',
    inactiveIcon: 'text-neutral-400',
    activeIcon:   'text-fridge-500',
  },
  {
    href: '/ledgerease',
    icon: NotebookPen,
    label: 'LedgerEase',
    activeBorder: 'border-l-ledger-500',
    activeBg:     'bg-ledger-50',
    activeText:   'text-ledger-600',
    inactiveIcon: 'text-neutral-400',
    activeIcon:   'text-ledger-500',
  },
  {
    href: '/calendarease',
    icon: CalendarHeart,
    label: 'CalendarEase',
    activeBorder: 'border-l-calendar-500',
    activeBg:     'bg-calendar-50',
    activeText:   'text-calendar-600',
    inactiveIcon: 'text-neutral-400',
    activeIcon:   'text-calendar-500',
  },
];

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const initials = user.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '??';

  return (
    <aside className="flex w-56 flex-col bg-white border-r border-gray-100 shadow-sm">

      {/* ── App header ─────────────────────────────── */}
      <div className="flex h-14 items-center gap-2.5 px-4 border-b border-gray-100 flex-shrink-0 bg-gradient-to-r from-brand-600 to-brand-500">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 select-none">
          <Home className="h-4 w-4 text-white" strokeWidth={2} />
        </div>
        <span className="text-[14px] font-bold text-white tracking-tight">
          FamilyEase
        </span>
      </div>

      {/* ── Navigation ─────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 scrollbar-hide">
        {navItems.map(({ href, icon: Icon, label, activeBorder, activeBg, activeText, inactiveIcon, activeIcon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-xl px-2.5 py-[8px] text-[13px] transition-all duration-100 select-none border-l-[3px]',
                active
                  ? `${activeBg} ${activeText} ${activeBorder} font-semibold`
                  : 'border-l-transparent text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 font-normal'
              )}
            >
              <Icon
                className={cn(
                  'h-[15px] w-[15px] flex-shrink-0 transition-colors',
                  active ? activeIcon : inactiveIcon
                )}
                strokeWidth={active ? 2.25 : 1.75}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* ── User footer ────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-gray-100 p-2">
        <div className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 group hover:bg-neutral-50 transition-colors">
          {/* Avatar */}
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-[11px] font-bold text-white flex-shrink-0 shadow-sm">
            {initials}
          </div>
          {/* Name + email */}
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-neutral-700 truncate leading-tight">
              {user.name}
            </div>
            <div className="text-[11px] text-neutral-400 truncate leading-tight">
              {user.email}
            </div>
          </div>
          {/* Sign-out icon */}
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            title="登出"
            className="flex-shrink-0 p-1 rounded-lg text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

    </aside>
  );
}
