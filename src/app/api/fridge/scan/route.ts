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

  const prompt = `請辨識這張收據圖片中的食材和食品。
對於每個食材，提供：名稱、數量（數字）、單位（個/顆/包/袋/瓶/罐/克/公斤/把）、價格（如果看得到）。
只包含食材和食品，不要包含清潔用品或日用品。
用繁體中文回答食材名稱。`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      quantity: { type: 'number' },
                      unit: { type: 'string' },
                      price: { type: 'number' },
                    },
                    required: ['name', 'quantity', 'unit'],
                  },
                },
              },
              required: ['items'],
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini HTTP error:', response.status, errText);
      return NextResponse.json({ error: `API 錯誤：${response.status}` }, { status: 500 });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    console.log('Gemini text:', text.slice(0, 300));

    if (!text) {
      return NextResponse.json({ error: '辨識結果為空，請重試' }, { status: 500 });
    }

    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);

  } catch (error) {
    console.error('Gemini API error:', error);
    return NextResponse.json({ error: '辨識失敗，請重試或手動輸入' }, { status: 500 });
  }
}