import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { recipes as systemRecipes } from '@/data/recipes';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { budget, people, preferences, meals, fridgeIds, useSubstitutes } = await request.json();
  const mealList: string[] = Array.isArray(meals) && meals.length > 0
    ? meals
    : ['早餐', '午餐', '晚餐'];
  const substituteMode: boolean = useSubstitutes !== false; // default true

  // Resolve which fridge IDs to use
  let resolvedFridgeIds: string[];
  if (Array.isArray(fridgeIds) && fridgeIds.length > 0) {
    resolvedFridgeIds = fridgeIds;
  } else {
    const membership = await prisma.familyMember.findFirst({
      where: { userId: session.user.id },
    });
    const familyFridges = await prisma.fridge.findMany({
      where: { familyId: membership?.familyId ?? '' },
      select: { id: true },
    });
    resolvedFridgeIds = familyFridges.map((f: { id: string }) => f.id);
  }

  // Fetch fridge items
  const fridgeItems = await prisma.fridgeItem.findMany({
    where: { fridgeId: { in: resolvedFridgeIds }, used: false },
    select: { name: true, quantity: true, unit: true },
  });

  const itemsList = fridgeItems.length > 0
    ? fridgeItems.map((i) => `${i.name} ${i.quantity}${i.unit}`).join('、')
    : '冰箱目前是空的';

  // Build recipe library text from static data (name + category + ingredient names only)
  const recipeLibraryText =
    '\n\n以下是我們家的食譜庫，請優先從這些食譜中挑選適合的料理設計菜單：\n' +
    systemRecipes
      .map((r) => {
        const ingNames = r.ingredients.map((i) => i.name).join('、');
        return `${r.name} - ${r.category} - 食材：${ingNames}`;
      })
      .join('\n');

  // Substitute ingredient instruction
  const substituteInstruction = substituteMode
    ? '\n\n【替代食材規則】當食譜需要的食材冰箱沒有時，請先從冰箱現有食材中尋找合適的替代品（例如：沒有九層塔可用香菜替代、沒有鮮奶油可用牛奶替代）。只有完全找不到替代食材時，才列入採購清單。在每道菜的 substitutes 欄位中標明使用了哪些替代品（格式：{ original: "原食材", substitute: "替代食材" }）。如果沒有用替代食材，substitutes 為空陣列。'
    : '\n\n【採購清單規則】缺少的食材一律直接列入採購清單，不需要尋找替代品。每道菜的 substitutes 欄位請設為空陣列。';

  const prompt = `你是一位專業的台灣家庭廚師助手。

冰箱現有食材：${itemsList}${recipeLibraryText}

請根據以下條件設計今天的菜單：
- 預算：${budget} 元（請盡量讓總花費接近或達到此預算，充分利用預算）
- 人數：${people} 人
- 需設計的餐次：${mealList.join('、')}
- 備註：${preferences || '無特別要求'}${substituteInstruction}

請只設計以上指定的餐次，每個餐次的 time 欄位必須完全對應到餐次名稱（例如「早餐」、「午餐」、「晚餐」、「消夜」）。
盡量使用冰箱現有食材和家庭食譜庫中的食譜，不足的食材依照上述規則處理。
每道菜列出簡單的食材和做法。`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4000,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                meals: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      time: { type: 'string' },
                      name: { type: 'string' },
                      ingredients: { type: 'array', items: { type: 'string' } },
                      steps: { type: 'array', items: { type: 'string' } },
                      estimatedCost: { type: 'number' },
                      substitutes: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            original: { type: 'string' },
                            substitute: { type: 'string' },
                          },
                          required: ['original', 'substitute'],
                        },
                      },
                    },
                    required: ['time', 'name', 'ingredients', 'steps', 'estimatedCost', 'substitutes'],
                  },
                },
                shoppingList: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      quantity: { type: 'string' },
                      estimatedPrice: { type: 'number' },
                    },
                    required: ['name', 'quantity', 'estimatedPrice'],
                  },
                },
                totalCost: { type: 'number' },
                tips: { type: 'string' },
              },
              required: ['meals', 'shoppingList', 'totalCost'],
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini error:', response.status, errText);
      return NextResponse.json({ error: 'AI 服務暫時無法使用' }, { status: 500 });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!text) {
      return NextResponse.json({ error: '無法生成菜單，請重試' }, { status: 500 });
    }

    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);

  } catch (error) {
    console.error('Menu API error:', error);
    return NextResponse.json({ error: '生成菜單失敗，請重試' }, { status: 500 });
  }
}
