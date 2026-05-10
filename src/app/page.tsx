// src/app/page.tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="max-w-2xl text-center">
        {/* Logo */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-green-700 font-medium text-sm">
          💸 SplitEase
        </div>

        <h1 className="mb-4 text-5xl font-bold tracking-tight text-gray-900">
          家庭帳單，{' '}
          <span className="text-green-600">輕鬆分攤</span>
        </h1>

        <p className="mb-8 text-lg text-gray-500 leading-relaxed">
          Track shared expenses with friends, roommates, and travel groups.
          See who owes what — and settle up instantly.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/auth/register"
            className="rounded-xl bg-green-600 px-6 py-3 text-white font-semibold hover:bg-green-700 transition-colors"
          >
            Get started for free
          </Link>
          <Link
            href="/auth/login"
            className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
          >
            Sign in
          </Link>
        </div>

        {/* Feature highlights */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          {[
            { icon: '👥', title: 'Groups', desc: 'Create groups for trips, home, and more' },
            { icon: '🧮', title: 'Smart splits', desc: 'Split equally, by amount, or by percentage' },
            { icon: '✅', title: 'Settle up', desc: 'Track and record payments between friends' },
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
