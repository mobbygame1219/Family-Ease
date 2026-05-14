'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

const LOG_ACTIONS = [
  { label: '🍖 餵食', type: 'FEED' },
  { label: '💩 大便', type: 'POOP' },
  { label: '💧 換水', type: 'WATER' },
  { label: '🛁 洗澡', type: 'BATH' },
  { label: '💊 吃藥', type: 'MEDICINE' },
  { label: '🏥 看醫生', type: 'VET' },
  { label: '📝 其他', type: 'OTHER' },
];

interface Props {
  petId: string;
}

export default function PetLogButtons({ petId }: Props) {
  const [toast, setToast] = useState<string | null>(null);
  const [loadingType, setLoadingType] = useState<string | null>(null);

  async function handleLog(type: string) {
    if (loadingType) return;
    setLoadingType(type);
    try {
      const res = await fetch(`/api/calendarease/pets/${petId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        setToast('✓ 已記錄');
        setTimeout(() => setToast(null), 2000);
      }
    } finally {
      setLoadingType(null);
    }
  }

  return (
    <div className="relative">
      {/* Toast */}
      {toast && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs px-3 py-1 rounded-full shadow-md whitespace-nowrap z-10 animate-fade-in">
          {toast}
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {LOG_ACTIONS.map((action) => (
          <button
            key={action.type}
            onClick={() => handleLog(action.type)}
            disabled={!!loadingType}
            className={cn(
              'text-xs px-2 py-1 rounded-full border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors',
              loadingType === action.type && 'opacity-60 cursor-wait',
              !!loadingType && loadingType !== action.type && 'opacity-40 cursor-not-allowed'
            )}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
