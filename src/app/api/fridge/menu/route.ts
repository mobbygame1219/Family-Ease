import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { budget, people, preferences } = await request.json();

// 取得家庭 ID
const membership = await prisma.familyMember.findFirst({
  where: { userId: session.user.id },
});

const fridgeItems = await prisma.fridgeItem.findMany({
  where: { familyId: membership?.familyId, used: false },
  select: { name: true, quantity: true, unit: true },
});

  const itemsList = fridgeItems.length > 0
    ? fridgeItems.map((i) => `${i.name} ${i.quantity}${i.unit}`).join('、')
    : '冰箱目前是空的';

  const prompt = `你是一位專業的台灣家庭廚師助手。

冰箱現有食材：${itemsList}

請根據以下條件設計今天的菜單：
- 預算：${budget} 元
- 人數：${people} 人
- 備註：${preferences || '無特別要求'}

請設計包含早餐、午餐、晚餐的一日菜單。
盡量使用冰箱現有食材，不足的食材列出需要額外採購的清單。
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
            maxOutputTokens: 3000,
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
                      ingredients: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                      steps: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                      estimatedCost: { type: 'number' },
                    },
                    required: ['time', 'name', 'ingredients', 'steps', 'estimatedCost'],
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