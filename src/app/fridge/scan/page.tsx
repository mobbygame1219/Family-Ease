'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface ScannedItem {
  name: string;
  quantity: number;
  unit: string;
  price?: number;
  selected: boolean;
}

const units = ['個', '顆', '包', '袋', '瓶', '罐', '克', '公斤', '公升', '毫升', '片', '條', '盒', '把'];

export default function ScanPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<ScannedItem[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
      setItems([]);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!preview) return;
    setScanning(true);
    setError('');

    // 取得 base64（去掉 data:image/...;base64, 前綴）
    const base64 = preview.split(',')[1];

    const res = await fetch('/api/fridge/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64 }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? '辨識失敗');
      setScanning(false);
      return;
    }

    setItems((data.items ?? []).map((item: Omit<ScannedItem, 'selected'>) => ({
      ...item,
      selected: true,
    })));
    setScanning(false);
  };

  const handleSave = async () => {
    const selected = items.filter((i) => i.selected);
    if (selected.length === 0) {
      setError('請至少選擇一項食材');
      return;
    }

    setSaving(true);

    await Promise.all(
      selected.map((item) =>
        fetch('/api/fridge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price ?? null,
          }),
        })
      )
    );

    router.push('/fridge');
    router.refresh();
  };

  const updateItem = (index: number, field: string, value: string | number | boolean) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">📷 掃描收據</h1>
        <p className="text-gray-500 text-sm mt-1">上傳收據照片，AI 自動辨識食材</p>
      </div>

      {/* 上傳區域 */}
      <div
        onClick={() => fileRef.current?.click()}
        className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors mb-6 ${
          preview ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50'
        }`}
      >
        {preview ? (
          <img
            src={preview}
            alt="收據預覽"
            className="max-h-64 mx-auto rounded-lg object-contain"
          />
        ) : (
          <div>
            <div className="text-4xl mb-3">📄</div>
            <p className="text-gray-500 font-medium">點擊上傳收據照片</p>
            <p className="text-gray-400 text-sm mt-1">支援 JPG、PNG 格式</p>
          </div>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 mb-4">{error}</div>
      )}

      {/* 掃描按鈕 */}
      {preview && items.length === 0 && (
        <button
          onClick={handleScan}
          disabled={scanning}
          className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors mb-6"
        >
          {scanning ? '🔍 AI 辨識中，請稍候…' : '🔍 開始辨識'}
        </button>
      )}

      {/* 辨識結果 */}
      {items.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              辨識結果（{items.filter((i) => i.selected).length}/{items.length} 項已選）
            </h2>
            <button
              onClick={() => setItems([])}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              重新掃描
            </button>
          </div>

          <div className="space-y-3 mb-6">
            {items.map((item, index) => (
              <div
                key={index}
                className={`rounded-xl border p-4 transition-colors ${
                  item.selected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50 opacity-50'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={(e) => updateItem(index, 'selected', e.target.checked)}
                    className="accent-blue-600 w-4 h-4"
                  />
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(index, 'name', e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2 ml-7">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                    className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <select
                    value={item.unit}
                    onChange={(e) => updateItem(index, 'unit', e.target.value)}
                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  {item.price !== undefined && (
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500 text-sm">$</span>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value))}
                        className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? '儲存中…' : `加入冰箱（${items.filter((i) => i.selected).length} 項）`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}