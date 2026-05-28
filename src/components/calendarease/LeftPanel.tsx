'use client';

import { useState, useEffect } from 'react';
import { format, addDays, startOfDay, parseISO, isSameDay, isToday } from 'date-fns';
import {
  CalendarHeart, PawPrint,
  Dog, Cat, Rabbit, Fish, Bird, Squirrel,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CalEvent {
  id: string;
  title: string;
  startAt: string;
  isAllDay: boolean;
}

interface Pet {
  id: string;
  name: string;
  type: string;
  birthday: string | null;
  _count: { logs: number };
}

const PET_ICON: Record<string, LucideIcon> = {
  DOG:     Dog,
  CAT:     Cat,
  RABBIT:  Rabbit,
  FISH:    Fish,
  BIRD:    Bird,
  HAMSTER: Squirrel,
};
const DAY_SHORT = ['日', '一', '二', '三', '四', '五', '六'];

// ─── LeftPanel ────────────────────────────────────────────────────────────────
export default function LeftPanel({ groupId }: { groupId: string }) {
  const [tab,     setTab]     = useState<'events' | 'pets'>('events');
  const [events,  setEvents]  = useState<CalEvent[]>([]);
  const [pets,    setPets]    = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const to  = addDays(now, 7);
    Promise.all([
      fetch(`/api/calendarease/events?groupId=${groupId}&from=${now.toISOString()}&to=${to.toISOString()}`)
        .then(r => r.ok ? r.json() : []),
      fetch(`/api/calendarease/pets?groupId=${groupId}`)
        .then(r => r.ok ? r.json() : []),
    ]).then(([evs, ps]) => {
      setEvents(evs);
      setPets(ps);
      setLoading(false);
    });
  }, [groupId]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(new Date()), i));

  return (
    <aside
      className="hidden lg:flex flex-col w-60 flex-shrink-0 border-r overflow-hidden"
      style={{ background: 'var(--cal-panel-bg)', borderColor: 'var(--cal-border)' }}
    >
      {/* Tabs */}
      <div className="flex border-b flex-shrink-0" style={{ borderColor: 'var(--cal-border)' }}>
        {(['events', 'pets'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2.5 text-xs font-medium transition-colors"
            style={{
              color:        tab === t ? 'var(--cal-personal-deep)' : 'var(--cal-text3)',
              borderBottom: tab === t
                ? '2px solid var(--cal-personal-deep)'
                : '2px solid transparent',
            }}
          >
            {t === 'events' ? '近 7 天' : '寵物'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">

        {/* ── Events tab ───────────────────────────────────────────────── */}
        {tab === 'events' && (
          <>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="h-14 rounded-xl animate-pulse"
                    style={{ background: 'var(--cal-bg2)' }}
                  />
                ))}
              </div>
            ) : (
              <>
                {days.map(day => {
                  const dayEvs = events.filter(ev => isSameDay(parseISO(ev.startAt), day));
                  if (dayEvs.length === 0) return null;
                  const isT = isToday(day);
                  return (
                    <div key={day.toISOString()}>
                      <div
                        className="text-[11px] font-semibold mb-1.5"
                        style={{
                          fontFamily: "'Lora', serif",
                          color: isT ? 'var(--cal-personal-deep)' : 'var(--cal-text2)',
                        }}
                      >
                        {isT
                          ? '今天'
                          : `${format(day, 'M/d')} (${DAY_SHORT[day.getDay()]})`}
                      </div>
                      <div className="space-y-1">
                        {dayEvs.map(ev => (
                          <div
                            key={ev.id}
                            className="rounded-lg px-2.5 py-1.5 text-xs"
                            style={{ background: 'var(--cal-bg2)' }}
                          >
                            <div
                              className="font-medium truncate"
                              style={{ color: 'var(--cal-text)' }}
                            >
                              {ev.title}
                            </div>
                            <div className="text-[10px]" style={{ color: 'var(--cal-text3)' }}>
                              {ev.isAllDay ? '全天' : format(parseISO(ev.startAt), 'HH:mm')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {days.every(d => !events.some(ev => isSameDay(parseISO(ev.startAt), d))) && (
                  <div
                    className="flex flex-col items-center py-8 gap-2"
                    style={{ color: 'var(--cal-text3)' }}
                  >
                    <CalendarHeart className="h-8 w-8 opacity-30" strokeWidth={1.5} />
                    <span className="text-xs">近 7 天沒有活動</span>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── Pets tab ─────────────────────────────────────────────────── */}
        {tab === 'pets' && (
          <>
            {pets.length === 0 ? (
              <div
                className="flex flex-col items-center py-8 gap-2"
                style={{ color: 'var(--cal-text3)' }}
              >
                <PawPrint className="h-8 w-8 opacity-30" strokeWidth={1.5} />
                <span className="text-xs">尚無寵物成員</span>
              </div>
            ) : (
              pets.map(pet => {
                const PetIcon = PET_ICON[pet.type] ?? PawPrint;
                return (
                  <div
                    key={pet.id}
                    className="flex items-center gap-2.5 rounded-xl p-2.5"
                    style={{ background: 'var(--cal-pet-bg)' }}
                  >
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0"
                      style={{ background: 'var(--cal-pet-accent)' }}
                    >
                      <PetIcon className="h-4 w-4 text-white" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate" style={{ color: 'var(--cal-text)' }}>
                        {pet.name}
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--cal-text3)' }}>
                        {pet.type} · {pet._count.logs} 筆記錄
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </aside>
  );
}
