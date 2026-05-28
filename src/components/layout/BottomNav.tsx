'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, HandCoins, Refrigerator, NotebookPen, CalendarHeart } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard',    icon: Home,          label: '首頁',     activeColor: 'text-brand-600'    },
  { href: '/splitease',    icon: HandCoins,     label: 'Split',    activeColor: 'text-split-600'    },
  { href: '/fridge',       icon: Refrigerator,  label: 'Fridge',   activeColor: 'text-fridge-500'   },
  { href: '/ledgerease',   icon: NotebookPen,   label: 'Ledger',   activeColor: 'text-ledger-500'   },
  { href: '/calendarease', icon: CalendarHeart, label: 'Calendar', activeColor: 'text-calendar-500' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-gray-100">
      <div className="flex items-center justify-around h-[56px] px-1">
        {navItems.map(({ href, icon: Icon, label, activeColor }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-[3px] flex-1 py-2 transition-colors',
                active ? activeColor : 'text-neutral-400'
              )}
            >
              <Icon
                className="h-[19px] w-[19px]"
                strokeWidth={active ? 2.25 : 1.75}
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
      <div className="h-safe-area-inset-bottom bg-white/90" />
    </div>
  );
}
