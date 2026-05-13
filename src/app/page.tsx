import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect('/dashboard');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 px-4">
      <div className="max-w-2xl text-center">
        {/* Logo */}
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-4xl shadow-xl">
          🏠
        </div>

        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-1.5 text-green-700 text-sm font-medium ring-1 ring-green-200">
          FamilyEase — 家庭生活一站式管理
        </div>

        <h1 className="mb-4 text-5xl font-bold tracking-tight text-foreground">
          家庭帳單，{' '}
          <span className="text-primary">輕鬆分攤</span>
        </h1>

        <p className="mb-10 text-lg text-muted-foreground leading-relaxed">
          和家人一起記錄共同支出、管理冰箱食材，清楚掌握誰該付多少，一鍵結清帳款。
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
          <Button asChild size="lg" className="rounded-xl px-8 text-base shadow-md">
            <Link href="/auth/register">免費開始使用</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-xl px-8 text-base">
            <Link href="/auth/login">登入</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          {[
            {
              icon: '💰',
              title: 'SplitEase 分帳',
              desc: '建立群組、記錄支出、彈性分攤方式，輕鬆追蹤誰欠誰多少',
              bg: 'bg-green-50 border-green-200',
              iconBg: 'bg-green-100',
            },
            {
              icon: '🧊',
              title: 'Family Fridge',
              desc: '掌握冰箱庫存，掃描收據自動辨識，AI 設計今日菜單',
              bg: 'bg-blue-50 border-blue-200',
              iconBg: 'bg-blue-100',
            },
            {
              icon: '✅',
              title: '輕鬆結清',
              desc: '追蹤並記錄家人之間的付款，讓帳款一目了然',
              bg: 'bg-purple-50 border-purple-200',
              iconBg: 'bg-purple-100',
            },
          ].map((f) => (
            <div
              key={f.title}
              className={`rounded-2xl border p-5 ${f.bg}`}
            >
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-xl ${f.iconBg}`}>
                {f.icon}
              </div>
              <div className="font-semibold text-foreground mb-1">{f.title}</div>
              <div className="text-sm text-muted-foreground leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
