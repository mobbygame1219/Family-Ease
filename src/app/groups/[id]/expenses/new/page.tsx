'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

const categories = [
  { value: 'FOOD', label: '🍕 餐飲' },
  { value: 'TRANSPORT', label: '🚗 交通' },
  { value: 'ACCOMMODATION', label: '🏨 住宿' },
  { value: 'ENTERTAINMENT', label: '🎮 娛樂' },
  { value: 'UTILITIES', label: '💡 水電' },
  { value: 'SHOPPING', label: '🛍️ 購物' },
  { value: 'HEALTH', label: '🏥 醫療' },
  { value: 'OTHER', label: '📦 其他' },
];

interface Member {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string };
}

export default function NewExpensePage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;

  const [members, setMembers] = useState<Member[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    amount: '',
    category: 'OTHER',
    paidById: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/groups/${groupId}/members`)
      .then((r) => r.json())
      .then((data) => {
        setMembers(data.members ?? []);
        setCurrentUserId(data.currentUserId ?? '');
        setForm((f) => ({ ...f, paidById: data.currentUserId ?? '' }));
        setSelectedMembers((data.members ?? []).map((m: Member) => m.user.id));
      });
  }, [groupId]);

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const perPerson =
    selectedMembers.length > 0 && form.amount
      ? (parseFloat(form.amount) / selectedMembers.length).toFixed(0)
      : '0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMembers.length === 0) {
      setError('請至少選擇一位分帳成員');
      return;
    }
    setLoading(true);
    setError('');

    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        amount: parseFloat(form.amount),
        category: form.category,
        paidById: form.paidById,
        date: new Date(form.date).toISOString(),
        groupId,
        splitType: 'EQUAL',
        splits: selectedMembers.map((userId) => ({ userId })),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? '新增失敗，請再試一次');
      setLoading(false);
      return;
    }

    router.push(`/groups/${groupId}`);
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">新增支出</h1>
        <p className="text-gray-500 text-sm mt-1">記錄一筆共同支出</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {/* 支出名稱 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            支出名稱 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            placeholder="例如：超市採購"
          />
        </div>

        {/* 金額 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            金額（元）<span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
            min="0.01"
            step="0.01"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            placeholder="0"
          />
        </div>

        {/* 類別 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">類別</label>
          <div className="grid grid-cols-4 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setForm({ ...form, category: cat.value })}
                className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
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

        {/* 誰付款 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">誰付款</label>
          <select
            value={form.paidById}
            onChange={(e) => setForm({ ...form, paidById: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            {members.map((m) => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.name}{m.user.id === currentUserId ? '（你）' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* 日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>

        {/* 分帳成員 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            分帳成員
            {form.amount && selectedMembers.length > 0 && (
              <span className="ml-2 text-green-600 font-normal">
                每人 ${perPerson}
              </span>
            )}
          </label>
          <div className="space-y-2">
            {members.map((m) => (
              <label
                key={m.user.id}
                className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  selectedMembers.includes(m.user.id)
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(m.user.id)}
                  onChange={() => toggleMember(m.user.id)}
                  className="accent-green-600"
                />
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-700">
                  {m.user.name?.charAt(0)}
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {m.user.name}{m.user.id === currentUserId ? '（你）' : ''}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* 按鈕 */}
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
            {loading ? '新增中…' : '新增支出'}
          </button>
        </div>
      </form>
    </div>
  );
}