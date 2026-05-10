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

type SplitMode = 'EQUAL' | 'SHARES' | 'AMOUNT';

export default function EditExpensePage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  const expenseId = params.expenseId as string;

  const [members, setMembers] = useState<Member[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [splitMode, setSplitMode] = useState<SplitMode>('EQUAL');

  const [form, setForm] = useState({
    title: '',
    amount: '',
    category: 'OTHER',
    paidById: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [shares, setShares] = useState<Record<string, number>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      fetch(`/api/groups/${groupId}/members`).then((r) => r.json()),
      fetch(`/api/expenses/${expenseId}`).then((r) => r.json()),
    ]).then(([memberData, expenseData]) => {
      const ms: Member[] = memberData.members ?? [];
      setMembers(ms);
      setCurrentUserId(memberData.currentUserId ?? '');

      // 填入現有支出資料
      setForm({
        title: expenseData.title,
        amount: String(expenseData.amount),
        category: expenseData.category,
        paidById: expenseData.paidById,
        date: new Date(expenseData.date).toISOString().split('T')[0],
      });

      // 填入分帳成員
      const splitUserIds = expenseData.splits.map((s: { userId: string }) => s.userId);
      setSelectedMembers(splitUserIds);

      const initShares: Record<string, number> = {};
      const initAmounts: Record<string, string> = {};
      ms.forEach((m) => {
        initShares[m.user.id] = 1;
        initAmounts[m.user.id] = '';
      });
      expenseData.splits.forEach((s: { userId: string; amount: number }) => {
        initAmounts[s.userId] = String(s.amount);
      });
      setShares(initShares);
      setAmounts(initAmounts);
      setFetching(false);
    });
  }, [groupId, expenseId]);

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const equalPerPerson =
    selectedMembers.length > 0 && form.amount
      ? (parseFloat(form.amount) / selectedMembers.length).toFixed(0)
      : '0';

  const totalShares = Object.values(shares).reduce((a, b) => a + b, 0);
  const perShare = totalShares > 0 && form.amount ? parseFloat(form.amount) / totalShares : 0;

  const amountTotal = Object.values(amounts).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
  const amountRemaining = form.amount ? parseFloat(form.amount) - amountTotal : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let splits: { userId: string; amount: number }[] = [];

    if (splitMode === 'EQUAL') {
      if (selectedMembers.length === 0) {
        setError('請至少選擇一位分帳成員');
        return;
      }
      const per = parseFloat(form.amount) / selectedMembers.length;
      splits = selectedMembers.map((userId) => ({
        userId,
        amount: Math.round(per * 100) / 100,
      }));
    } else if (splitMode === 'SHARES') {
      const activeShares = members.filter((m) => (shares[m.user.id] ?? 0) > 0);
      if (activeShares.length === 0) {
        setError('請至少設定一位成員的份數');
        return;
      }
      splits = activeShares.map((m) => ({
        userId: m.user.id,
        amount: Math.round(perShare * (shares[m.user.id] ?? 0) * 100) / 100,
      }));
    } else {
      splits = members
        .filter((m) => parseFloat(amounts[m.user.id] || '0') > 0)
        .map((m) => ({ userId: m.user.id, amount: parseFloat(amounts[m.user.id]) }));
      if (splits.length === 0) {
        setError('請至少輸入一位成員的金額');
        return;
      }
      if (Math.abs(amountRemaining) > 0.5) {
        setError(`金額總和不符，還差 $${amountRemaining.toFixed(0)}`);
        return;
      }
    }

    setLoading(true);

    const res = await fetch(`/api/expenses/${expenseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        amount: parseFloat(form.amount),
        category: form.category,
        paidById: form.paidById,
        date: new Date(form.date).toISOString(),
        splits,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? '更新失敗，請再試一次');
      setLoading(false);
      return;
    }

 router.push(`/groups/${groupId}`);
router.refresh();
  };

  if (fetching) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <p className="text-gray-400 text-sm">載入中…</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">編輯支出</h1>
        <p className="text-gray-500 text-sm mt-1">修改支出資料</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

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
          />
        </div>

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
          />
        </div>

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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">分帳方式</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'EQUAL', label: '⚖️ 平分' },
              { value: 'SHARES', label: '🔢 份數' },
              { value: 'AMOUNT', label: '💰 金額' },
            ].map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => setSplitMode(mode.value as SplitMode)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                  splitMode === mode.value
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* 平分模式 */}
        {splitMode === 'EQUAL' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              分帳成員
              {form.amount && selectedMembers.length > 0 && (
                <span className="ml-2 text-green-600 font-normal">每人 ${equalPerPerson}</span>
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
        )}

        {/* 份數模式 */}
        {splitMode === 'SHARES' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              各人份數
              {totalShares > 0 && (
                <span className="ml-2 text-green-600 font-normal">
                  共 {totalShares} 份，每份 ${perShare.toFixed(0)}
                </span>
              )}
            </label>
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.user.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-700 flex-shrink-0">
                    {m.user.name?.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-gray-900 flex-1">
                    {m.user.name}{m.user.id === currentUserId ? '（你）' : ''}
                  </span>
                  <div className="flex items-center gap-2">
                    <button type="button"
                      onClick={() => setShares((s) => ({ ...s, [m.user.id]: Math.max(0, (s[m.user.id] ?? 1) - 1) }))}
                      className="w-7 h-7 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center text-lg leading-none"
                    >−</button>
                    <span className="w-6 text-center text-sm font-semibold">{shares[m.user.id] ?? 1}</span>
                    <button type="button"
                      onClick={() => setShares((s) => ({ ...s, [m.user.id]: (s[m.user.id] ?? 1) + 1 }))}
                      className="w-7 h-7 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center text-lg leading-none"
                    >+</button>
                  </div>
                  {totalShares > 0 && form.amount && (
                    <span className="text-xs text-gray-400 w-16 text-right">
                      ${(perShare * (shares[m.user.id] ?? 1)).toFixed(0)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 金額模式 */}
        {splitMode === 'AMOUNT' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              各人金額
              {form.amount && (
                <span className={`ml-2 font-normal text-sm ${Math.abs(amountRemaining) < 0.5 ? 'text-green-600' : 'text-red-500'}`}>
                  {Math.abs(amountRemaining) < 0.5 ? '✓ 金額吻合' : `還差 $${amountRemaining.toFixed(0)}`}
                </span>
              )}
            </label>
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.user.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-700 flex-shrink-0">
                    {m.user.name?.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-gray-900 flex-1">
                    {m.user.name}{m.user.id === currentUserId ? '（你）' : ''}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-500">$</span>
                    <input
                      type="number"
                      value={amounts[m.user.id] ?? ''}
                      onChange={(e) => setAmounts((a) => ({ ...a, [m.user.id]: e.target.value }))}
                      min="0"
                      step="1"
                      placeholder="0"
                      className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-right focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
            {loading ? '儲存中…' : '儲存變更'}
          </button>
        </div>
      </form>
    </div>
  );
}