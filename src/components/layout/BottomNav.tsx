'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, Users, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { cn } from '@/utils/cn';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: '首頁' },
  { href: '/splitease', icon: Receipt, label: 'SplitEase' },
  { href: '/fridge', icon: Users, label: 'Fridge' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors',
                active ? 'text-green-600' : 'text-gray-400'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}

        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg text-gray-400"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-xs font-medium">登出</span>
        </button>
      </div>
    </div>
  );
}