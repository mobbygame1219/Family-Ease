'use client';

import { useState, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  { label: '工作・藍',   value: '#3a6070' },
  { label: '工作・淡藍', value: '#8ab8cc' },
  { label: '個人・玫瑰', value: '#703a60' },
  { label: '個人・粉',   value: '#cc8bac' },
  { label: '家庭・綠',   value: '#4a7c4a' },
  { label: '其他・橙',   value: '#c47830' },
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

/** Format a Date to datetime-local value (YYYY-MM-DDTHH:mm) in local time */
function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Return a datetime-local string that is 1 hour after the given one */
function addOneHour(dt: string): string {
  if (!dt) return '';
  const d = new Date(dt);
  d.setHours(d.getHours() + 1);
  return toDatetimeLocal(d);
}

export default function NewEventPage() {
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const searchParams = useSearchParams();

  // Build sensible defaults from ?date= query param
  const prefillDate = searchParams.get('date') ?? '';
  const now = new Date();
  const defaultDate = prefillDate || toDatetimeLocal(now).slice(0, 10);

  // Round now to next half-hour for nicer default
  const roundedNow = new Date(now);
  roundedNow.setMinutes(now.getMinutes() < 30 ? 30 : 0, 0, 0);
  if (now.getMinutes() >= 30) roundedNow.setHours(roundedNow.getHours() + 1);

  const defaultStart = prefillDate
    ? `${prefillDate}T09:00`
    : toDatetimeLocal(roundedNow);
  const defaultEnd = addOneHour(defaultStart);

  const [title, setTitle] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [startAt, setStartAt] = useState(defaultStart);
  const [endAt, setEndAt] = useState(defaultEnd);
  const [startDate, setStartDate] = useState(defaultDate);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3a6070');
  const [notifyBefore, setNotifyBefore] = useState('0');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Track whether the user has manually changed the end time
  const [endAtManuallyChanged, setEndAtManuallyChanged] = useState(false);

  const handleStartAtChange = useCallback((value: string) => {
    setStartAt(value);
    // If end time was never manually touched, keep it = start + 1 h
    if (!endAtManuallyChanged && value) {
      setEndAt(addOneHour(value));
    }
  }, [endAtManuallyChanged]);

  const handleEndAtChange = useCallback((value: string) => {
    setEndAt(value);
    setEndAtManuallyChanged(true); // user took control — stop auto-updating
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
      if (new Date(endAt) <= new Date(startAt)) {
        setError('結束時間必須晚於開始時間'); return;
      }
      resolvedStart = new Date(startAt).toISOString();
      resolvedEnd   = new Date(endAt).toISOString();
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/calendarease/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: params.groupId,
          title: title.trim(),
          isAllDay,
          startAt: resolvedStart,
          endAt: resolvedEnd,
          location: location.trim() || undefined,
          description: description.trim() || undefined,
          color,
          notifyBefore: Number(notifyBefore),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? '新增失敗');
        return;
      }
      router.push(`/calendarease/${params.groupId}`);
    } catch {
      setError('新增失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <Link href={`/calendarease/${params.groupId}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-foreground">新增活動</h1>
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
                className="border-[#cc8bac] focus-visible:ring-[#703a60]"
              />
            </div>

            {/* 全天 */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="allDay"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="h-4 w-4 accent-[#703a60]"
              />
              <Label htmlFor="allDay" className="text-sm cursor-pointer">全天活動</Label>
            </div>

            {/* 時間欄位 — 24 小時制 datetime-local */}
            {isAllDay ? (
              <div>
                <Label htmlFor="startDate" className="text-sm mb-1 block">日期</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border-[#cc8bac] focus-visible:ring-[#703a60]"
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
                    className="border-[#cc8bac] focus-visible:ring-[#703a60]"
                  />
                </div>
                <div>
                  <Label htmlFor="endAt" className="text-sm mb-1 block">
                    結束時間
                    {!endAtManuallyChanged && (
                      <span className="ml-1 text-xs text-muted-foreground font-normal">（自動）</span>
                    )}
                  </Label>
                  <Input
                    id="endAt"
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => handleEndAtChange(e.target.value)}
                    className="border-[#cc8bac] focus-visible:ring-[#703a60]"
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
                className="border-[#cc8bac] focus-visible:ring-[#703a60]"
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
                className="w-full rounded-md border border-[#cc8bac] bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#703a60] focus:ring-offset-0 resize-none"
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
                className="w-full rounded-md border border-[#cc8bac] bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#703a60]"
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
                disabled={loading}
                className="flex-1 bg-[#703a60] hover:bg-[#5a2e4d] text-white"
              >
                {loading ? '儲存中…' : '儲存活動'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/calendarease/${params.groupId}`}>取消</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
