'use client';

import { useState, useEffect } from 'react';

interface Substitute {
  original: string;
  substitute: string;
}

interface Meal {
  time: string;
  name: string;
  ingredients: string[];
  steps: string[];
  estimatedCost: number;
  substitutes?: Substitute[];
}

interface ShoppingItem {
  name: string;
  quantity: string;
  estimatedPrice: number;
}

interface MenuResult {
  meals: Meal[];
  shoppingList: ShoppingItem[];
  totalCost: number;
  tips?: string;
}

interface FridgeOption {
  id: string;
  name: string;
  emoji: string;
}

const MEAL_OPTIONS = ['早餐', '午餐', '晚餐', '消夜'] as const;

const timeIcon: Record<string, string> = {
  '早餐': '🌅',
  '午餐': '☀️',
  '晚餐': '🌙',
  '消夜': '🌛',
  '點心': '🍪',
};

export default function MenuPage() {
  const [fridges, setFridges] = useState<FridgeOption[]>([]);
  const [selectedFridgeIds, setSelectedFridgeIds] = useState<string[]>([]);

  const [form, setForm] = useState({ budget: '', people: '4', preferences: '' });
  const [selectedMeals, setSelectedMeals] = useState<string[]>(['早餐', '午餐', '晚餐']);
  const [useSubstitutes, setUseSubstitutes] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [menu, setMenu] = useState<MenuResult | null>(null);
  const [expandedMeal, setExpandedMeal] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/fridge/fridges')
      .then((r) => r.json())
      .then((data: FridgeOption[]) => {
        setFridges(data);
        setSelectedFridgeIds(data.map((f) => f.id));
      });
  }, []);

  const toggleMeal = (meal: string) => {
    setSelectedMeals((prev) =>
      prev.includes(meal) ? prev.filter((m) => m !== meal) : [...prev, meal]
    );
  };

  const toggleFridge = (id: string) => {
    setSelectedFridgeIds((prev) =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter((f) => f !== id) : prev
        : [...prev, id]
    );
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMenu(null);

    const res = await fetch('/api/fridge/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        budget: parseFloat(form.budget),
        people: parseInt(form.people),
        preferences: form.preferences,
        meals: selectedMeals,
        fridgeIds: selectedFridgeIds,
        useSubstitutes,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? '生成失敗，請重試');
      setLoading(false);
      return;
    }

    setMenu(data);
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-7">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-xl">
            👨‍🍳
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">設計菜單</h1>
        </div>
        <p className="text-sm text-neutral-500">根據冰箱食材、家庭食譜和預算，讓 AI 幫你設計今天的菜單</p>
      </div>

      {/* Form */}
      <form onSubmit={handleGenerate} className="rounded-xl border border-neutral-200 bg-white p-6 mb-6 space-y-5">

        {/* Fridge multi-select */}
        {fridges.length > 1 && (
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-2">
              使用哪些冰箱的食材
            </label>
            <div className="flex flex-wrap gap-2">
              {fridges.map((f) => {
                const active = selectedFridgeIds.includes(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toggleFridge(f.id)}
                    className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                      active
                        ? 'border-neutral-800 bg-neutral-900 text-white'
                        : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300'
                    }`}
                  >
                    <span>{f.emoji}</span>
                    {f.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">
              今日預算（元）<span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 text-sm">$</span>
              <input
                type="number"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                required
                min="1"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
                placeholder="例如：400"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">用餐人數</label>
            <select
              value={form.people}
              onChange={(e) => setForm({ ...form, people: e.target.value })}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n} 人</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-2">
            設計餐次<span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {MEAL_OPTIONS.map((meal) => {
              const active = selectedMeals.includes(meal);
              return (
                <button
                  key={meal}
                  type="button"
                  onClick={() => toggleMeal(meal)}
                  className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                    active
                      ? 'border-orange-400 bg-orange-50 text-orange-700'
                      : 'border-neutral-200 bg-white text-neutral-400 hover:border-neutral-300'
                  }`}
                >
                  <span>{timeIcon[meal]}</span>
                  {meal}
                </button>
              );
            })}
          </div>
          {selectedMeals.length === 0 && (
            <p className="text-[11px] text-red-500 mt-1">請至少選擇一個餐次</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1.5">特別需求（選填）</label>
          <input
            type="text"
            value={form.preferences}
            onChange={(e) => setForm({ ...form, preferences: e.target.value })}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
            placeholder="例如：不吃辣、低熱量、快速料理..."
          />
        </div>

        {/* Substitute ingredients toggle */}
        <div className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
          <input
            type="checkbox"
            id="useSubstitutes"
            checked={useSubstitutes}
            onChange={(e) => setUseSubstitutes(e.target.checked)}
            className="mt-0.5 accent-neutral-800 h-4 w-4 flex-shrink-0"
          />
          <label htmlFor="useSubstitutes" className="cursor-pointer">
            <div className="text-[13px] font-medium text-neutral-800">🔄 優先尋找替代食材</div>
            <div className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
              當食譜食材不足時，AI 會先在冰箱尋找替代食材，找不到才列入採購清單
            </div>
          </label>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading || selectedMeals.length === 0}
          className="w-full rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {loading ? '🤔 AI 正在設計菜單，請稍候…' : '✨ 生成今日菜單'}
        </button>
      </form>

      {/* Results */}
      {menu && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-neutral-200 bg-white p-4 text-center">
              <div className="text-2xl font-bold text-orange-500">${menu.totalCost}</div>
              <div className="text-[11px] text-neutral-400 mt-1 uppercase tracking-wide">預估總花費</div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 text-center">
              <div className="text-2xl font-bold text-neutral-700">{menu.meals.length}</div>
              <div className="text-[11px] text-neutral-400 mt-1 uppercase tracking-wide">餐次</div>
            </div>
          </div>

          {/* Meals */}
          {menu.meals.map((meal, index) => (
            <div key={index} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
              <button
                onClick={() => setExpandedMeal(expandedMeal === index ? null : index)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{timeIcon[meal.time] ?? '🍽️'}</span>
                  <div>
                    <div className="text-[11px] text-neutral-400">{meal.time}</div>
                    <div className="text-[13px] font-semibold text-neutral-900">{meal.name}</div>
                    {meal.substitutes && meal.substitutes.length > 0 && (
                      <div className="text-[11px] text-amber-600 mt-0.5">
                        🔄 使用了 {meal.substitutes.length} 種替代食材
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-medium text-orange-500">${meal.estimatedCost}</span>
                  <span className="text-neutral-300 text-xs">{expandedMeal === index ? '▲' : '▼'}</span>
                </div>
              </button>

              {expandedMeal === index && (
                <div className="border-t border-neutral-100 p-4 space-y-4">
                  {/* Substitutes */}
                  {meal.substitutes && meal.substitutes.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                      <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-2">
                        🔄 替代食材
                      </div>
                      <div className="space-y-1">
                        {meal.substitutes.map((sub, i) => (
                          <div key={i} className="flex items-center gap-2 text-[12px] text-amber-800">
                            <span className="line-through text-amber-500">{sub.original}</span>
                            <span>→</span>
                            <span className="font-medium">{sub.substitute}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-2">所需食材</div>
                    <div className="flex flex-wrap gap-2">
                      {meal.ingredients.map((ing, i) => (
                        <span key={i} className="rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-[12px] text-orange-700">
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-2">做法</div>
                    <ol className="space-y-2">
                      {meal.steps.map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm text-neutral-700">
                          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-semibold text-orange-600">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Shopping list */}
          {menu.shoppingList.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <h3 className="text-[13px] font-semibold text-blue-900 mb-3">🛒 需要額外採購</h3>
              <div className="space-y-2">
                {menu.shoppingList.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="text-blue-800">
                      {item.name} <span className="text-blue-400">({item.quantity})</span>
                    </div>
                    <div className="text-blue-700 font-medium">約 ${item.estimatedPrice}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {menu.tips && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <div className="text-sm text-yellow-800">
                <span className="font-semibold">💡 廚師建議：</span>{menu.tips}
              </div>
            </div>
          )}

          <button
            onClick={() => setMenu(null)}
            className="w-full rounded-lg border border-neutral-200 py-2.5 text-[13px] font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            重新設計菜單
          </button>
        </div>
      )}
    </div>
  );
}
