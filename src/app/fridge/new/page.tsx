'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const units = ['個', '顆', '包', '袋', '瓶', '罐', '克', '公斤', '公升', '毫升', '片', '條', '盒'];

interface FridgeOption {
  id: string;
  name: string;
  emoji: string;
}

function NewFridgeItemForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedFridgeId = searchParams.get('fridgeId');

  const [fridges, setFridges] = useState<FridgeOption[]>([]);
  const [selectedFridgeId, setSelectedFridgeId] = useState('');
  const [form, setForm] = useState({
    name: '',
    quantity: '',
    unit: '個',
    price: '',
    expiresAt: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/fridge/fridges')
      .then((r) => r.json())
      .then((data: FridgeOption[]) => {
        setFridges(data);
        // Use preselected fridgeId if valid, otherwise first fridge
        const match = data.find((f) => f.id === preselectedFridgeId);
        setSelectedFridgeId(match ? match.id : (data[0]?.id ?? ''));
      });
  }, [preselectedFridgeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFridgeId) return;
    setLoading(true);
    setError('');

    const res = await fetch('/api/fridge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        quantity: parseFloat(form.quantity),
        unit: form.unit,
        price: form.price ? parseFloat(form.price) : null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        fridgeId: selectedFridgeId,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? '新增失敗');
      setLoading(false);
      return;
    }

    router.push(`/fridge/${selectedFridgeId}`);
    router.refresh();
  };

  return (
    <div className="max-w-lg mx-auto px-6 py-8">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">新增食材</h1>
        <p className="text-sm text-neutral-500 mt-1">手動新增食材到冰箱</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>
        )}

        {/* Fridge selector */}
        {fridges.length > 1 && (
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">
              選擇冰箱
            </label>
            <select
              value={selectedFridgeId}
              onChange={(e) => setSelectedFridgeId(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
            >
              {fridges.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.emoji} {f.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1.5">
            食材名稱 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
            placeholder="例如：雞蛋"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">
              數量 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
              min="0.1"
              step="0.1"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">單位</label>
            <select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
            >
              {units.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1.5">價格（選填）</label>
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400 text-sm">$</span>
            <input
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              min="0"
              step="1"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1.5">到期日（選填）</label>
          <input
            type="date"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-lg border border-neutral-200 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading || !selectedFridgeId}
            className="flex-1 rounded-lg bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '新增中…' : '新增食材'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewFridgeItemPage() {
  return (
    <Suspense>
      <NewFridgeItemForm />
    </Suspense>
  );
}
