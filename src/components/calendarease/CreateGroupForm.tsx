'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';

export default function CreateGroupForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('請輸入群組名稱');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/calendarease/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? '建立失敗，請稍後再試');
        return;
      }
      setName('');
      setOpen(false);
      router.refresh();
    } catch {
      setError('建立失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="bg-purple-600 hover:bg-purple-700 text-white"
      >
        <Plus className="h-4 w-4 mr-1" />
        建立群組
      </Button>
    );
  }

  return (
    <Card className="border-purple-200">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-foreground">建立新群組</h3>
          <button
            onClick={() => { setOpen(false); setError(''); setName(''); }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="group-name" className="text-xs mb-1 block">
              群組名稱
            </Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：家庭行事曆"
              className="border-purple-200 focus-visible:ring-purple-500"
              autoFocus
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white flex-1"
            >
              {loading ? '建立中…' : '建立'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setOpen(false); setError(''); setName(''); }}
            >
              取消
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
