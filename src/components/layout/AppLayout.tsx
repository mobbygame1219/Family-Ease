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
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* 桌機側邊欄 */}
      <div className="hidden md:flex">
        <Sidebar user={user} />
      </div>

      {/* 主內容 */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {children}
      </main>

      {/* 手機底部導航 */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}