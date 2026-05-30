'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';

interface AppLayoutProps {
  children: React.ReactNode;
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

/** Maps top-level route prefix → Tailwind bg class for the main content area. */
function getMainBg(pathname: string): string {
  if (pathname.startsWith('/splitease'))    return 'bg-green-50';
  if (pathname.startsWith('/fridge'))       return 'bg-blue-50';
  if (pathname.startsWith('/ledgerease'))   return 'bg-orange-50';
  if (pathname.startsWith('/calendarease')) return 'bg-purple-50';
  return 'bg-gray-50'; // /dashboard and everything else
}

export default function AppLayout({ children, user }: AppLayoutProps) {
  const pathname = usePathname();
  const mainBg   = getMainBg(pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar user={user} />
      </div>

      {/* Main content — bg shifts per module */}
      <main className={`flex-1 overflow-y-auto pb-16 md:pb-0 scrollbar-thin transition-colors duration-300 ${mainBg}`}>
        {children}
      </main>

      {/* Mobile bottom nav */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
