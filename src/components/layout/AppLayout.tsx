'use client';

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

export default function AppLayout({ children, user }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F9FA]">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar user={user} />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 scrollbar-thin">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
