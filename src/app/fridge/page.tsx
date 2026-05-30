'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, ChefHat, ChevronRight, Refrigerator, BookOpen } from 'lucide-react';

interface Fridge {
  id: string;
  name: string;
  emoji: string;       // now stores a color key, e.g. "blue"
  createdAt: string;
  _count: { items: number };
}

// Color palette replaces the old emoji picker
const FRIDGE_COLORS = [
  { key: 'blue',    bg: 'bg-blue-100',    icon: 'text-blue-500',    ring: 'ring-blue-400'    },
  { key: 'cyan',    bg: 'bg-cyan-100',    icon: 'text-cyan-500',    ring: 'ring-cyan-400'    },
  { key: 'teal',    bg: 'bg-teal-100',    icon: 'text-teal-500',    ring: 'ring-teal-400'    },
  { key: 'green',   bg: 'bg-green-100',   icon: 'text-green-500',   ring: 'ring-green-400'   },
  { key: 'orange',  bg: 'bg-orange-100',  icon: 'text-orange-500',  ring: 'ring-orange-400'  },
  { key: 'pink',    bg: 'bg-pink-100',    icon: 'text-pink-500',    ring: 'ring-pink-400'    },
  { key: 'purple',  bg: 'bg-purple-100',  icon: 'text-purple-500',  ring: 'ring-purple-400'  },
  { key: 'neutral', bg: 'bg-neutral-100', icon: 'text-neutral-500', ring: 'ring-neutral-400' },
] as const;

type ColorKey = typeof FRIDGE_COLORS[number]['key'];

const getFridgeColor = (key: string) =>
  FRIDGE_COLORS.find((c) => c.key === key) ?? FRIDGE_COLORS[0];

// Swatch circle colors for visual display
const SWATCH_HEX: Record<string, string> = {
  blue: '#3b82f6', cyan: '#06b6d4', teal: '#14b8a6', green: '#22c55e',
  orange: '#f97316', pink: '#ec4899', purple: '#a855f7', neutral: '#6b7280',
};

export default function FridgePage() {
  const [fridges, setFridges]         = useState<Fridge[]>([]);
  const [loading, setLoading]         = useState(true);
  const [creating, setCreating]       = useState(false);
  const [showForm, setShowForm]       = useState(false);
  const [newName, setNewName]         = useState('');
  const [newColor, setNewColor]       = useState<ColorKey>('blue');
  const [error, setError]             = useState('');

  const fetchFridges = async () => {
    const res = await fetch('/api/fridge/fridges');
    if (res.ok) setFridges(await res.json());
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
      body: JSON.stringify({ name: newName.trim(), emoji: newColor }),
    });

    if (res.ok) {
      setNewName('');
      setNewColor('blue');
      setShowForm(false);
      await fetchFridges();
    } else {
      const data = await res.json();
      setError(data.error ?? '建立失敗');
    }
    setCreating(false);
  };

  const handleDelete = async (fridge: Fridge) => {
    if (!confirm(`確定要刪除「${fridge.name}」？\n冰箱內的所有食材也會一併刪除。`)) return;
    const res = await fetch(`/api/fridge/fridges/${fridge.id}`, { method: 'DELETE' });
    if (res.ok) await fetchFridges();
    else { const d = await res.json(); alert(d.error ?? '刪除失敗'); }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

      {/* Blue gradient banner */}
      <div className="page-banner bg-gradient-to-r from-fridge-600 to-fridge-500 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <Refrigerator className="h-6 w-6 text-white" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Family Fridge</h1>
              <p className="text-fridge-100 text-sm mt-0.5">管理家庭冰箱食材</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors border border-white/30"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            新增冰箱
          </button>
        </div>
      </div>

      {/* Create fridge form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4"
        >
          <h2 className="text-[13px] font-semibold text-neutral-700">新增冰箱</h2>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}

          {/* Color picker */}
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-2">選擇顏色</label>
            <div className="flex gap-2.5 flex-wrap">
              {FRIDGE_COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setNewColor(c.key)}
                  title={c.key}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                    newColor === c.key
                      ? 'border-neutral-800 scale-110 shadow-md'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: SWATCH_HEX[c.key] }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-2.5 rounded-xl bg-neutral-50 px-3 py-2.5">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${getFridgeColor(newColor).bg}`}>
              <Refrigerator className={`h-5 w-5 ${getFridgeColor(newColor).icon}`} strokeWidth={1.75} />
            </div>
            <span className="text-[13px] text-neutral-600 font-medium">
              {newName || '冰箱名稱預覽'}
            </span>
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
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-fridge-400 focus:outline-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(''); }}
              className="flex-1 rounded-xl border border-neutral-200 py-2 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="flex-1 rounded-xl bg-fridge-600 py-2 text-sm font-medium text-white hover:bg-fridge-500 disabled:opacity-50 transition-colors"
            >
              {creating ? '建立中…' : `建立冰箱`}
            </button>
          </div>
        </form>
      )}

      {/* Quick access cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* AI Menu */}
        <Link href="/fridge/menu" className="group block">
          <div className="flex items-center gap-3.5 rounded-2xl border border-ledger-100 bg-gradient-to-br from-ledger-50 to-orange-50 px-4 py-3.5 hover:border-ledger-300 hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ledger-100 flex-shrink-0">
              <ChefHat className="h-5 w-5 text-ledger-600" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-ledger-900">設計今天的菜單</div>
              <div className="text-[12px] text-ledger-600/80 mt-0.5">根據食材和預算，AI 設計菜單</div>
            </div>
            <ChefHat className="h-4 w-4 text-ledger-400 group-hover:text-ledger-600 flex-shrink-0 transition-colors" strokeWidth={1.75} />
          </div>
        </Link>
        {/* Recipe library */}
        <Link href="/fridge/recipes" className="group block">
          <div className="flex items-center gap-3.5 rounded-2xl border border-calendar-100 bg-gradient-to-br from-calendar-50 to-purple-50 px-4 py-3.5 hover:border-calendar-300 hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-calendar-100 flex-shrink-0">
              <BookOpen className="h-5 w-5 text-calendar-600" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-calendar-900">食譜資料庫</div>
              <div className="text-[12px] text-calendar-600/80 mt-0.5">管理家庭食譜，AI 優先參考</div>
            </div>
            <BookOpen className="h-4 w-4 text-calendar-400 group-hover:text-calendar-600 flex-shrink-0 transition-colors" strokeWidth={1.75} />
          </div>
        </Link>
      </div>

      {/* Fridge list */}
      <section>
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
          我的冰箱
        </h2>

        {loading ? (
          <div className="space-y-2.5">
            {[1, 2].map((i) => (
              <div key={i} className="h-[72px] rounded-2xl border border-neutral-200 bg-neutral-50 animate-pulse" />
            ))}
          </div>
        ) : fridges.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 py-12 text-center">
            <Refrigerator className="h-8 w-8 text-neutral-300 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-sm font-medium text-neutral-500">還沒有冰箱</p>
            <p className="text-xs text-neutral-400 mt-1">點擊上方「新增冰箱」開始</p>
          </div>
        ) : (
          <div className="space-y-2">
            {fridges.map((fridge) => {
              const color = getFridgeColor(fridge.emoji);
              return (
                <div key={fridge.id} className="group flex items-center gap-3 rounded-2xl border border-fridge-100 bg-white px-4 py-3.5 hover:border-fridge-300 hover:shadow-md transition-all">
                  {/* Fridge icon with color */}
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 ${color.bg}`}>
                    <Refrigerator className={`h-5 w-5 ${color.icon}`} strokeWidth={1.75} />
                  </div>

                  {/* Fridge info */}
                  <Link href={`/fridge/${fridge.id}`} className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-neutral-900">{fridge.name}</div>
                    <div className="text-[12px] text-neutral-500 mt-0.5">
                      {fridge._count.items > 0 ? `${fridge._count.items} 樣食材` : '目前是空的'}
                    </div>
                  </Link>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleDelete(fridge)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                      title="刪除冰箱"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <Link
                      href={`/fridge/${fridge.id}`}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-300 hover:text-neutral-600 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
