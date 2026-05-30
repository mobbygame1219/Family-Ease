import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

// POST /api/calendarease/prep-tasks/generate
// body: { eventId: string }
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { eventId } = (await request.json()) as { eventId: string };
    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    // Fetch the event with membership check
    const event = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
      select: {
        title: true,
        startAt: true,
        description: true,
        location: true,
        groupId: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const membership = await prisma.calendarMember.findUnique({
      where: { userId_groupId: { userId: session.user.id, groupId: event.groupId } },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete any existing AI-generated tasks for this event (regenerate fresh)
    await prisma.prepTask.deleteMany({ where: { eventId } });

    // ── Call Gemini ──────────────────────────────────────────────────────────
    const eventDate = format(event.startAt, 'yyyy年M月d日 HH:mm');
    const locationStr = event.location ? `，地點：${event.location}` : '';
    const descStr = event.description ? `，說明：${event.description}` : '';

    const prompt =
      `活動名稱：${event.title}，活動日期：${eventDate}${locationStr}${descStr}。` +
      `請列出 5–8 個「以活動日期為 deadline，事前可以準備的具體步驟」，` +
      `每個步驟包含 title（中文，15字以內）、notes（說明，可選，可為空字串）、` +
      `suggestedAt（建議在活動前幾天完成的日期，ISO date string，格式 YYYY-MM-DD）。` +
      `以 JSON 陣列回傳，不要有多餘說明文字。`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title:       { type: 'string' },
                  notes:       { type: 'string' },
                  suggestedAt: { type: 'string' },
                },
                required: ['title'],
              },
            },
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('[prep-tasks/generate] Gemini error:', geminiRes.status, errText);
      return NextResponse.json({ error: 'AI 服務暫時無法使用' }, { status: 500 });
    }

    const geminiData = await geminiRes.json();
    const rawText: string =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';

    type AiTask = { title: string; notes?: string; suggestedAt?: string };
    let aiTasks: AiTask[] = [];
    try {
      aiTasks = JSON.parse(rawText);
      if (!Array.isArray(aiTasks)) aiTasks = [];
    } catch {
      aiTasks = [];
    }

    // ── Write to DB ──────────────────────────────────────────────────────────
    const created = await Promise.all(
      aiTasks.map((t, idx) =>
        prisma.prepTask.create({
          data: {
            title:       t.title?.slice(0, 50) ?? '準備步驟',
            notes:       t.notes   || null,
            suggestedAt: t.suggestedAt ? new Date(t.suggestedAt) : null,
            order:       idx,
            eventId,
            createdById: session.user.id,
          },
        })
      )
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('[prep-tasks/generate]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
