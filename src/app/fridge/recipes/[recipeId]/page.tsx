import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Users, CheckCircle, XCircle } from 'lucide-react';
import { recipes } from '@/data/recipes';

export default async function RecipeDetailPage({
  params,
}: {
  params: { recipeId: string };
}) {
  // Find in static data
  const recipe = recipes.find((r) => r.id === params.recipeId);
  if (!recipe) notFound();

  // Fetch fridge items for comparison (needs auth)
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const membership = await prisma.familyMember.findFirst({ where: { userId } });
  const fridgeItems = membership
    ? await prisma.fridgeItem.findMany({
        where: {
          fridge: { familyId: membership.familyId },
          used: false,
        },
        select: { name: true },
      })
    : [];

  const fridgeNames = fridgeItems.map((fi) => fi.name.toLowerCase());

  function isAvailable(ingredientName: string): boolean {
    // Strip parenthetical cut instructions like "（切4～6塊）" for matching
    const clean = ingredientName.replace(/（[^）]*）/g, '').trim().toLowerCase();
    return fridgeNames.some((n) => n.includes(clean) || clean.includes(n));
  }

  // Separate main ingredients from seasonings (group A/B)
  const mainIngredients = recipe.ingredients.filter((i) => !i.group);
  const seasonings = recipe.ingredients.filter((i) => i.group);

  const availableMain = mainIngredients.filter((i) => isAvailable(i.name)).length;
  const readyPercent = mainIngredients.length > 0
    ? Math.round((availableMain / mainIngredients.length) * 100)
    : 100;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-7">

      {/* Breadcrumb */}
      <div>
        <Link
          href="/fridge/recipes"
          className="inline-flex items-center gap-1.5 text-[12px] text-neutral-400 hover:text-neutral-700 transition-colors mb-4"
        >
          <ArrowLeft className="h-3 w-3" />
          食譜資料庫
        </Link>

        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
                {recipe.name}
              </h1>
              <span className="rounded border border-neutral-200 px-2 py-0.5 text-[11px] font-medium text-neutral-500">
                {recipe.category}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="flex items-center gap-1 text-[12px] text-neutral-400">
                <Clock className="h-3.5 w-3.5" />
                {recipe.cookingMinutes} 分鐘
              </span>
              <span className="flex items-center gap-1 text-[12px] text-neutral-400">
                <Users className="h-3.5 w-3.5" />
                {recipe.servings} 人份
              </span>
              {recipe.kcal && (
                <span className="text-[12px] text-neutral-400">{recipe.kcal} kcal</span>
              )}
              {recipe.features.length > 0 && (
                <span className="text-[12px] text-neutral-400">
                  {recipe.features.join('・')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fridge readiness bar (main ingredients only) */}
      {mainIngredients.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold text-neutral-700">冰箱備料狀況</span>
            <span className={`text-[12px] font-semibold ${
              readyPercent === 100 ? 'text-emerald-600' : readyPercent >= 60 ? 'text-yellow-600' : 'text-red-500'
            }`}>
              {availableMain}/{mainIngredients.length} 主要食材已備齊
            </span>
          </div>
          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                readyPercent === 100 ? 'bg-emerald-500' : readyPercent >= 60 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              style={{ width: `${readyPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Main ingredients */}
      <section>
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
          食材（{mainIngredients.length} 種）
        </h2>
        <div className="rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-100 overflow-hidden">
          {mainIngredients.map((ing, idx) => {
            const available = isAvailable(ing.name);
            return (
              <div key={idx} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2.5">
                  {available ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-neutral-300 flex-shrink-0" />
                  )}
                  <span className={`text-[13px] font-medium ${available ? 'text-neutral-900' : 'text-neutral-500'}`}>
                    {ing.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-neutral-500">{ing.amount}</span>
                  {!available && (
                    <span className="text-[10px] bg-red-50 border border-red-200 text-red-600 rounded px-1.5 py-0.5 font-medium">
                      缺少
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Seasonings / A·B groups */}
      {seasonings.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
            調味料
          </h2>
          <div className="rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-100 overflow-hidden">
            {seasonings.map((ing, idx) => (
              <div key={idx} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border border-neutral-200 text-[10px] font-bold text-neutral-500">
                    {ing.group}
                  </span>
                  <span className="text-[13px] text-neutral-700">{ing.name}</span>
                </div>
                <span className="text-[12px] text-neutral-500">{ing.amount}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Steps */}
      {recipe.steps.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
            步驟（{recipe.steps.length} 步）
          </h2>
          <div className="space-y-3">
            {recipe.steps.map((step, idx) => (
              <div key={idx} className="flex gap-4 rounded-xl border border-neutral-200 bg-white px-5 py-4">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-bold text-white">
                  {idx + 1}
                </div>
                <p className="text-[13px] text-neutral-700 leading-relaxed pt-0.5">{step}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Machine path */}
      {recipe.menuPath && (
        <section>
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
            機器操作路徑
          </h2>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-3 text-[12px] text-neutral-600 leading-relaxed">
            {recipe.menuPath}
          </div>
        </section>
      )}

      {/* Notes */}
      {recipe.notes && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-5 py-3">
          <p className="text-[12px] text-yellow-800">
            <span className="font-semibold">📝 備注：</span>{recipe.notes}
          </p>
        </div>
      )}
    </div>
  );
}
