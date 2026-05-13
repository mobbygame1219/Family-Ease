'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/utils/balance';

interface Meal {
  time: string;
  name: string;
  ingredients: string[];
  steps: string[];
  estimatedCost: number;
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

const MEAL_OPTIONS = ['早餐', '午餐', '晚餐', '消夜'] as const;

const timeIcon: Record<string, string> = {
  '早餐': '🌅',
  '午餐': '☀️',
  '晚餐': '🌙',
  '消夜': '🌛',
  '點心': '🍪',
};

export default function MenuPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    budget: '',
    people: '4',
    preferences: '',
  });
  const [selectedMeals, setSelectedMeals] = useState<string[]>(['早餐', '午餐', '晚餐']);

  const toggleMeal = (meal: string) => {
    setSelectedMeals((prev) =>
      prev.includes(meal) ? prev.filter((m) => m !== meal) : [...prev, meal]
    );
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [menu, setMenu] = useState<MenuResult | null>(null);
  const [expandedMeal, setExpandedMeal] = useState<number | null>(null);

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
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-xl">
            👨‍🍳
          </div>
          <h1 className="text-2xl font-bold text-gray-900">設計菜單</h1>
        </div>
        <p className="text-gray-500 text-sm">根據冰箱食材和預算，讓 AI 幫你設計今天的菜單</p>
      </div>

      {/* 設定表單 */}
      <form onSubmit={handleGenerate} className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              今日預算（元）<span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-1">
              <span className="text-gray-500">$</span>
              <input
                type="number"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                required
                min="1"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="例如：400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用餐人數</label>
            <select
              value={form.people}
              onChange={(e) => setForm({ ...form, people: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n} 人</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'border-orange-400 bg-orange-100 text-orange-700'
                      : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                  }`}
                >
                  <span>{timeIcon[meal]}</span>
                  {meal}
                </button>
              );
            })}
          </div>
          {selectedMeals.length === 0 && (
            <p className="text-xs text-red-500 mt-1">請至少選擇一個餐次</p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            特別需求（選填）
          </label>
          <input
            type="text"
            value={form.preferences}
            onChange={(e) => setForm({ ...form, preferences: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            placeholder="例如：不吃辣、低熱量、快速料理..."
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 mb-4">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading || selectedMeals.length === 0}
          className="w-full rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60 transition-colors"
        >
          {loading ? '🤔 AI 正在設計菜單，請稍候…' : '✨ 生成今日菜單'}
        </button>
      </form>

      {/* 菜單結果 */}
      {menu && (
        <div className="space-y-4">
          {/* 總覽 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
              <div className="text-2xl font-bold text-orange-500">${menu.totalCost}</div>
              <div className="text-xs text-gray-500 mt-1">預估總花費</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
              <div className="text-2xl font-bold text-blue-500">{menu.meals.length}</div>
              <div className="text-xs text-gray-500 mt-1">餐次</div>
            </div>
          </div>

          {/* 各餐菜色 */}
          {menu.meals.map((meal, index) => (
            <div key={index} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <button
                onClick={() => setExpandedMeal(expandedMeal === index ? null : index)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{timeIcon[meal.time] ?? '🍽️'}</span>
                  <div>
                    <div className="text-xs text-gray-400">{meal.time}</div>
                    <div className="font-semibold text-gray-900">{meal.name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-orange-500">${meal.estimatedCost}</span>
                  <span className="text-gray-400">{expandedMeal === index ? '▲' : '▼'}</span>
                </div>
              </button>

              {expandedMeal === index && (
                <div className="border-t border-gray-100 p-4 space-y-4">
                  {/* 食材 */}
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">所需食材</div>
                    <div className="flex flex-wrap gap-2">
                      {meal.ingredients.map((ing, i) => (
                        <span key={i} className="rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs text-orange-700">
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 做法 */}
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">做法</div>
                    <ol className="space-y-2">
                      {meal.steps.map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm text-gray-700">
                          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-600">
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

          {/* 採購清單 */}
          {menu.shoppingList.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-3">🛒 需要額外採購</h3>
              <div className="space-y-2">
                {menu.shoppingList.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="text-blue-800">
                      {item.name} <span className="text-blue-500">({item.quantity})</span>
                    </div>
                    <div className="text-blue-700 font-medium">約 ${item.estimatedPrice}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 小提示 */}
          {menu.tips && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <div className="text-sm text-yellow-800">
                <span className="font-semibold">💡 廚師建議：</span>{menu.tips}
              </div>
            </div>
          )}

          {/* 重新生成 */}
          <button
            onClick={() => setMenu(null)}
            className="w-full rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            重新設計菜單
          </button>
        </div>
      )}
    </div>
  );
}