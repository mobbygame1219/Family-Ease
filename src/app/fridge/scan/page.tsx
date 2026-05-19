'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface ScannedItem {
  name: string;
  quantity: number;
  unit: string;
  price?: number;
  selected: boolean;
}

interface FridgeOption {
  id: string;
  name: string;
  emoji: string;
}

const units = ['個', '顆', '包', '袋', '瓶', '罐', '克', '公斤', '公升', '毫升', '片', '條', '盒', '把'];

function ScanForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedFridgeId = searchParams.get('fridgeId');

  const fileRef = useRef<HTMLInputElement>(null);
  const [fridges, setFridges] = useState<FridgeOption[]>([]);
  const [selectedFridgeId, setSelectedFridgeId] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetch('/api/fridge/fridges')
      .then((r) => r.json())
      .then((data: FridgeOption[]) => {
        setFridges(data);
        const match = data.find((f) => f.id === preselectedFridgeId);
        setSelectedFridgeId(match ? match.id : (data[0]?.id ?? ''));
      });
  }, [preselectedFridgeId]);

  const loadFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('請上傳圖片檔案（JPG、PNG 等）');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
      setItems([]);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  };

  const handleScan = async () => {
    if (!preview) return;
    setScanning(true);
    setError('');

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
    if (selected.length === 0) { setError('請至少選擇一項食材'); return; }
    if (!selectedFridgeId) { setError('請選擇冰箱'); return; }

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
            fridgeId: selectedFridgeId,
          }),
        })
      )
    );

    router.push(`/fridge/${selectedFridgeId}`);
    router.refresh();
  };

  const updateItem = (index: number, field: string, value: string | number | boolean) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">掃描收據</h1>
        <p className="text-sm text-neutral-500 mt-1">上傳收據照片，AI 自動辨識食材</p>
      </div>

      {/* Fridge selector */}
      {fridges.length > 1 && (
        <div className="mb-5">
          <label className="block text-xs font-medium text-neutral-500 mb-1.5">加入到哪個冰箱</label>
          <select
            value={selectedFridgeId}
            onChange={(e) => setSelectedFridgeId(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none"
          >
            {fridges.map((f) => (
              <option key={f.id} value={f.id}>{f.emoji} {f.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Upload area */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors mb-6 ${
          isDragging
            ? 'border-neutral-500 bg-neutral-100'
            : preview
            ? 'border-neutral-300 bg-neutral-50'
            : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
        }`}
      >
        {isDragging ? (
          <div>
            <div className="text-4xl mb-3">📂</div>
            <p className="text-neutral-700 font-semibold text-sm">放開以上傳圖片</p>
          </div>
        ) : preview ? (
          <img src={preview} alt="收據預覽" className="max-h-64 mx-auto rounded-lg object-contain" />
        ) : (
          <div>
            <div className="text-4xl mb-3">📄</div>
            <p className="text-neutral-600 font-medium text-sm">點擊上傳，或將收據照片拖曳至此</p>
            <p className="text-neutral-400 text-xs mt-1">支援 JPG、PNG 格式</p>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600 mb-4">{error}</div>
      )}

      {/* Scan button */}
      {preview && items.length === 0 && (
        <button
          onClick={handleScan}
          disabled={scanning}
          className="w-full rounded-lg bg-neutral-900 py-3 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors mb-6"
        >
          {scanning ? '🔍 AI 辨識中，請稍候…' : '🔍 開始辨識'}
        </button>
      )}

      {/* Results */}
      {items.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-semibold text-neutral-900">
              辨識結果（{items.filter((i) => i.selected).length}/{items.length} 項已選）
            </h2>
            <button
              onClick={() => setItems([])}
              className="text-[12px] text-neutral-400 hover:text-neutral-700 transition-colors"
            >
              重新掃描
            </button>
          </div>

          <div className="space-y-3 mb-6">
            {items.map((item, index) => (
              <div
                key={index}
                className={`rounded-xl border p-4 transition-colors ${
                  item.selected
                    ? 'border-neutral-300 bg-white'
                    : 'border-neutral-100 bg-neutral-50 opacity-50'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={(e) => updateItem(index, 'selected', e.target.checked)}
                    className="accent-neutral-800 w-4 h-4"
                  />
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(index, 'name', e.target.value)}
                    className="flex-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium focus:border-neutral-400 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2 ml-7">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                    className="w-20 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm focus:border-neutral-400 focus:outline-none"
                  />
                  <select
                    value={item.unit}
                    onChange={(e) => updateItem(index, 'unit', e.target.value)}
                    className="rounded-lg border border-neutral-200 px-2 py-1.5 text-sm focus:border-neutral-400 focus:outline-none"
                  >
                    {units.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                  {item.price !== undefined && (
                    <div className="flex items-center gap-1">
                      <span className="text-neutral-400 text-sm">$</span>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value))}
                        className="w-20 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm focus:border-neutral-400 focus:outline-none"
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
              className="flex-1 rounded-lg border border-neutral-200 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-lg bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50 transition-colors"
            >
              {saving ? '儲存中…' : `加入冰箱（${items.filter((i) => i.selected).length} 項）`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense>
      <ScanForm />
    </Suspense>
  );
}
