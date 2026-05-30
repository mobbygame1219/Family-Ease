'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

export default function RecipeDeleteButton({
  recipeId,
  recipeTitle,
}: {
  recipeId: string;
  recipeTitle: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`確定要刪除食譜「${recipeTitle}」嗎？`)) return;
    setLoading(true);

    const res = await fetch(`/api/fridge/recipes/${recipeId}`, { method: 'DELETE' });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error ?? '刪除失敗');
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
      title="刪除"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
