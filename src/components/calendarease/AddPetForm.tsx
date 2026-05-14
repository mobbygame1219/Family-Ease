'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';

const PET_TYPES = [
  { label: '狗', value: 'DOG' },
  { label: '貓', value: 'CAT' },
  { label: '兔', value: 'RABBIT' },
  { label: '魚', value: 'FISH' },
  { label: '鳥', value: 'BIRD' },
  { label: '倉鼠', value: 'HAMSTER' },
  { label: '其他', value: 'OTHER' },
];

interface Props {
  groups: { id: string; name: string }[];
}

export default function AddPetForm({ groups }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('DOG');
  const [birthday, setBirthday] = useState('');
  const [groupId, setGroupId] = useState(groups[0]?.id ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function reset() {
    setName('');
    setType('DOG');
    setBirthday('');
    setGroupId(groups[0]?.id ?? '');
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('請輸入寵物名字'); return; }
    if (!groupId) { setError('請選擇群組'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/calendarease/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          type,
          birthday: birthday || undefined,
          groupId,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? '新增失敗');
        return;
      }
      reset();
      setOpen(false);
      router.refresh();
    } catch {
      setError('新增失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        <Plus className="h-4 w-4 mr-1" />
        新增寵物
      </Button>
    );
  }

  return (
    <Card className="border-blue-200">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-foreground">新增寵物</h3>
          <button
            onClick={() => { setOpen(false); reset(); }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* 名字 */}
          <div>
            <Label htmlFor="pet-name" className="text-xs mb-1 block">名字</Label>
            <Input
              id="pet-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：小白"
              className="border-blue-200 focus-visible:ring-blue-500"
              autoFocus
            />
          </div>

          {/* 種類 */}
          <div>
            <Label htmlFor="pet-type" className="text-xs mb-1 block">種類</Label>
            <select
              id="pet-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-md border border-blue-200 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PET_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* 生日 */}
          <div>
            <Label htmlFor="pet-birthday" className="text-xs mb-1 block">生日（選填）</Label>
            <Input
              id="pet-birthday"
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="border-blue-200 focus-visible:ring-blue-500"
            />
          </div>

          {/* 群組 */}
          <div>
            <Label htmlFor="pet-group" className="text-xs mb-1 block">所屬群組</Label>
            <select
              id="pet-group"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full rounded-md border border-blue-200 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? '新增中…' : '新增'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setOpen(false); reset(); }}
            >
              取消
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
