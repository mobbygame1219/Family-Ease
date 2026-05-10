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

  const prompt = `你是收據辨識助手。請從這張收據圖片辨識所有食材和食品，回傳純 JSON，不要有任何說明文字或 markdown。格式如下：
{"items":[{"name":"食材名稱","quantity":數量,"unit":"單位","price":價格}]}
只包含食材和食品，不包含清潔用品。如果看不到價格就不要包含 price 欄位。`;

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

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini HTTP error:', response.status, errText);
      return NextResponse.json({ error: `API 錯誤：${response.status}` }, { status: 500 });
    }

    const data = await response.json();
    console.log('Gemini response:', JSON.stringify(data).slice(0, 500));

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    console.log('Gemini text:', text);

    if (!text) {
      return NextResponse.json({ error: '辨識結果為空，請重試' }, { status: 500 });
    }

    // 嘗試從回傳文字中找到 JSON 部分
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in:', text);
      return NextResponse.json({ error: '無法解析辨識結果，請重試' }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);

  } catch (error) {
    console.error('Gemini API error:', error);
    return NextResponse.json({ error: '辨識失敗，請重試或手動輸入' }, { status: 500 });
  }
}