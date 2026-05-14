'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Refrigerator,
  Receipt,
  LogOut,
  BookOpen,
  CalendarDays,
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
  { href: '/dashboard',    icon: LayoutDashboard, label: '家庭首頁'     },
  { href: '/splitease',    icon: Receipt,          label: 'SplitEase'   },
  { href: '/fridge',       icon: Refrigerator,     label: 'Family Fridge' },
  { href: '/ledgerease',   icon: BookOpen,          label: 'LedgerEase'  },
  { href: '/calendarease', icon: CalendarDays,      label: 'CalendarEase' },
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
    <aside className="flex w-56 flex-col bg-white border-r border-neutral-200">

      {/* ── App header ─────────────────────────────── */}
      <div className="flex h-12 items-center gap-2.5 px-4 border-b border-neutral-200 flex-shrink-0">
        <div className="flex h-[22px] w-[22px] items-center justify-center rounded-[5px] bg-neutral-900 text-white text-[11px] font-bold select-none">
          F
        </div>
        <span className="text-[13px] font-semibold text-neutral-900 tracking-tight">
          FamilyEase
        </span>
      </div>

      {/* ── Navigation ─────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 scrollbar-hide">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] transition-colors duration-100 select-none',
                active
                  ? 'bg-neutral-100 text-neutral-900 font-medium'
                  : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800 font-normal'
              )}
            >
              <Icon
                className={cn(
                  'h-[15px] w-[15px] flex-shrink-0',
                  active ? 'text-neutral-700' : 'text-neutral-400'
                )}
                strokeWidth={active ? 2.2 : 1.8}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* ── User footer ────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-neutral-200 p-2">
        <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2 group">
          {/* Avatar */}
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-semibold text-neutral-600 flex-shrink-0">
            {initials}
          </div>
          {/* Name + email */}
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium text-neutral-700 truncate leading-tight">
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
            className="flex-shrink-0 p-1 rounded text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 transition-colors opacity-0 group-hover:opacity-100"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

    </aside>
  );
}
