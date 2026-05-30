'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, GripVertical, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const UNITS = ['克', '公斤', '毫升', '公升', '個', '顆', '片', '條', '包', '罐', '瓶', '匙', '杯', '適量'];
const CATEGORIES = [
  { value: 'BREAKFAST', label: '早餐' },
  { value: 'LUNCH', label: '午餐' },
  { value: 'DINNER', label: '晚餐' },
  { value: 'SNACK', label: '點心' },
];

interface Ingredient {
  id: number;
  name: string;
  quantity: string;
  unit: string;
  optional: boolean;
}

interface Step {
  id: number;
  description: string;
}

export default function NewRecipePage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('DINNER');
  const [servings, setServings] = useState('2');
  const [cookTime, setCookTime] = useState('');

  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: 1, name: '', quantity: '', unit: '克', optional: false },
  ]);
  const [steps, setSteps] = useState<Step[]>([
    { id: 1, description: '' },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Ingredient helpers
  const addIngredient = () =>
    setIngredients((prev) => [...prev, { id: Date.now(), name: '', quantity: '', unit: '克', optional: false }]);
  const removeIngredient = (id: number) =>
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  const updateIngredient = (id: number, field: keyof Ingredient, value: string | boolean) =>
    setIngredients((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));

  // Step helpers
  const addStep = () =>
    setSteps((prev) => [...prev, { id: Date.now(), description: '' }]);
  const removeStep = (id: number) =>
    setSteps((prev) => prev.filter((s) => s.id !== id));
  const updateStep = (id: number, description: string) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, description } : s)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('請輸入食譜名稱'); return; }

    const validIngredients = ingredients.filter((i) => i.name.trim());
    const validSteps = steps.filter((s) => s.description.trim());

    setSaving(true);
    setError('');

    const res = await fetch('/api/fridge/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        category,
        servings,
        cookTime: cookTime || null,
        ingredients: validIngredients.map((i) => ({
          name: i.name,
          quantity: parseFloat(i.quantity) || 1,
          unit: i.unit,
          optional: i.optional,
        })),
        steps: validSteps.map((s, idx) => ({
          order: idx + 1,
          description: s.description,
        })),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? '儲存失敗');
      setSaving(false);
      return;
    }

    const recipe = await res.json();
    router.push(`/fridge/recipes/${recipe.id}`);
    router.refresh();
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">

      <div className="mb-6">
        <Link
          href="/fridge/recipes"
          className="inline-flex items-center gap-1.5 text-[12px] text-neutral-400 hover:text-neutral-700 transition-colors mb-4"
        >
          <ArrowLeft className="h-3 w-3" />
          食譜資料庫
        </Link>
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">新增食譜</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-7">
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>
        )}

        {/* Basic info */}
        <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
          <h2 className="text-[13px] font-semibold text-neutral-700">基本資訊</h2>

          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">
              食譜名稱 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="例如：番茄炒蛋"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">說明（選填）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="簡短描述這道食譜…"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">類別</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">份數</label>
              <select
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                  <option key={n} value={n}>{n} 人份</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">烹飪時間（分鐘）</label>
              <input
                type="number"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
                min="1"
                placeholder="例如：20"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* Ingredients */}
        <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-neutral-700">食材</h2>
            <button
              type="button"
              onClick={addIngredient}
              className="flex items-center gap-1 text-[12px] text-neutral-500 hover:text-neutral-800 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              新增食材
            </button>
          </div>

          <div className="space-y-2">
            {ingredients.map((ing) => (
              <div key={ing.id} className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-neutral-300 flex-shrink-0" />
                <input
                  type="text"
                  value={ing.name}
                  onChange={(e) => updateIngredient(ing.id, 'name', e.target.value)}
                  placeholder="食材名稱"
                  className="flex-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm focus:border-neutral-400 focus:outline-none min-w-0"
                />
                <input
                  type="number"
                  value={ing.quantity}
                  onChange={(e) => updateIngredient(ing.id, 'quantity', e.target.value)}
                  placeholder="數量"
                  min="0"
                  step="0.1"
                  className="w-16 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm focus:border-neutral-400 focus:outline-none"
                />
                <select
                  value={ing.unit}
                  onChange={(e) => updateIngredient(ing.id, 'unit', e.target.value)}
                  className="w-16 rounded-lg border border-neutral-200 px-1 py-1.5 text-sm focus:border-neutral-400 focus:outline-none"
                >
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                <label className="flex items-center gap-1 text-[11px] text-neutral-400 flex-shrink-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ing.optional}
                    onChange={(e) => updateIngredient(ing.id, 'optional', e.target.checked)}
                    className="accent-neutral-600"
                  />
                  選填
                </label>
                {ingredients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeIngredient(ing.id)}
                    className="flex-shrink-0 text-neutral-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Steps */}
        <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-neutral-700">步驟</h2>
            <button
              type="button"
              onClick={addStep}
              className="flex items-center gap-1 text-[12px] text-neutral-500 hover:text-neutral-800 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              新增步驟
            </button>
          </div>

          <div className="space-y-2">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-start gap-2">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-semibold text-neutral-600 mt-1.5">
                  {idx + 1}
                </div>
                <textarea
                  value={step.description}
                  onChange={(e) => updateStep(step.id, e.target.value)}
                  placeholder={`步驟 ${idx + 1}`}
                  rows={2}
                  className="flex-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm focus:border-neutral-400 focus:outline-none resize-none"
                />
                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStep(step.id)}
                    className="flex-shrink-0 text-neutral-300 hover:text-red-500 transition-colors mt-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Submit */}
        <div className="flex gap-3">
          <Link
            href="/fridge/recipes"
            className="flex-1 rounded-lg border border-neutral-200 py-2.5 text-center text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            取消
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors"
          >
            {saving ? '儲存中…' : '儲存食譜'}
          </button>
        </div>
      </form>
    </div>
  );
}
