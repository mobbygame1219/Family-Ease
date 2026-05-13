import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CATEGORY_META } from '@/lib/ledger';

// ── CSV helpers ──────────────────────────────────────────────────────────────

/** Parse one CSV line respecting double-quoted fields. */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Convert ROC (民國) date string to ISO date.
 * Handles "113/01/15" or "113-01-15" → "2024-01-15"
 * If already looks like western year (≥1911) pass through.
 */
function rocToISO(raw: string): string {
  const cleaned = raw.trim().replace(/[年月]/g, '/').replace(/日$/, '');
  const sep = cleaned.includes('/') ? '/' : '-';
  const parts = cleaned.split(sep).map((p) => p.trim());
  if (parts.length !== 3) return raw;
  const yr = parseInt(parts[0]);
  const adYear = yr < 1000 ? yr + 1911 : yr; // ROC → AD
  return `${adYear}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
}

// ── Types ────────────────────────────────────────────────────────────────────

interface ParsedItem {
  date: string;
  storeName: string;
  description: string;
  amount: number;
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: '請上傳 CSV 檔案' }, { status: 400 });
  }

  const raw = await file.text();
  // Remove UTF-8 BOM if present
  const csvText = raw.replace(/^﻿/, '');
  const lines = csvText.split(/\r?\n/);

  // ── Parse two-section structure ──────────────────────────────────────────
  // Section A  : invoice headers  (消費日期 | 賣方名稱 | 發票號碼 | …)
  // Section B  : item details     (發票號碼 | 品名 | 數量 | 單價 | 小計 | …)

  const invoiceMap: Record<string, { date: string; storeName: string }> = {};
  const items: ParsedItem[] = [];

  type Mode = 'searching' | 'invoice' | 'item';
  let mode: Mode = 'searching';

  let invDateCol = 1;   // defaults based on typical column order
  let invStoreCol = 4;
  let invNumCol = 5;
  let itemInvNumCol = 0;
  let itemNameCol = 1;
  let itemTotalCol = 4;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const cols = parseCsvLine(line);

    // ── Detect invoice-header row ────────────────────────────────────────
    const hasDateCol  = cols.some((c) => c.includes('消費日期'));
    const hasStoreCol = cols.some((c) => c.includes('賣方名稱') || c.includes('賣方'));
    const hasInvCol   = cols.some((c) => c.includes('發票號碼'));

    if (hasDateCol && hasStoreCol) {
      mode = 'invoice';
      invDateCol  = cols.findIndex((c) => c.includes('消費日期'));
      invStoreCol = cols.findIndex((c) => c.includes('賣方名稱') || c.includes('賣方'));
      invNumCol   = cols.findIndex((c) => c.includes('發票號碼'));
      if (invDateCol < 0) invDateCol = 1;
      if (invStoreCol < 0) invStoreCol = 4;
      if (invNumCol < 0) invNumCol = 5;
      continue;
    }

    // ── Detect item-detail header row ────────────────────────────────────
    const hasItemName = cols.some((c) => c === '品名' || c.includes('品名'));
    const hasUnitPrice = cols.some((c) => c.includes('單價') || c.includes('小計'));

    if (hasItemName && hasUnitPrice) {
      mode = 'item';
      itemInvNumCol = cols.findIndex((c) => c.includes('發票號碼'));
      itemNameCol   = cols.findIndex((c) => c === '品名' || c.includes('品名'));
      // Use the LAST 小計 column (individual item subtotal, not invoice total)
      const subtotalIndices = cols.reduce((acc: number[], c, i) =>
        c.includes('小計') ? [...acc, i] : acc, []);
      itemTotalCol = subtotalIndices[subtotalIndices.length - 1] ?? cols.length - 2;
      if (itemInvNumCol < 0) itemInvNumCol = 0;
      if (itemNameCol < 0) itemNameCol = 1;
      continue;
    }

    // ── Accumulate data rows ─────────────────────────────────────────────
    if (mode === 'invoice') {
      const invNum = (cols[invNumCol] ?? '').replace(/-/g, '').trim();
      const dateRaw = cols[invDateCol] ?? '';
      const storeName = (cols[invStoreCol] ?? '').trim() || '未知店家';
      if (invNum) {
        invoiceMap[invNum] = { date: rocToISO(dateRaw), storeName };
      }
    } else if (mode === 'item') {
      const invNumRaw = (cols[itemInvNumCol] ?? '').replace(/-/g, '').trim();
      const description = (cols[itemNameCol] ?? '').trim();
      const amountStr  = (cols[itemTotalCol] ?? '0').replace(/,/g, '');
      const amount = parseFloat(amountStr) || 0;

      if (!description || amount <= 0) continue;

      const invoice = invoiceMap[invNumRaw] ?? {
        date: new Date().toISOString().slice(0, 10),
        storeName: '未知店家',
      };
      items.push({ date: invoice.date, storeName: invoice.storeName, description, amount });
    }
  }

  if (items.length === 0) {
    return NextResponse.json(
      { error: '找不到品項明細，請確認是否匯出「含品項明細」的 CSV 格式' },
      { status: 400 }
    );
  }

  // ── Gemini: batch categorise all items ───────────────────────────────────
  const categoryKeys = Object.keys(CATEGORY_META);
  const itemNames = items.map((i) => i.description);

  const prompt = `你是一個台灣消費分類助手。請根據品名列表，判斷每個品名的消費類別。
類別只能從以下 key 選一個：${categoryKeys.join(', ')}

類別說明：
TRANSPORT=交通（計程車/公車/捷運/停車/油費/票務）
FOOD=飲食（餐廳/外賣/超商食品/飲料/咖啡）
MEDICAL=醫療（藥品/診療/保健食品）
ENTERTAINMENT=娛樂（電影/遊戲/KTV/書籍/訂閱）
FASHION_BEAUTY=治裝＋美妝（衣物/鞋包/化妝品/美髮）
HOUSING=房租水電（房租/水費/電費/瓦斯/網路）
DAILY=日用品（清潔/衛生紙/生活雜貨）
EDUCATION=教育（學費/補習/線上課程）
FINANCE=理財（保費/投資/ATM手續費）
OTHER=其他

品名列表 (JSON array):
${JSON.stringify(itemNames)}

回傳格式：{"categories":["FOOD","TRANSPORT",...]} — 與品名等長`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4000,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                categories: {
                  type: 'array',
                  items: { type: 'string', enum: categoryKeys },
                },
              },
              required: ['categories'],
            },
          },
        }),
      }
    );

    if (!geminiRes.ok) throw new Error(`Gemini HTTP ${geminiRes.status}`);

    const geminiData = await geminiRes.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    const { categories } = JSON.parse(text) as { categories: string[] };

    const result = items.map((item, i) => ({
      ...item,
      category: categoryKeys.includes(categories?.[i]) ? categories[i] : 'OTHER',
    }));

    return NextResponse.json({ items: result });
  } catch (err) {
    console.error('Gemini categorise error:', err);
    // Graceful fallback — return items with OTHER so user can still edit + import
    return NextResponse.json({
      items: items.map((item) => ({ ...item, category: 'OTHER' })),
      warning: 'AI 自動分類暫時無法使用，已設定為「其他」，請在預覽頁手動調整類別',
    });
  }
}
