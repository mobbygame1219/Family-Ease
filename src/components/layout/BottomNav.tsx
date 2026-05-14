'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, Refrigerator, BookOpen, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard',    icon: LayoutDashboard, label: '首頁'     },
  { href: '/splitease',    icon: Receipt,          label: 'Split'   },
  { href: '/fridge',       icon: Refrigerator,     label: 'Fridge'  },
  { href: '/ledgerease',   icon: BookOpen,          label: 'Ledger'  },
  { href: '/calendarease', icon: CalendarDays,      label: 'Calendar' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-neutral-200">
      <div className="flex items-center justify-around h-[56px] px-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-[3px] flex-1 py-2 transition-colors',
                active ? 'text-neutral-900' : 'text-neutral-400'
              )}
            >
              <Icon
                className="h-[19px] w-[19px]"
                strokeWidth={active ? 2.4 : 1.8}
              />
              <span
                className={cn(
                  'text-[9.5px] leading-none',
                  active ? 'font-semibold' : 'font-normal'
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe area for iOS home indicator */}
      <div className="h-safe-area-inset-bottom bg-white/95" />
    </div>
  );
}
