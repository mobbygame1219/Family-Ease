'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const categories = [
  { value: 'HOME', label: '🏠 家庭' },
  { value: 'TRIP', label: '✈️ 旅遊' },
  { value: 'FOOD', label: '🍕 餐飲' },
  { value: 'WORK', label: '💼 工作' },
  { value: 'OTHER', label: '👥 其他' },
];

export default function NewGroupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', description: '', category: 'HOME' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? '建立失敗，請再試一次');
      setLoading(false);
      return;
    }

    const group = await res.json();
    router.push(`/groups/${group.id}`);
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">建立新群組</h1>
        <p className="text-gray-500 text-sm mt-1">建立一個群組來追蹤共同支出</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            群組名稱 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            maxLength={100}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            placeholder="例如：黃家帳本"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">說明（選填）</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            maxLength={500}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            placeholder="這個群組是用來記錄什麼的？"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">類別</label>
          <div className="grid grid-cols-3 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setForm({ ...form, category: cat.value })}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  form.category === cat.value
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
          >
            {loading ? '建立中…' : '建立群組'}
          </button>
        </div>
      </form>
    </div>
  );
}