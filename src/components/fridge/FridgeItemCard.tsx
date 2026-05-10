'use client';

import { useState } from 'react';

interface FridgeItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number | null;
  expiresAt: Date | null;
}

export default function FridgeItemCard({
  item,
  addedByName,
}: {
  item: FridgeItem;
  addedByName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleUse = async () => {
    setLoading(true);
    await fetch(`/api/fridge/${item.id}`, { method: 'PATCH' });
    setDone(true);
    setLoading(false);
    window.location.reload();
  };

  const handleDelete = async () => {
    if (!confirm(`確定要刪除「${item.name}」嗎？`)) return;
    await fetch(`/api/fridge/${item.id}`, { method: 'DELETE' });
    window.location.reload();
  };

  const isExpiringSoon = item.expiresAt &&
    new Date(item.expiresAt).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;
  const isExpired = item.expiresAt && new Date(item.expiresAt) < new Date();

  return (
    <div className={`rounded-xl border bg-white p-4 transition-all ${
      isExpired ? 'border-red-200 bg-red-50' :
      isExpiringSoon ? 'border-orange-200 bg-orange-50' :
      'border-gray-200'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-semibold text-gray-900">{item.name}</div>
          <div className="text-sm text-gray-500 mt-0.5">
            {item.quantity} {item.unit}
            {item.price && <span className="ml-2 text-gray-400">${item.price}</span>}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">由 {addedByName} 新增</div>
        </div>
        <button
          onClick={handleDelete}
          className="text-gray-300 hover:text-red-400 transition-colors text-xs"
        >
          🗑️
        </button>
      </div>

      {item.expiresAt && (
        <div className={`text-xs mb-3 ${
          isExpired ? 'text-red-500' :
          isExpiringSoon ? 'text-orange-500' :
          'text-gray-400'
        }`}>
          {isExpired ? '⚠️ 已過期：' : isExpiringSoon ? '⏰ 即將到期：' : '📅 到期日：'}
          {new Date(item.expiresAt).toLocaleDateString('zh-TW')}
        </div>
      )}

      <button
        onClick={handleUse}
        disabled={loading || done}
        className="w-full rounded-lg bg-blue-50 border border-blue-200 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-60 transition-colors"
      >
        {loading ? '處理中…' : done ? '✓ 已用完' : '標記用完'}
      </button>
    </div>
  );
}