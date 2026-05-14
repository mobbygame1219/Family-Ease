'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  { label: '紫', value: '#8b5cf6' },
  { label: '藍', value: '#3b82f6' },
  { label: '綠', value: '#22c55e' },
  { label: '紅', value: '#ef4444' },
  { label: '橙', value: '#f97316' },
  { label: '粉', value: '#ec4899' },
];

const NOTIFICATION_OPTIONS = [
  { label: '不通知', value: '0' },
  { label: '5 分鐘前', value: '5' },
  { label: '10 分鐘前', value: '10' },
  { label: '15 分鐘前', value: '15' },
  { label: '30 分鐘前', value: '30' },
  { label: '1 小時前', value: '60' },
  { label: '1 天前', value: '1440' },
];

/** Format a Date to datetime-local string (YYYY-MM-DDTHH:mm) */
function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Add one hour to a datetime-local string */
function addOneHour(dt: string): string {
  if (!dt) return '';
  const d = new Date(dt);
  d.setHours(d.getHours() + 1);
  return toDatetimeLocal(d);
}

export default function EditEventPage() {
  const router = useRouter();
  const { groupId, eventId } = useParams<{ groupId: string; eventId: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  const [title, setTitle] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [startDate, setStartDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#8b5cf6');
  const [notifyBefore, setNotifyBefore] = useState('0');
  const [endAtManuallyChanged, setEndAtManuallyChanged] = useState(false);

  // Fetch existing event
  useEffect(() => {
    fetch(`/api/calendarease/events?groupId=${groupId}`)
      .then((r) => r.json())
      .then((events: { id: string; title: string; isAllDay: boolean; startAt: string; endAt: string; location: string | null; description: string | null; color: string; notifyBefore: number; isFromPetLog: boolean }[]) => {
        const ev = events.find((e) => e.id === eventId);
        if (!ev) { setNotFound(true); setLoading(false); return; }
        if (ev.isFromPetLog) { setNotFound(true); setLoading(false); return; }

        setTitle(ev.title);
        setIsAllDay(ev.isAllDay);
        setColor(ev.color);
        setNotifyBefore(String(ev.notifyBefore));
        setLocation(ev.location ?? '');
        setDescription(ev.description ?? '');

        const start = new Date(ev.startAt);
        const end   = new Date(ev.endAt);
        if (ev.isAllDay) {
          setStartDate(ev.startAt.slice(0, 10));
        } else {
          setStartAt(toDatetimeLocal(start));
          setEndAt(toDatetimeLocal(end));
          setEndAtManuallyChanged(true); // pre-filled end = already "set"
        }
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [eventId, groupId]);

  const handleStartAtChange = useCallback((value: string) => {
    setStartAt(value);
    if (!endAtManuallyChanged && value) {
      setEndAt(addOneHour(value));
    }
  }, [endAtManuallyChanged]);

  const handleEndAtChange = useCallback((value: string) => {
    setEndAt(value);
    setEndAtManuallyChanged(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('請輸入活動標題'); return; }

    let resolvedStart: string;
    let resolvedEnd: string;

    if (isAllDay) {
      if (!startDate) { setError('請選擇日期'); return; }
      resolvedStart = new Date(`${startDate}T00:00:00`).toISOString();
      resolvedEnd   = new Date(`${startDate}T23:59:59`).toISOString();
    } else {
      if (!startAt || !endAt) { setError('請選擇開始與結束時間'); return; }
      resolvedStart = new Date(startAt).toISOString();
      resolvedEnd   = new Date(endAt).toISOString();
    }

    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/calendarease/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          isAllDay,
          startAt: resolvedStart,
          endAt:   resolvedEnd,
          location: location.trim() || undefined,
          description: description.trim() || undefined,
          color,
          notifyBefore: Number(notifyBefore),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? '儲存失敗');
        return;
      }
      router.push(`/calendarease/${groupId}`);
    } catch {
      setError('儲存失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px]">
        <div className="h-8 w-8 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center">
        <p className="text-muted-foreground mb-4">找不到此行程，或此行程不允許編輯。</p>
        <Link href={`/calendarease/${groupId}`} className="text-purple-600 underline text-sm">
          返回行事曆
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <Link href={`/calendarease/${groupId}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-foreground">編輯活動</h1>
      </div>

      <Card>
        <CardContent className="pt-5 pb-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* 標題 */}
            <div>
              <Label htmlFor="title" className="text-sm mb-1 block">
                標題 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="活動名稱"
                className="border-purple-200 focus-visible:ring-purple-500"
              />
            </div>

            {/* 全天 */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="allDay"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="h-4 w-4 accent-purple-600"
              />
              <Label htmlFor="allDay" className="text-sm cursor-pointer">全天活動</Label>
            </div>

            {/* 時間 */}
            {isAllDay ? (
              <div>
                <Label htmlFor="startDate" className="text-sm mb-1 block">日期</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border-purple-200 focus-visible:ring-purple-500"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="startAt" className="text-sm mb-1 block">開始時間</Label>
                  <Input
                    id="startAt"
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => handleStartAtChange(e.target.value)}
                    className="border-purple-200 focus-visible:ring-purple-500"
                  />
                </div>
                <div>
                  <Label htmlFor="endAt" className="text-sm mb-1 block">結束時間</Label>
                  <Input
                    id="endAt"
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => handleEndAtChange(e.target.value)}
                    className="border-purple-200 focus-visible:ring-purple-500"
                  />
                </div>
              </div>
            )}

            {/* 地點 */}
            <div>
              <Label htmlFor="location" className="text-sm mb-1 block">地點</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="（選填）"
                className="border-purple-200 focus-visible:ring-purple-500"
              />
            </div>

            {/* 說明 */}
            <div>
              <Label htmlFor="description" className="text-sm mb-1 block">說明</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="（選填）"
                rows={3}
                className="w-full rounded-md border border-purple-200 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 resize-none"
              />
            </div>

            {/* 顏色 */}
            <div>
              <Label className="text-sm mb-2 block">顏色</Label>
              <div className="flex gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={cn(
                      'h-7 w-7 rounded-full transition-all',
                      color === c.value && 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* 提前通知 */}
            <div>
              <Label htmlFor="notify" className="text-sm mb-1 block">提前通知</Label>
              <select
                id="notify"
                value={notifyBefore}
                onChange={(e) => setNotifyBefore(e.target.value)}
                className="w-full rounded-md border border-purple-200 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {NOTIFICATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button
                type="submit"
                disabled={saving}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {saving ? '儲存中…' : '儲存變更'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/calendarease/${groupId}`}>取消</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
