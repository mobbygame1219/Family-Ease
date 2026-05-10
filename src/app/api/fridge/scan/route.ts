import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { imageBase64 } = await request.json();

  if (!imageBase64) {
    return NextResponse.json({ error: '請提供圖片' }, { status: 400 });
  }

  const prompt = `
你是一個收據辨識助手，專門辨識台灣超市和賣場的購物收據。

請從這張收據圖片中，辨識所有購買的食材和食品，並以 JSON 格式回傳。

規則：
1. 只擷取食材和食品類商品（不包括清潔用品、日用品等）
2. 盡量辨識數量和單位（個/顆/包/袋/瓶/罐/克/公斤等）
3. 如果無法辨識數量，預設為 1
4. 如果無法辨識單位，根據食材特性猜測（雞蛋→顆、牛奶→瓶、蔬菜→把等）
5. 回傳的 JSON 格式如下，不要包含任何其他文字：

{
  "items": [
    {
      "name": "食材名稱",
      "quantity": 數量（數字）,
      "unit": "單位",
      "price": 價格（數字，如果看得到的話）
    }
  ]
}
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2000,
          },
        }),
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // 清理並解析 JSON
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Gemini API error:', error);
    return NextResponse.json({ error: '辨識失敗，請重試或手動輸入' }, { status: 500 });
  }
}