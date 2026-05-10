import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // 已登入就直接跳到 Dashboard
  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="max-w-2xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-green-700 font-medium text-sm">
          🏠 FamilyEase
        </div>

        <h1 className="mb-4 text-5xl font-bold tracking-tight text-gray-900">
          家庭帳單，{' '}
          <span className="text-green-600">輕鬆分攤</span>
        </h1>

        <p className="mb-8 text-lg text-gray-500 leading-relaxed">
          和家人一起記錄共同支出，清楚掌握誰該付多少，一鍵結清帳款。
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/auth/register"
            className="rounded-xl bg-green-600 px-6 py-3 text-white font-semibold hover:bg-green-700 transition-colors"
          >
            免費開始使用
          </Link>
          <Link
            href="/auth/login"
            className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
          >
            登入
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          {[
            { icon: '👥', title: '家庭群組', desc: '建立群組，邀請家人一起記帳' },
            { icon: '🧮', title: '彈性分帳', desc: '平均分、自訂金額、按比例都可以' },
            { icon: '✅', title: '輕鬆結清', desc: '追蹤並記錄家人之間的付款' },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="mb-2 text-2xl">{f.icon}</div>
              <div className="font-semibold text-gray-900">{f.title}</div>
              <div className="text-sm text-gray-500 mt-1">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}