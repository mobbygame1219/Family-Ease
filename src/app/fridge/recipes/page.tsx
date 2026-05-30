'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock, Users, BookOpen, ChevronRight, Search } from 'lucide-react';
import { recipes, type RecipeCategory } from '@/data/recipes';

const CATEGORY_COLOR: Record<RecipeCategory, string> = {
  '煮物・肉類':       'bg-red-50    text-red-700    border-red-200',
  '煮物・魚肉':       'bg-blue-50   text-blue-700   border-blue-200',
  '煮物・蔬菜':       'bg-green-50  text-green-700  border-green-200',
  '煮物・常備菜':     'bg-yellow-50 text-yellow-700 border-yellow-200',
  '煮物・豆類':       'bg-orange-50 text-orange-700 border-orange-200',
  '煮物・佃煮・醬汁': 'bg-amber-50  text-amber-700  border-amber-200',
  '咖哩・濃湯':       'bg-yellow-50 text-yellow-700 border-yellow-200',
  '湯品':             'bg-cyan-50   text-cyan-700   border-cyan-200',
  '汆燙・蒸物':       'bg-teal-50   text-teal-700   border-teal-200',
  '煮麵':             'bg-violet-50 text-violet-700 border-violet-200',
};

const ALL_CATEGORIES = Array.from(new Set(recipes.map((r) => r.category)));

export default function RecipesPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<RecipeCategory | 'ALL'>('ALL');

  const filtered = recipes.filter((r) => {
    const matchCat = activeCategory === 'ALL' || r.category === activeCategory;
    const matchSearch =
      !search ||
      r.name.includes(search) ||
      r.ingredients.some((i) => i.name.includes(search));
    return matchCat && matchSearch;
  });

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">食譜資料庫</h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              系統提供的食譜庫 · 共 {recipes.length} 道 · AI 菜單設計優先參考
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[12px] text-neutral-500">
            <BookOpen className="h-3.5 w-3.5" />
            唯讀
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋食譜名稱或食材…"
          className="w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-4 py-2 text-sm focus:border-neutral-400 focus:outline-none"
        />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveCategory('ALL')}
          className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
            activeCategory === 'ALL'
              ? 'border-neutral-800 bg-neutral-900 text-white'
              : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
          }`}
        >
          全部（{recipes.length}）
        </button>
        {ALL_CATEGORIES.map((cat) => {
          const count = recipes.filter((r) => r.category === cat).length;
          const active = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(active ? 'ALL' : cat)}
              className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                active
                  ? 'border-neutral-800 bg-neutral-900 text-white'
                  : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
              }`}
            >
              {cat}（{count}）
            </button>
          );
        })}
      </div>

      {/* Recipe list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 py-12 text-center">
          <p className="text-sm text-neutral-500">找不到符合的食譜</p>
          <button
            onClick={() => { setSearch(''); setActiveCategory('ALL'); }}
            className="mt-2 text-[12px] text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            清除篩選
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          <p className="text-[11px] text-neutral-400 px-1">顯示 {filtered.length} 道食譜</p>
          {filtered.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/fridge/recipes/${recipe.id}`}
              className="group flex items-center gap-4 rounded-xl border border-neutral-200 bg-white px-5 py-3.5 hover:border-neutral-300 hover:shadow-sm transition-all"
            >
              {/* Category badge */}
              <div className={`hidden sm:flex flex-shrink-0 items-center justify-center rounded-lg border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${CATEGORY_COLOR[recipe.category] ?? 'bg-neutral-100 text-neutral-600 border-neutral-200'}`}>
                {recipe.category}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-neutral-900 truncate">
                  {recipe.name}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-[11px] text-neutral-400">
                    <Clock className="h-3 w-3" />
                    {recipe.cookingMinutes} 分鐘
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-neutral-400">
                    <Users className="h-3 w-3" />
                    {recipe.servings} 人份
                  </span>
                  {recipe.kcal && (
                    <span className="text-[11px] text-neutral-400">{recipe.kcal} kcal</span>
                  )}
                  <span className="sm:hidden text-[10px] text-neutral-400">{recipe.category}</span>
                </div>
              </div>

              <ChevronRight className="h-4 w-4 text-neutral-300 group-hover:text-neutral-500 flex-shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
