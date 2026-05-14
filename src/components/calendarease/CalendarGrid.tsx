'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  format,
  isSameDay,
  parseISO,
  addMonths,
  subMonths,
} from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, X, MapPin, Clock, User, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  color: string;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  location?: string | null;
  description?: string | null;
  createdBy: { id: string; name: string };
}

interface Props {
  year: number;
  month: number; // 1-indexed
  events: CalendarEvent[];
  groupId: string;
}

const DAY_HEADERS = ['一', '二', '三', '四', '五', '六', '日'];

// Map getDay() (0=Sun) to our Mon-first index
function getDayIndex(date: Date): number {
  const d = getDay(date); // 0=Sun, 1=Mon...6=Sat
  return d === 0 ? 6 : d - 1; // Mon=0...Sun=6
}

export default function CalendarGrid({ year, month, events, groupId }: Props) {
  const router = useRouter();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const currentMonthDate = new Date(year, month - 1, 1);
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonthDate),
    end: endOfMonth(currentMonthDate),
  });

  const firstDayIndex = getDayIndex(startOfMonth(currentMonthDate));
  const totalCells = Math.ceil((firstDayIndex + daysInMonth.length) / 7) * 7;
  const cells: (Date | null)[] = [
    ...Array(firstDayIndex).fill(null),
    ...daysInMonth,
    ...Array(totalCells - firstDayIndex - daysInMonth.length).fill(null),
  ];

  function navigate(delta: number) {
    const next = delta > 0
      ? addMonths(currentMonthDate, 1)
      : subMonths(currentMonthDate, 1);
    const nextYear = next.getFullYear();
    const nextMonth = next.getMonth() + 1;
    router.push(`/calendarease/${groupId}?year=${nextYear}&month=${nextMonth}`);
  }

  function getEventsForDay(day: Date) {
    return events.filter((e) => isSameDay(parseISO(e.startAt), day));
  }

  async function handleDelete(eventId: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/calendarease/events/${eventId}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedEvent(null);
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Month Navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-purple-50">
        <button
          onClick={() => navigate(-1)}
          className="p-1 rounded hover:bg-purple-100 text-purple-600"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="font-semibold text-foreground text-base">
          {format(currentMonthDate, 'yyyy年 M月', { locale: zhTW })}
        </h2>
        <button
          onClick={() => navigate(1)}
          className="p-1 rounded hover:bg-purple-100 text-purple-600"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAY_HEADERS.map((d, i) => (
          <div
            key={d}
            className={cn(
              'text-center text-xs font-medium py-2',
              i >= 5 ? 'text-purple-500' : 'text-muted-foreground'
            )}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day Cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) {
            return (
              <div
                key={`empty-${idx}`}
                className="min-h-[80px] border-b border-r border-gray-50 bg-gray-50/50"
              />
            );
          }

          const dayEvents = getEventsForDay(day);
          const today = isSameDay(day, new Date());
          const isWeekend = getDayIndex(day) >= 5;

          return (
            <div
              key={day.toISOString()}
              onClick={() => {
                const dateStr = format(day, 'yyyy-MM-dd');
                router.push(`/calendarease/${groupId}/events/new?date=${dateStr}`);
              }}
              className={cn(
                'min-h-[80px] border-b border-r border-gray-100 p-1 cursor-pointer hover:bg-purple-50/50 transition-colors',
                isWeekend && 'bg-gray-50/30'
              )}
            >
              <div className="flex justify-end mb-1">
                <span
                  className={cn(
                    'text-xs font-medium h-5 w-5 flex items-center justify-center rounded-full',
                    today
                      ? 'bg-purple-600 text-white'
                      : isWeekend
                      ? 'text-purple-400'
                      : 'text-foreground'
                  )}
                >
                  {format(day, 'd')}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <button
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                    className="flex items-center gap-1 w-full rounded px-1 py-0.5 text-left hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: ev.color + '20' }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ev.color }}
                    />
                    <span className="text-xs truncate leading-tight">{ev.title}</span>
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-xs text-muted-foreground px-1">
                    +{dayEvents.length - 3} 筆
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: selectedEvent.color }}
                />
                <h3 className="font-semibold text-foreground text-lg leading-tight">
                  {selectedEvent.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-muted-foreground hover:text-foreground ml-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 flex-shrink-0 text-purple-400" />
                {selectedEvent.isAllDay ? (
                  <span>
                    {format(parseISO(selectedEvent.startAt), 'yyyy/MM/dd')} 全天
                  </span>
                ) : (
                  <span>
                    {format(parseISO(selectedEvent.startAt), 'yyyy/MM/dd HH:mm')} —{' '}
                    {format(parseISO(selectedEvent.endAt), 'HH:mm')}
                  </span>
                )}
              </div>
              {selectedEvent.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 flex-shrink-0 text-purple-400" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}
              {selectedEvent.description && (
                <div className="text-sm text-foreground bg-gray-50 rounded-lg p-3 mt-1">
                  {selectedEvent.description}
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <User className="h-4 w-4 flex-shrink-0 text-purple-400" />
                <span>建立者：{selectedEvent.createdBy.name}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                asChild
                variant="outline"
                className="flex-1 border-purple-200 text-purple-600 hover:bg-purple-50"
              >
                <a href={`/calendarease/${groupId}/events/${selectedEvent.id}/edit`}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  編輯
                </a>
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-red-200 text-red-500 hover:bg-red-50"
                disabled={deleting}
                onClick={() => handleDelete(selectedEvent.id)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {deleting ? '刪除中…' : '刪除'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
