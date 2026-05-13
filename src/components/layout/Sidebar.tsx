'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Refrigerator, Receipt, LogOut, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface SidebarProps {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: '家庭首頁' },
  { href: '/splitease', icon: Receipt, label: 'SplitEase' },
  { href: '/fridge', icon: Refrigerator, label: 'Family Fridge' },
];

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const initials = user.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? '??';

  return (
    <aside className="flex w-60 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-base">
          🏠
        </div>
        <span className="font-bold text-foreground text-lg">FamilyEase</span>
      </div>

      <Separator />

      <nav className="flex-1 space-y-0.5 p-3">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className={cn('h-4 w-4', active ? 'text-primary' : '')} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 space-y-1">
        <Separator className="mb-3" />
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground truncate text-xs">{user.name}</div>
            <div className="text-muted-foreground truncate text-xs">{user.email}</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-full justify-start text-muted-foreground hover:text-foreground gap-3"
        >
          <LogOut className="h-4 w-4" />
          登出
        </Button>
      </div>
    </aside>
  );
}
