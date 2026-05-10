'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteExpense({
  expenseId,
  expenseTitle,
}: {
  expenseId: string;
  expenseTitle: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    await fetch(`/api/expenses/${expenseId}`, { method: 'DELETE' });
    router.refresh();
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">確定刪除？</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs text-red-500 font-medium hover:underline disabled:opacity-60"
        >
          {loading ? '刪除中…' : '確定'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-gray-400 hover:underline"
        >
          取消
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-gray-300 hover:text-red-400 transition-colors"
      title={`刪除「${expenseTitle}」`}
    >
      🗑️
    </button>
  );
}