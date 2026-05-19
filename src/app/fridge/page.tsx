'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trash2, ChefHat, ChevronRight, Refrigerator } from 'lucide-react';

interface Fridge {
  id: string;
  name: string;
  emoji: string;
  createdAt: string;
  _count: { items: number };
}

const FRIDGE_EMOJIS = ['🧊', '❄️', '🥶', '🍱', '🫙', '🥩', '🥦', '🍳'];

export default function FridgePage() {
  const router = useRouter();
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('🧊');
  const [error, setError] = useState('');

  const fetchFridges = async () => {
    const res = await fetch('/api/fridge/fridges');
    if (res.ok) {
      const data = await res.json();
      setFridges(data);
    }
    setLoading(false);
  };

  useEffect(() => { fetchFridges(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError('');

    const res = await fetch('/api/fridge/fridges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), emoji: newEmoji }),
    });

    if (res.ok) {
      setNewName('');
      setNewEmoji('🧊');
      setShowForm(false);
      await fetchFridges();
    } else {
      const data = await res.json();
      setError(data.error ?? '建立失敗');
    }
    setCreating(false);
  };

  const handleDelete = async (fridge: Fridge) => {
    if (!confirm(`確定要刪除「${fridge.emoji} ${fridge.name}」？\n冰箱內的所有食材也會一併刪除。`)) return;

    const res = await fetch(`/api/fridge/fridges/${fridge.id}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchFridges();
    } else {
      const data = await res.json();
      alert(data.error ?? '刪除失敗');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">Family Fridge</h1>
          <p className="text-sm text-neutral-500 mt-0.5">管理家庭冰箱食材</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-2 text-[13px] font-medium text-white hover:bg-neutral-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          新增冰箱
        </button>
      </div>

      {/* Create fridge form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4"
        >
          <h2 className="text-[13px] font-semibold text-neutral-700">新增冰箱</h2>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}

          {/* Emoji picker */}
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-2">選擇圖示</label>
            <div className="flex gap-2 flex-wrap">
              {FRIDGE_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setNewEmoji(em)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg border transition-all ${
                    newEmoji === em
                      ? 'border-neutral-900 bg-neutral-100'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">
              冰箱名稱 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              placeholder="例如：客廳小冰箱"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(''); }}
              className="flex-1 rounded-lg border border-neutral-200 py-2 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="flex-1 rounded-lg bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors"
            >
              {creating ? '建立中…' : `建立 ${newEmoji} ${newName || '冰箱'}`}
            </button>
          </div>
        </form>
      )}

      {/* AI Menu shortcut */}
      <Link href="/fridge/menu" className="group block">
        <div className="flex items-center gap-4 rounded-xl border border-orange-200 bg-orange-50/60 px-5 py-4 hover:border-orange-300 hover:shadow-sm transition-all">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-xl flex-shrink-0">
            👨‍🍳
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-orange-900">設計今天的菜單</div>
            <div className="text-[12px] text-orange-600/80 mt-0.5">根據冰箱食材和預算，讓 AI 幫你設計菜單</div>
          </div>
          <ChefHat className="h-4 w-4 text-orange-400 group-hover:text-orange-600 flex-shrink-0 transition-colors" />
        </div>
      </Link>

      {/* Fridge list */}
      <section>
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
          我的冰箱
        </h2>

        {loading ? (
          <div className="space-y-2.5">
            {[1, 2].map((i) => (
              <div key={i} className="h-[72px] rounded-xl border border-neutral-200 bg-neutral-50 animate-pulse" />
            ))}
          </div>
        ) : fridges.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 py-12 text-center">
            <Refrigerator className="h-8 w-8 text-neutral-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-neutral-500">還沒有冰箱</p>
            <p className="text-xs text-neutral-400 mt-1">點擊上方「新增冰箱」開始</p>
          </div>
        ) : (
          <div className="space-y-2">
            {fridges.map((fridge) => (
              <div key={fridge.id} className="group flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3.5 hover:border-neutral-300 hover:shadow-sm transition-all">
                {/* Fridge icon */}
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-xl flex-shrink-0">
                  {fridge.emoji}
                </div>

                {/* Fridge info — clicking navigates */}
                <Link href={`/fridge/${fridge.id}`} className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-neutral-900">{fridge.name}</div>
                  <div className="text-[12px] text-neutral-500 mt-0.5">
                    {fridge._count.items > 0
                      ? `${fridge._count.items} 樣食材`
                      : '目前是空的'}
                  </div>
                </Link>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleDelete(fridge)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                    title="刪除冰箱"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <Link
                    href={`/fridge/${fridge.id}`}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-300 hover:text-neutral-600 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
