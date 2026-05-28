'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  format, addDays, addWeeks, addMonths, subWeeks, subMonths, subDays,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay,
  isSameDay, isSameMonth, parseISO, differenceInMinutes, getHours, getMinutes,
  eachDayOfInterval, isToday, addMinutes,
} from 'date-fns';
import {
  ChevronLeft, ChevronRight, Plus, MapPin, X, Trash2, Clock, CalendarHeart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CalEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  color: string | null;
  isFromPetLog: boolean;
  createdBy: { id: string; name: string };
}
type ViewMode = 'week' | 'month' | 'list';
type EventCat = 'work' | 'personal' | 'pet';

// ─── Constants ────────────────────────────────────────────────────────────────
const SLOT_H      = 28;
const DAY_START   = 8 * 60;    // 480 min
const DAY_END     = 22 * 60;   // 1320 min
const GRID_H      = (DAY_END - DAY_START) / 30 * SLOT_H; // 784 px
const HOURS       = Array.from({ length: 14 }, (_, i) => i + 8); // 8..21
const DAY_LABELS  = ['一', '二', '三', '四', '五', '六', '日'];
const DAY_SHORT   = ['日', '一', '二', '三', '四', '五', '六'];
const WORK_COLORS = new Set(['#3a6070', '#8ab8cc', '#3b82f6']);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function evCat(ev: CalEvent): EventCat {
  if (ev.isFromPetLog) return 'pet';
  if (ev.color && WORK_COLORS.has(ev.color.toLowerCase())) return 'work';
  return 'personal';
}

const CAT_BG: Record<EventCat, string> = {
  work:     'var(--cal-work-card)',
  personal: 'var(--cal-personal-card)',
  pet:      'var(--cal-pet-bg)',
};
const CAT_DEEP: Record<EventCat, string> = {
  work:     'var(--cal-work-deep)',
  personal: 'var(--cal-personal-deep)',
  pet:      '#2d6b2d',
};
const CAT_BORDER: Record<EventCat, string> = {
  work:     'var(--cal-work-accent)',
  personal: 'var(--cal-personal-accent)',
  pet:      'var(--cal-pet-accent)',
};

function evPos(ev: CalEvent) {
  const s  = parseISO(ev.startAt);
  const e  = parseISO(ev.endAt);
  const sm = getHours(s) * 60 + getMinutes(s);
  const em = getHours(e) * 60 + getMinutes(e);
  const cs = Math.max(sm, DAY_START);
  const ce = Math.min(em, DAY_END);
  return {
    top:    (cs - DAY_START) / 30 * SLOT_H,
    height: Math.max((ce - cs) / 30 * SLOT_H, SLOT_H),
  };
}

// ─── Main CalendarView ────────────────────────────────────────────────────────
export default function CalendarView({
  groupId,
  currentUserId,
}: {
  groupId: string;
  currentUserId: string;
}) {
  const [view,     setView]     = useState<ViewMode>('month');
  const [focus,    setFocus]    = useState(() => new Date());
  const [events,   setEvents]   = useState<CalEvent[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selEv,    setSelEv]    = useState<CalEvent | null>(null);
  const [selPos,   setSelPos]   = useState({ x: 0, y: 0 });
  const [qcDate,   setQcDate]   = useState<Date | null>(null);
  const [qcPos,    setQcPos]    = useState({ x: 0, y: 0 });
  const [qcTitle,  setQcTitle]  = useState('');
  const [qcSaving, setQcSaving] = useState(false);
  const [dragId,   setDragId]   = useState<string | null>(null);
  const [dragOff,  setDragOff]  = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  // ── Fetch range ─────────────────────────────────────────────────────────────
  const { fromISO, toISO } = useMemo(() => {
    if (view === 'week') {
      const ws = startOfWeek(focus, { weekStartsOn: 1 });
      const we = endOfWeek(focus,   { weekStartsOn: 1 });
      return { fromISO: ws.toISOString(), toISO: we.toISOString() };
    }
    if (view === 'month') {
      return {
        fromISO: addDays(startOfMonth(focus), -7).toISOString(),
        toISO:   addDays(endOfMonth(focus),    7).toISOString(),
      };
    }
    return {
      fromISO: startOfDay(focus).toISOString(),
      toISO:   addDays(focus, 14).toISOString(),
    };
  }, [view, focus]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(
        `/api/calendarease/events?groupId=${groupId}&from=${fromISO}&to=${toISO}`
      );
      if (r.ok) setEvents(await r.json());
    } finally { setLoading(false); }
  }, [groupId, fromISO, toISO]);

  useEffect(() => { load(); }, [load]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const prev  = () => setFocus(d =>
    view === 'week' ? subWeeks(d, 1) : view === 'month' ? subMonths(d, 1) : subDays(d, 14));
  const next  = () => setFocus(d =>
    view === 'week' ? addWeeks(d, 1) : view === 'month' ? addMonths(d, 1) : addDays(d, 14));
  const goToday = () => setFocus(new Date());

  const navLabel = useMemo(() => {
    if (view === 'week') {
      const ws = startOfWeek(focus, { weekStartsOn: 1 });
      const we = endOfWeek(focus,   { weekStartsOn: 1 });
      return `${format(ws, 'M/d')} — ${format(we, 'M/d')}`;
    }
    if (view === 'month') return format(focus, 'yyyy 年 M 月');
    return `${format(focus, 'M/d')} 起 14 天`;
  }, [view, focus]);

  // ── Event handlers ──────────────────────────────────────────────────────────
  function openDetail(ev: CalEvent, x: number, y: number) {
    setSelEv(ev); setSelPos({ x, y });
  }
  async function deleteEv(id: string) {
    if (!confirm('確定要刪除此活動？')) return;
    const r = await fetch(`/api/calendarease/events/${id}`, { method: 'DELETE' });
    if (r.ok) { setSelEv(null); load(); }
  }
  async function submitQuick(e: React.FormEvent) {
    e.preventDefault();
    if (!qcTitle.trim() || !qcDate) return;
    setQcSaving(true);
    const r = await fetch('/api/calendarease/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId,
        title:    qcTitle.trim(),
        startAt:  qcDate.toISOString(),
        endAt:    addMinutes(qcDate, 60).toISOString(),
        isAllDay: false,
      }),
    });
    if (r.ok) { setQcDate(null); setQcTitle(''); load(); }
    setQcSaving(false);
  }
  async function dropEv(dayDate: Date, slotIdx: number) {
    if (!dragId) return;
    const ev  = events.find(e => e.id === dragId);
    if (!ev) return;
    const raw = DAY_START + slotIdx * 30 - dragOff;
    const cMin = Math.max(DAY_START, Math.min(Math.round(raw / 30) * 30, DAY_END - 30));
    const dur  = differenceInMinutes(parseISO(ev.endAt), parseISO(ev.startAt));
    const ns   = new Date(dayDate);
    ns.setHours(Math.floor(cMin / 60), cMin % 60, 0, 0);
    const ne = addMinutes(ns, dur);
    const r = await fetch(`/api/calendarease/events/${dragId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startAt: ns.toISOString(), endAt: ne.toISOString() }),
    });
    if (r.ok) load();
    setDragId(null);
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      ref={wrapRef}
      data-cal
      className="relative flex flex-col h-full overflow-hidden"
      style={{ background: 'var(--cal-bg)', color: 'var(--cal-text)' }}
    >
      {/* ── TopBar ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-2.5 border-b flex-shrink-0"
        style={{ background: 'var(--cal-panel-bg)', borderColor: 'var(--cal-border)' }}
      >
        {/* View switcher */}
        <div
          className="flex items-center gap-0.5 rounded-xl p-0.5"
          style={{ background: 'var(--cal-bg2)' }}
        >
          {(['week', 'month', 'list'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
              style={{
                background:  view === v ? 'white' : 'transparent',
                color:       view === v ? 'var(--cal-text)' : 'var(--cal-text2)',
                boxShadow:   view === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {{ week: '週', month: '月', list: '清單' }[v]}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={prev}
            className="p-1.5 rounded-lg transition-colors hover:bg-black/5"
          >
            <ChevronLeft className="h-4 w-4" style={{ color: 'var(--cal-text2)' }} />
          </button>
          <button
            onClick={goToday}
            className="px-2.5 py-1 rounded-xl text-sm font-medium transition-colors hover:bg-black/5 min-w-[148px] text-center"
            style={{ color: 'var(--cal-text)', fontFamily: "'Lora', serif" }}
          >
            {navLabel}
            {loading && (
              <span
                className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle animate-pulse"
                style={{ background: 'var(--cal-personal-accent)' }}
              />
            )}
          </button>
          <button
            onClick={next}
            className="p-1.5 rounded-lg transition-colors hover:bg-black/5"
          >
            <ChevronRight className="h-4 w-4" style={{ color: 'var(--cal-text2)' }} />
          </button>
        </div>

        {/* Add button */}
        <Link
          href={`/calendarease/${groupId}/events/new`}
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--cal-personal-deep)' }}
        >
          <Plus className="h-3.5 w-3.5" />
          新增活動
        </Link>
      </div>

      {/* ── Calendar body ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {view === 'week' && (
          <WeekView
            focus={focus}
            events={events}
            onEventClick={openDetail}
            onSlotClick={(d, x, y) => { setQcDate(d); setQcPos({ x, y }); setQcTitle(''); }}
            onDragStart={(id, off) => { setDragId(id); setDragOff(off); }}
            onDrop={dropEv}
          />
        )}
        {view === 'month' && (
          <MonthView
            focus={focus}
            events={events}
            onEventClick={openDetail}
            onDayClick={d => { setFocus(d); setView('week'); }}
          />
        )}
        {view === 'list' && (
          <ListView focus={focus} events={events} onEventClick={openDetail} />
        )}
      </div>

      {/* ── Event detail popover ───────────────────────────────────────────── */}
      {selEv && (
        <DetailPopover
          ev={selEv}
          pos={selPos}
          wrapRef={wrapRef}
          currentUserId={currentUserId}
          onClose={() => setSelEv(null)}
          onDelete={deleteEv}
        />
      )}

      {/* ── Quick-create popover ───────────────────────────────────────────── */}
      {qcDate && (
        <QuickCreate
          date={qcDate}
          pos={qcPos}
          title={qcTitle}
          onTitle={setQcTitle}
          onSubmit={submitQuick}
          onClose={() => setQcDate(null)}
          saving={qcSaving}
          wrapRef={wrapRef}
        />
      )}
    </div>
  );
}

// ─── WeekView ─────────────────────────────────────────────────────────────────
function WeekView({
  focus, events, onEventClick, onSlotClick, onDragStart, onDrop,
}: {
  focus: Date;
  events: CalEvent[];
  onEventClick: (ev: CalEvent, x: number, y: number) => void;
  onSlotClick:  (date: Date,   x: number, y: number) => void;
  onDragStart:  (id: string, offsetMin: number) => void;
  onDrop:       (day: Date, slotIdx: number) => void;
}) {
  const ws   = startOfWeek(focus, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const now  = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowTop = (nowMin - DAY_START) / 30 * SLOT_H;
  const showNow = nowMin >= DAY_START && nowMin <= DAY_END;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Day header row */}
      <div className="flex flex-shrink-0 border-b" style={{ borderColor: 'var(--cal-border)' }}>
        <div className="w-12 flex-shrink-0" />
        {days.map((day, i) => {
          const isT = isToday(day);
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center py-1.5 border-l"
              style={{ borderColor: 'var(--cal-border)', background: 'var(--cal-panel-bg)' }}
            >
              <span className="text-[10px]" style={{ color: 'var(--cal-text3)' }}>
                {DAY_LABELS[i]}
              </span>
              <span
                className="text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full mt-0.5"
                style={{
                  background: isT ? 'var(--cal-personal-deep)' : 'transparent',
                  color: isT ? 'white' : 'var(--cal-text)',
                }}
              >
                {format(day, 'd')}
              </span>
            </div>
          );
        })}
      </div>

      {/* All-day row */}
      <div className="flex flex-shrink-0 border-b" style={{ borderColor: 'var(--cal-border)', minHeight: 24 }}>
        <div className="w-12 flex-shrink-0 flex items-center justify-end pr-1.5">
          <span className="text-[9px]" style={{ color: 'var(--cal-text3)' }}>全天</span>
        </div>
        {days.map((day, i) => {
          const allDayEvs = events.filter(ev => ev.isAllDay && isSameDay(parseISO(ev.startAt), day));
          return (
            <div
              key={i}
              className="flex-1 border-l px-0.5 py-0.5 space-y-0.5"
              style={{ borderColor: 'var(--cal-border)' }}
            >
              {allDayEvs.map(ev => {
                const cat = evCat(ev);
                return (
                  <div
                    key={ev.id}
                    data-event="1"
                    onClick={e => { e.stopPropagation(); onEventClick(ev, e.clientX, e.clientY); }}
                    className="text-[9px] font-medium rounded px-1 truncate cursor-pointer leading-4"
                    style={{ background: CAT_BG[cat], color: CAT_DEEP[cat] }}
                  >
                    {ev.title}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div className="flex flex-1 overflow-y-auto scrollbar-thin">
        {/* Time labels */}
        <div className="w-12 flex-shrink-0 relative" style={{ height: GRID_H }}>
          {HOURS.map((h, i) => (
            <div
              key={h}
              className="absolute right-1.5 text-[10px] leading-none select-none"
              style={{ top: i * SLOT_H * 2 - 5, color: 'var(--cal-text3)' }}
            >
              {String(h).padStart(2, '0')}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day, i) => {
          const dayEvs = events.filter(ev => !ev.isAllDay && isSameDay(parseISO(ev.startAt), day));
          return (
            <div
              key={i}
              className="flex-1 border-l relative"
              style={{ height: GRID_H, borderColor: 'var(--cal-border)', minWidth: 0 }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                onDrop(day, Math.max(0, Math.floor((e.clientY - rect.top) / SLOT_H)));
              }}
              onClick={e => {
                if ((e.target as HTMLElement).closest('[data-event]')) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top;
                const slotMin = DAY_START + Math.floor(y / SLOT_H) * 30;
                const d = new Date(day);
                d.setHours(Math.floor(slotMin / 60), slotMin % 60, 0, 0);
                onSlotClick(d, e.clientX, e.clientY);
              }}
            >
              {/* Grid lines */}
              {HOURS.map((h, hi) => (
                <div key={h}>
                  <div
                    className="absolute left-0 right-0 border-t"
                    style={{ top: hi * SLOT_H * 2, borderColor: 'var(--cal-border)' }}
                  />
                  <div
                    className="absolute left-0 right-0 border-t border-dashed opacity-40"
                    style={{ top: hi * SLOT_H * 2 + SLOT_H, borderColor: 'var(--cal-border)' }}
                  />
                </div>
              ))}

              {/* Now line */}
              {isToday(day) && showNow && (
                <div
                  className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                  style={{ top: nowTop }}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0 -ml-1"
                    style={{ background: 'var(--cal-personal-accent)' }}
                  />
                  <div className="flex-1 h-px" style={{ background: 'var(--cal-personal-accent)' }} />
                </div>
              )}

              {/* Timed events */}
              {dayEvs.map(ev => {
                const cat = evCat(ev);
                const { top, height } = evPos(ev);
                return (
                  <div
                    key={ev.id}
                    data-event="1"
                    draggable
                    onDragStart={e => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      onDragStart(ev.id, Math.floor((e.clientY - rect.top) / SLOT_H) * 30);
                    }}
                    onClick={e => { e.stopPropagation(); onEventClick(ev, e.clientX, e.clientY); }}
                    className="absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 text-xs overflow-hidden cursor-pointer border-l-2 hover:shadow-md hover:brightness-95 transition-all z-10"
                    style={{
                      top:             top + 1,
                      height:          height - 2,
                      background:      CAT_BG[cat],
                      borderLeftColor: CAT_BORDER[cat],
                      color:           CAT_DEEP[cat],
                    }}
                  >
                    <div className="font-semibold truncate leading-tight text-[11px]">{ev.title}</div>
                    {height >= 42 && (
                      <div className="text-[9px] opacity-70">
                        {format(parseISO(ev.startAt), 'HH:mm')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MonthView ────────────────────────────────────────────────────────────────
function MonthView({
  focus, events, onEventClick, onDayClick,
}: {
  focus: Date;
  events: CalEvent[];
  onEventClick: (ev: CalEvent, x: number, y: number) => void;
  onDayClick:   (date: Date) => void;
}) {
  const gridStart = startOfWeek(startOfMonth(focus), { weekStartsOn: 1 });
  const gridEnd   = endOfWeek(endOfMonth(focus),   { weekStartsOn: 1 });
  const days      = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weekCount = days.length / 7;

  return (
    <div className="flex flex-col h-full p-2 overflow-hidden">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1 flex-shrink-0">
        {DAY_LABELS.map(d => (
          <div
            key={d}
            className="text-center text-[11px] font-medium py-1"
            style={{ color: 'var(--cal-text3)' }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div
        className="grid grid-cols-7 flex-1"
        style={{ gridTemplateRows: `repeat(${weekCount}, 1fr)` }}
      >
        {days.map(day => {
          const dayEvs = events.filter(ev => isSameDay(parseISO(ev.startAt), day));
          const inMonth = isSameMonth(day, focus);
          const isT     = isToday(day);
          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className="m-0.5 rounded-xl p-1.5 cursor-pointer border overflow-hidden transition-all hover:shadow-sm"
              style={{
                background:   isT ? 'var(--cal-personal-card)' : inMonth ? 'white' : 'transparent',
                borderColor:  isT ? 'var(--cal-personal-accent)' : 'var(--cal-border)',
                opacity:      inMonth ? 1 : 0.35,
              }}
            >
              <div className="flex justify-end mb-0.5">
                <span
                  className="text-[11px] font-medium w-5 h-5 flex items-center justify-center rounded-full"
                  style={{
                    background: isT ? 'var(--cal-personal-deep)' : 'transparent',
                    color:      isT ? 'white' : inMonth ? 'var(--cal-text)' : 'var(--cal-text3)',
                  }}
                >
                  {format(day, 'd')}
                </span>
              </div>
              <div className="space-y-0.5">
                {dayEvs.slice(0, 3).map(ev => {
                  const cat = evCat(ev);
                  return (
                    <div
                      key={ev.id}
                      data-event="1"
                      onClick={e => { e.stopPropagation(); onEventClick(ev, e.clientX, e.clientY); }}
                      className="text-[10px] rounded px-1 truncate leading-[14px] cursor-pointer"
                      style={{ background: CAT_BG[cat], color: CAT_DEEP[cat] }}
                    >
                      {ev.title}
                    </div>
                  );
                })}
                {dayEvs.length > 3 && (
                  <div className="text-[10px] pl-1" style={{ color: 'var(--cal-text3)' }}>
                    +{dayEvs.length - 3} 更多
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ListView ─────────────────────────────────────────────────────────────────
function ListView({
  focus, events, onEventClick,
}: {
  focus: Date;
  events: CalEvent[];
  onEventClick: (ev: CalEvent, x: number, y: number) => void;
}) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(startOfDay(focus), i));
  const hasAny = days.some(d => events.some(ev => isSameDay(parseISO(ev.startAt), d)));

  return (
    <div className="overflow-y-auto h-full px-4 py-4 space-y-5 scrollbar-thin">
      {!hasAny && (
        <div className="flex flex-col items-center py-20 gap-3" style={{ color: 'var(--cal-text3)' }}>
          <CalendarHeart className="h-12 w-12 opacity-30" strokeWidth={1.5} />
          <span className="text-sm">未來 14 天沒有活動</span>
        </div>
      )}
      {days.map(day => {
        const dayEvs = events.filter(ev => isSameDay(parseISO(ev.startAt), day));
        if (dayEvs.length === 0) return null;
        const isT = isToday(day);
        return (
          <div key={day.toISOString()}>
            {/* Day heading */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-sm font-semibold"
                style={{
                  fontFamily: "'Lora', serif",
                  color: isT ? 'var(--cal-personal-deep)' : 'var(--cal-text)',
                }}
              >
                {format(day, 'M 月 d 日')}
                <span className="ml-1.5 text-[11px] font-normal" style={{ color: 'var(--cal-text3)' }}>
                  ({DAY_SHORT[day.getDay()]})
                </span>
                {isT && (
                  <span className="ml-2 text-xs font-normal" style={{ color: 'var(--cal-personal-accent)' }}>
                    今天
                  </span>
                )}
              </span>
              <div className="flex-1 h-px" style={{ background: 'var(--cal-border)' }} />
            </div>

            {/* Event chips */}
            <div className="space-y-1.5 pl-1">
              {dayEvs.map(ev => {
                const cat = evCat(ev);
                return (
                  <div
                    key={ev.id}
                    onClick={e => onEventClick(ev, e.clientX, e.clientY)}
                    className="flex items-start gap-3 rounded-xl p-3 cursor-pointer hover:shadow-sm border-l-2 transition-all"
                    style={{ background: CAT_BG[cat], borderLeftColor: CAT_BORDER[cat] }}
                  >
                    <Clock className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: CAT_DEEP[cat] }} />
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-sm font-medium truncate"
                        style={{ color: CAT_DEEP[cat] }}
                      >
                        {ev.title}
                      </div>
                      <div className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--cal-text2)' }}>
                        {ev.isAllDay
                          ? '全天'
                          : `${format(parseISO(ev.startAt), 'HH:mm')} – ${format(parseISO(ev.endAt), 'HH:mm')}`}
                        {ev.location && ` · ${ev.location}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Detail Popover ───────────────────────────────────────────────────────────
function DetailPopover({
  ev, pos, wrapRef, currentUserId, onClose, onDelete,
}: {
  ev: CalEvent;
  pos: { x: number; y: number };
  wrapRef: React.RefObject<HTMLDivElement>;
  currentUserId: string;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cat = evCat(ev);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Position relative to wrapper
  const wrect  = wrapRef.current?.getBoundingClientRect();
  const pw     = wrect?.width  ?? 800;
  const ph     = wrapRef.current?.clientHeight ?? 600;
  const lx     = wrect ? pos.x - wrect.left : pos.x;
  const ly     = wrect ? pos.y - wrect.top  : pos.y;
  const left   = Math.max(8, Math.min(lx, pw - 296));
  const top    = Math.min(ly + 10, ph - 260);
  const canDel = !ev.isFromPetLog && ev.createdBy.id === currentUserId;

  return (
    <div
      ref={ref}
      className="absolute z-50 w-72 rounded-2xl shadow-xl border overflow-hidden"
      style={{
        left,
        top,
        background:   CAT_BG[cat],
        borderColor:  CAT_BORDER[cat],
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 p-4 pb-2">
        <h3
          className="text-sm font-semibold leading-snug"
          style={{ color: CAT_DEEP[cat], fontFamily: "'Lora', serif" }}
        >
          {ev.title}
        </h3>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-0.5 rounded-lg hover:bg-black/10 transition-colors"
        >
          <X className="h-3.5 w-3.5" style={{ color: 'var(--cal-text2)' }} />
        </button>
      </div>

      {/* Details */}
      <div className="px-4 pb-2 space-y-1.5">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--cal-text2)' }}>
          <Clock className="h-3 w-3 flex-shrink-0" />
          {ev.isAllDay
            ? `${format(parseISO(ev.startAt), 'M 月 d 日')} 全天`
            : `${format(parseISO(ev.startAt), 'M/d HH:mm')} – ${format(parseISO(ev.endAt), 'HH:mm')}`}
        </div>
        {ev.location && (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--cal-text2)' }}>
            <MapPin className="h-3 w-3 flex-shrink-0" />
            {ev.location}
          </div>
        )}
        {ev.description && (
          <p className="text-xs leading-relaxed pt-0.5" style={{ color: 'var(--cal-text2)' }}>
            {ev.description}
          </p>
        )}
        <div className="text-[10px] pt-0.5" style={{ color: 'var(--cal-text3)' }}>
          {ev.createdBy.name} 建立
          {ev.isFromPetLog && ' · 寵物記錄'}
        </div>
      </div>

      {/* Actions */}
      {canDel && (
        <div className="flex gap-1 px-3 pb-3">
          <button
            onClick={() => onDelete(ev.id)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-red-100"
            style={{ color: '#dc2626' }}
          >
            <Trash2 className="h-3 w-3" />
            刪除活動
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Quick-create Popover ─────────────────────────────────────────────────────
function QuickCreate({
  date, pos, title, onTitle, onSubmit, onClose, saving, wrapRef,
}: {
  date: Date;
  pos: { x: number; y: number };
  title: string;
  onTitle: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  saving: boolean;
  wrapRef: React.RefObject<HTMLDivElement>;
}) {
  const ref      = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const wrect = wrapRef.current?.getBoundingClientRect();
  const pw    = wrect?.width  ?? 800;
  const ph    = wrapRef.current?.clientHeight ?? 600;
  const lx    = wrect ? pos.x - wrect.left : pos.x;
  const ly    = wrect ? pos.y - wrect.top  : pos.y;
  const left  = Math.max(8, Math.min(lx, pw - 272));
  const top   = Math.min(ly + 10, ph - 140);

  return (
    <div
      ref={ref}
      className="absolute z-50 w-64 rounded-2xl shadow-xl border p-4"
      style={{
        left,
        top,
        background:  'var(--cal-panel-bg)',
        borderColor: 'var(--cal-border)',
      }}
    >
      <div className="text-xs mb-2" style={{ color: 'var(--cal-text2)' }}>
        {format(date, 'M/d HH:mm')} 新增活動
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <input
          ref={inputRef}
          value={title}
          onChange={e => onTitle(e.target.value)}
          placeholder="活動標題…"
          className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
          style={{
            borderColor: 'var(--cal-border)',
            background:  'white',
            color:       'var(--cal-text)',
          }}
          onKeyDown={e => e.key === 'Escape' && onClose()}
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="flex-1 rounded-xl py-1.5 text-xs font-semibold text-white disabled:opacity-50 transition-colors"
            style={{ background: 'var(--cal-personal-deep)' }}
          >
            {saving ? '儲存中…' : '新增'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 rounded-xl border text-xs py-1.5 hover:bg-black/5 transition-colors"
            style={{ borderColor: 'var(--cal-border)', color: 'var(--cal-text2)' }}
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
