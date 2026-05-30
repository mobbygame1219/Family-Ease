'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  format, addDays, addWeeks, addMonths, subWeeks, subMonths, subDays,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay,
  isSameDay, isSameMonth, parseISO, differenceInMinutes, getHours, getMinutes,
  eachDayOfInterval, isToday, addMinutes,
} from 'date-fns';
import {
  ChevronLeft, ChevronRight, Plus, MapPin, X, Trash2, Clock, CalendarHeart,
  Check, Pencil,
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
  notifyBefore: number;
  attendeeIds: string | null;   // JSON-encoded string[]
  isFromPetLog: boolean;
  createdBy: { id: string; name: string };
}

// ─── Modal types ──────────────────────────────────────────────────────────────
interface ModalInitial {
  id?: string;           // if set → edit mode
  title?: string;
  startAt?: Date;
  endAt?: Date;
  isAllDay?: boolean;
  location?: string;
  description?: string;
  color?: string;
  notifyBefore?: number;
  attendeeIds?: string[];
}

interface CalGroupMember {
  id: string;
  userId: string;
  role: string;
  user: { id: string; name: string | null; email: string | null };
}
type ViewMode = 'week' | 'month' | 'list';
type EventCat = 'work' | 'personal' | 'pet';

// ─── Form constants ───────────────────────────────────────────────────────────
const PRESET_COLORS = [
  { label: '工作・藍',   value: '#3a6070' },
  { label: '工作・淡藍', value: '#8ab8cc' },
  { label: '個人・玫瑰', value: '#703a60' },
  { label: '個人・粉',   value: '#cc8bac' },
  { label: '家庭・綠',   value: '#4a7c4a' },
  { label: '其他・橙',   value: '#c47830' },
];
const NOTIFY_OPTIONS = [
  { label: '不通知',   value: 0    },
  { label: '5 分鐘前',  value: 5    },
  { label: '15 分鐘前', value: 15   },
  { label: '30 分鐘前', value: 30   },
  { label: '1 小時前',  value: 60   },
  { label: '1 天前',    value: 1440 },
];

function toDatetimeLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function roundToHalf(d: Date): Date {
  const r = new Date(d);
  if (r.getMinutes() < 30) r.setMinutes(30, 0, 0);
  else { r.setMinutes(0, 0, 0); r.setHours(r.getHours() + 1); }
  return r;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SLOT_H      = 28;
const DAY_START   = 0;           // 0:00
const DAY_END     = 24 * 60;     // 24:00 (1440 min)
const GRID_H      = (DAY_END - DAY_START) / 30 * SLOT_H; // 1344 px
const HOURS       = Array.from({ length: 24 }, (_, i) => i); // 0..23
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

// ─── Per-event color helpers ──────────────────────────────────────────────────
// For pet-log events: use the stored `ev.color` directly (set from pet.color).
// For all other events: fall back to the CSS-variable-based category palette.
function evBg(ev: CalEvent): string {
  if (ev.isFromPetLog && ev.color) return ev.color + '22'; // ~13 % opacity tint
  return CAT_BG[evCat(ev)];
}
function evBorder(ev: CalEvent): string {
  if (ev.isFromPetLog && ev.color) return ev.color;
  return CAT_BORDER[evCat(ev)];
}
function evDeep(ev: CalEvent): string {
  if (ev.isFromPetLog && ev.color) return ev.color;
  return CAT_DEEP[evCat(ev)];
}

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
  onOpenPrepTask,
}: {
  groupId: string;
  currentUserId: string;
  onOpenPrepTask?: (eventId: string) => void;
}) {
  const [view, setView] = useState<ViewMode>(() => {
    try {
      const saved = typeof window !== 'undefined'
        ? localStorage.getItem('cal-view-mode')
        : null;
      if (saved === 'week' || saved === 'month' || saved === 'list') return saved;
    } catch { /* localStorage blocked (SSR / incognito) */ }
    return 'month';
  });
  const [focus,    setFocus]    = useState(() => new Date());
  const [events,   setEvents]   = useState<CalEvent[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selEv,    setSelEv]    = useState<CalEvent | null>(null);
  const [selPos,   setSelPos]   = useState({ x: 0, y: 0 });
  const [modalInitial, setModalInitial] = useState<ModalInitial | null>(null);
  const [dragId,   setDragId]   = useState<string | null>(null);
  const [dragOff,  setDragOff]  = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  // ── Listen for prep-task drag-to-calendar events ────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const { title, startAt, endAt } = (e as CustomEvent<{
        title: string; startAt: string; endAt: string;
      }>).detail;
      setModalInitial({
        title,
        startAt: new Date(startAt),
        endAt:   new Date(endAt),
      });
    };
    window.addEventListener('cal:openModal', handler);
    return () => window.removeEventListener('cal:openModal', handler);
  }, []);

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
  // Persist view mode to localStorage so it survives page reloads
  function changeView(v: ViewMode) {
    setView(v);
    try { localStorage.setItem('cal-view-mode', v); } catch { /* ignore */ }
  }

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
              onClick={() => changeView(v)}
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
        <button
          onClick={() => setModalInitial({})}
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--cal-personal-deep)' }}
        >
          <Plus className="h-3.5 w-3.5" />
          新增活動
        </button>
      </div>

      {/* ── Calendar body ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {view === 'week' && (
          <WeekView
            focus={focus}
            events={events}
            onEventClick={openDetail}
            onSlotClick={(start, end) => setModalInitial({ startAt: start, endAt: end })}
            onDragStart={(id, off) => { setDragId(id); setDragOff(off); }}
            onDrop={dropEv}
          />
        )}
        {view === 'month' && (
          <MonthView
            focus={focus}
            events={events}
            onEventClick={openDetail}
            onDayClick={d => { setFocus(d); changeView('week'); }}
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
          onPrepTask={ev => { setSelEv(null); onOpenPrepTask?.(ev.id); }}
          onEdit={ev => {
            setSelEv(null);
            setModalInitial({
              id:          ev.id,
              title:       ev.title,
              startAt:     parseISO(ev.startAt),
              endAt:       parseISO(ev.endAt),
              isAllDay:    ev.isAllDay,
              location:    ev.location    ?? undefined,
              description: ev.description ?? undefined,
              color:       ev.color       ?? undefined,
              notifyBefore: ev.notifyBefore,
              attendeeIds:  JSON.parse(ev.attendeeIds ?? '[]') as string[],
            });
          }}
        />
      )}

      {/* ── Event form modal ───────────────────────────────────────────────── */}
      {modalInitial !== null && (
        <EventFormModal
          groupId={groupId}
          initial={modalInitial}
          onClose={() => setModalInitial(null)}
          onSaved={() => { setModalInitial(null); load(); }}
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
  onSlotClick:  (start: Date, end: Date, x: number, y: number) => void;
  onDragStart:  (id: string, offsetMin: number) => void;
  onDrop:       (day: Date, slotIdx: number) => void;
}) {
  const ws   = startOfWeek(focus, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const now  = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowTop = (nowMin - DAY_START) / 30 * SLOT_H;
  const showNow = nowMin >= DAY_START && nowMin <= DAY_END;

  // ── Drag-to-create ────────────────────────────────────────────────────
  const [selOverlay, setSelOverlay] = useState<{
    dayIdx: number; minStart: number; minEnd: number;
  } | null>(null);

  // ── Drag-over previews (prep-task & pet) ──────────────────────────────
  // dataTransfer.getData() is blocked during dragover (browser security),
  // so label text is received via custom events dispatched on dragstart.
  const prepDragTitle = useRef('');
  const [prepDragPreview, setPrepDragPreview] = useState<{
    dayIdx: number; slotMin: number;
  } | null>(null);

  const petDragName = useRef('');
  const [petDragPreview, setPetDragPreview] = useState<{
    dayIdx: number; slotMin: number;
  } | null>(null);

  useEffect(() => {
    const onPrepStart = (e: Event) => {
      prepDragTitle.current = (e as CustomEvent<{ title: string }>).detail.title;
    };
    const onPetStart = (e: Event) => {
      petDragName.current = (e as CustomEvent<{ name: string }>).detail.name;
    };
    const onDragEnd = () => {
      setPrepDragPreview(null);
      setPetDragPreview(null);
    };
    window.addEventListener('cal:prepDragStart', onPrepStart);
    window.addEventListener('cal:petDragStart',  onPetStart);
    window.addEventListener('dragend', onDragEnd);
    return () => {
      window.removeEventListener('cal:prepDragStart', onPrepStart);
      window.removeEventListener('cal:petDragStart',  onPetStart);
      window.removeEventListener('dragend', onDragEnd);
    };
  }, []);

  // Mutable ref for drag state — avoids stale closures in global handlers
  const createDrag = useRef<{
    active:   boolean;
    dayIdx:   number;
    dayDate:  Date;
    startMin: number;
    colTop:   number;
  } | null>(null);

  // Keep latest onSlotClick in a ref so the effect closure never goes stale
  const cbRef = useRef(onSlotClick);
  useEffect(() => { cbRef.current = onSlotClick; });

  useEffect(() => {
    function snapMin(clientY: number, colTop: number) {
      const y = Math.max(0, clientY - colTop);
      return DAY_START + Math.floor(y / SLOT_H) * 30;
    }
    function onMove(e: MouseEvent) {
      const d = createDrag.current;
      if (!d?.active) return;
      const cur = snapMin(e.clientY, d.colTop);
      setSelOverlay({
        dayIdx:   d.dayIdx,
        minStart: Math.min(d.startMin, cur),
        minEnd:   Math.max(d.startMin, cur) + 30,
      });
    }
    function onUp(e: MouseEvent) {
      const d = createDrag.current;
      if (!d?.active) return;
      const cur      = snapMin(e.clientY, d.colTop);
      const minStart = Math.min(d.startMin, cur);
      const minEnd   = Math.max(d.startMin, cur) + 30;
      const startDate = new Date(d.dayDate);
      startDate.setHours(Math.floor(minStart / 60), minStart % 60, 0, 0);
      const endDate = new Date(d.dayDate);
      endDate.setHours(Math.floor(minEnd / 60), minEnd % 60, 0, 0);
      createDrag.current = null;
      setSelOverlay(null);
      cbRef.current(startDate, endDate, e.clientX, e.clientY);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, []); // empty — all live state is accessed via refs

  // Single scroll container: headers are sticky inside it,
  // so headers + grid always share the exact same available width.
  return (
    <div className="h-full overflow-y-auto scrollbar-thin">

      {/* ── Sticky header block (day labels + all-day row) ──────────────── */}
      <div
        className="sticky top-0 z-20 border-b"
        style={{ background: 'var(--cal-panel-bg)', borderColor: 'var(--cal-border)' }}
      >
        {/* Day-of-week + date numbers */}
        <div className="flex border-b" style={{ borderColor: 'var(--cal-border)' }}>
          <div className="w-12 flex-shrink-0" />
          {days.map((day, i) => {
            const isT = isToday(day);
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center py-1.5 border-l"
                style={{ borderColor: 'var(--cal-border)' }}
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
        <div className="flex" style={{ minHeight: 24 }}>
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
                      style={{ background: evBg(ev), color: evDeep(ev) }}
                    >
                      {ev.title}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Time grid (scrolls with the container) ──────────────────────── */}
      <div className="flex" style={{ height: GRID_H }}>
        {/* Time labels */}
        <div className="w-12 flex-shrink-0 relative">
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
              onDragOver={e => {
                e.preventDefault();
                const types   = e.dataTransfer.types;
                const rect    = e.currentTarget.getBoundingClientRect();
                const slotMin = DAY_START + Math.max(0, Math.floor((e.clientY - rect.top) / SLOT_H)) * 30;
                if (types.includes('application/prep-task')) {
                  setPrepDragPreview({ dayIdx: i, slotMin });
                } else if (types.includes('application/pet')) {
                  setPetDragPreview({ dayIdx: i, slotMin });
                }
              }}
              onDrop={e => {
                setPrepDragPreview(null);  // always clear previews on drop
                setPetDragPreview(null);

                const rect    = e.currentTarget.getBoundingClientRect();
                const slotMin = DAY_START + Math.max(0, Math.floor((e.clientY - rect.top) / SLOT_H)) * 30;
                const start   = new Date(day);
                start.setHours(Math.floor(slotMin / 60), slotMin % 60, 0, 0);
                const end = addMinutes(start, 60);

                // Pet drag from LeftPanel
                const petJson = e.dataTransfer.getData('application/pet');
                if (petJson) {
                  try {
                    const pet = JSON.parse(petJson) as { petId: string; petName: string; petType: string };
                    window.dispatchEvent(new CustomEvent('cal:openModal', {
                      detail: { title: pet.petName, startAt: start.toISOString(), endAt: end.toISOString() },
                    }));
                  } catch { /* ignore malformed data */ }
                  return;
                }

                // Prep-task drag from LeftPanel
                const prepJson = e.dataTransfer.getData('application/prep-task');
                if (prepJson) {
                  try {
                    const task = JSON.parse(prepJson) as { title: string; suggestedAt: string | null };
                    window.dispatchEvent(new CustomEvent('cal:openModal', {
                      detail: { title: task.title, startAt: start.toISOString(), endAt: end.toISOString() },
                    }));
                  } catch { /* ignore malformed data */ }
                  return;
                }

                // Regular event-move drag
                onDrop(day, Math.max(0, Math.floor((e.clientY - rect.top) / SLOT_H)));
              }}
              onMouseDown={e => {
                if ((e.target as HTMLElement).closest('[data-event]')) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const slotMin = DAY_START + Math.max(0, Math.floor((e.clientY - rect.top) / SLOT_H)) * 30;
                createDrag.current = { active: true, dayIdx: i, dayDate: day, startMin: slotMin, colTop: rect.top };
                setSelOverlay({ dayIdx: i, minStart: slotMin, minEnd: slotMin + 30 });
                e.preventDefault(); // prevent text-selection cursor during drag
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
                  className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
                  style={{ top: nowTop }}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0 -ml-1"
                    style={{ background: 'var(--cal-personal-accent)' }}
                  />
                  <div className="flex-1 h-px" style={{ background: 'var(--cal-personal-accent)' }} />
                </div>
              )}

              {/* Drag-to-create selection overlay */}
              {selOverlay?.dayIdx === i && (() => {
                const ovTop = (selOverlay.minStart - DAY_START) / 30 * SLOT_H;
                const ovH   = (selOverlay.minEnd - selOverlay.minStart) / 30 * SLOT_H;
                const fmtM  = (m: number) =>
                  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
                return (
                  <div
                    key="sel-overlay"
                    className="absolute left-0.5 right-0.5 z-20 rounded-md pointer-events-none select-none"
                    style={{
                      top:        ovTop,
                      height:     Math.max(ovH, SLOT_H),
                      background: 'rgba(112,58,96,0.18)',
                      border:     '1.5px solid var(--cal-personal-deep)',
                    }}
                  >
                    <div
                      className="text-[10px] font-semibold px-1.5 pt-0.5 leading-tight truncate"
                      style={{ color: 'var(--cal-personal-deep)' }}
                    >
                      {fmtM(selOverlay.minStart)} – {fmtM(selOverlay.minEnd)}
                    </div>
                  </div>
                );
              })()}

              {/* Prep-task drop preview ghost */}
              {prepDragPreview?.dayIdx === i && (() => {
                const fmtSlot = (m: number) =>
                  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
                const ghostTop = (prepDragPreview.slotMin - DAY_START) / 30 * SLOT_H;
                const ghostH   = SLOT_H * 2; // 1-hour block
                return (
                  <div
                    key="prep-preview"
                    className="absolute left-0.5 right-0.5 z-20 rounded-md pointer-events-none select-none overflow-hidden"
                    style={{
                      top:        ghostTop,
                      height:     ghostH,
                      background: 'rgba(112,58,96,0.13)',
                      border:     '2px dashed var(--cal-personal-deep)',
                    }}
                  >
                    {/* Shimmer bar at the top */}
                    <div
                      className="absolute inset-x-0 top-0 h-0.5"
                      style={{ background: 'var(--cal-personal-deep)', opacity: 0.6 }}
                    />
                    <div className="px-1.5 pt-1">
                      <div
                        className="text-[10px] font-semibold leading-tight truncate"
                        style={{ color: 'var(--cal-personal-deep)' }}
                      >
                        ✨ {prepDragTitle.current}
                      </div>
                      <div
                        className="text-[9px] leading-tight mt-0.5 opacity-75"
                        style={{ color: 'var(--cal-personal-deep)' }}
                      >
                        {fmtSlot(prepDragPreview.slotMin)} – {fmtSlot(prepDragPreview.slotMin + 60)}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Pet drop preview ghost */}
              {petDragPreview?.dayIdx === i && (() => {
                const fmtSlot  = (m: number) =>
                  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
                const ghostTop = (petDragPreview.slotMin - DAY_START) / 30 * SLOT_H;
                return (
                  <div
                    key="pet-preview"
                    className="absolute left-0.5 right-0.5 z-20 rounded-md pointer-events-none select-none overflow-hidden"
                    style={{
                      top:        ghostTop,
                      height:     SLOT_H * 2,
                      background: 'rgba(45,107,45,0.12)',
                      border:     '2px dashed var(--cal-pet-accent)',
                    }}
                  >
                    <div
                      className="absolute inset-x-0 top-0 h-0.5"
                      style={{ background: 'var(--cal-pet-accent)', opacity: 0.6 }}
                    />
                    <div className="px-1.5 pt-1">
                      <div
                        className="text-[10px] font-semibold leading-tight truncate"
                        style={{ color: '#2d6b2d' }}
                      >
                        🐾 {petDragName.current}
                      </div>
                      <div
                        className="text-[9px] leading-tight mt-0.5 opacity-75"
                        style={{ color: '#2d6b2d' }}
                      >
                        {fmtSlot(petDragPreview.slotMin)} – {fmtSlot(petDragPreview.slotMin + 60)}
                      </div>
                    </div>
                  </div>
                );
              })()}

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
                      background:      evBg(ev),
                      borderLeftColor: evBorder(ev),
                      color:           evDeep(ev),
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
                      style={{ background: evBg(ev), color: evDeep(ev) }}
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
                    style={{ background: evBg(ev), borderLeftColor: evBorder(ev) }}
                  >
                    <Clock className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: evDeep(ev) }} />
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-sm font-medium truncate"
                        style={{ color: evDeep(ev) }}
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
  ev, pos, wrapRef, currentUserId, onClose, onDelete, onEdit, onPrepTask,
}: {
  ev: CalEvent;
  pos: { x: number; y: number };
  wrapRef: React.RefObject<HTMLDivElement>;
  currentUserId: string;
  onClose: () => void;
  onDelete: (id: string) => void;
  onEdit: (ev: CalEvent) => void;
  onPrepTask: (ev: CalEvent) => void;
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
        background:   evBg(ev),
        borderColor:  evBorder(ev),
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 p-4 pb-2">
        <h3
          className="text-sm font-semibold leading-snug"
          style={{ color: evDeep(ev), fontFamily: "'Lora', serif" }}
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
      <div className="flex flex-wrap gap-1 px-3 pb-3">
        {!ev.isFromPetLog && (
          <button
            onClick={() => onPrepTask(ev)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-black/5"
            style={{ color: 'var(--cal-pet-accent)' }}
            title="AI 生成事前準備步驟"
          >
            ✨ 事前準備
          </button>
        )}
        {canDel && (
          <>
            <button
              onClick={() => onEdit(ev)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-black/5"
              style={{ color: 'var(--cal-personal-deep)' }}
            >
              <Pencil className="h-3 w-3" />
              編輯
            </button>
            <button
              onClick={() => onDelete(ev.id)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-red-100"
              style={{ color: '#dc2626' }}
            >
              <Trash2 className="h-3 w-3" />
              刪除
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Event Form Modal ─────────────────────────────────────────────────────────
function EventFormModal({
  groupId,
  initial,
  onClose,
  onSaved,
}: {
  groupId: string;
  initial: ModalInitial;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial.id;
  const now    = roundToHalf(new Date());

  // ── Form state ──────────────────────────────────────────────────────────────
  const [title,        setTitle]        = useState(initial.title ?? '');
  const [isAllDay,     setIsAllDay]      = useState(initial.isAllDay ?? false);
  const [startAtStr,   setStartAtStr]    = useState(
    initial.startAt ? toDatetimeLocal(initial.startAt) : toDatetimeLocal(now)
  );
  const [endAtStr,     setEndAtStr]      = useState(
    initial.endAt
      ? toDatetimeLocal(initial.endAt)
      : toDatetimeLocal(addMinutes(now, 60))
  );
  const [startDate,    setStartDate]     = useState(
    initial.startAt ? format(initial.startAt, 'yyyy-MM-dd') : format(now, 'yyyy-MM-dd')
  );
  const [location,     setLocation]      = useState(initial.location ?? '');
  const [description,  setDescription]   = useState(initial.description ?? '');
  const [color,        setColor]         = useState(initial.color ?? '#3a6070');
  const [notifyBefore, setNotifyBefore]  = useState(initial.notifyBefore ?? 15);
  const [attendees,    setAttendees]     = useState<Set<string>>(
    new Set(initial.attendeeIds ?? [])
  );
  const [endManual,    setEndManual]     = useState(!!initial.endAt);
  const [members,      setMembers]       = useState<CalGroupMember[]>([]);
  const [error,        setError]         = useState('');
  const [saving,       setSaving]        = useState(false);

  // ── Fetch group members ─────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/calendarease/groups')
      .then(r => r.ok ? r.json() : [])
      .then((groups: Array<{ id: string; members: CalGroupMember[] }>) => {
        const g = groups.find(g => g.id === groupId);
        setMembers(g?.members ?? []);
      });
  }, [groupId]);

  // ── Escape to close ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function handleStartChange(v: string) {
    setStartAtStr(v);
    if (!endManual && v) {
      const d = new Date(v);
      d.setHours(d.getHours() + 1);
      setEndAtStr(toDatetimeLocal(d));
    }
  }
  function toggleAttendee(userId: string) {
    setAttendees(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('請輸入活動名稱'); return; }

    let resolvedStart: string;
    let resolvedEnd: string;

    if (isAllDay) {
      if (!startDate) { setError('請選擇日期'); return; }
      resolvedStart = new Date(`${startDate}T00:00:00`).toISOString();
      resolvedEnd   = new Date(`${startDate}T23:59:59`).toISOString();
    } else {
      if (!startAtStr || !endAtStr) { setError('請選擇時間'); return; }
      if (new Date(endAtStr) <= new Date(startAtStr)) {
        setError('結束時間必須晚於開始時間'); return;
      }
      resolvedStart = new Date(startAtStr).toISOString();
      resolvedEnd   = new Date(endAtStr).toISOString();
    }

    setSaving(true); setError('');
    try {
      const shared = {
        title:       title.trim(),
        isAllDay,
        startAt:     resolvedStart,
        endAt:       resolvedEnd,
        location:    location.trim()    || null,
        description: description.trim() || null,
        color,
        notifyBefore,
        attendeeIds: JSON.stringify(Array.from(attendees)),
      };

      const url    = isEdit ? `/api/calendarease/events/${initial.id}` : '/api/calendarease/events';
      const method = isEdit ? 'PUT' : 'POST';
      const body   = isEdit ? shared : { ...shared, groupId };

      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setError(data.error ?? '儲存失敗'); return;
      }
      onSaved();
    } catch {
      setError('儲存失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ background: 'var(--cal-panel-bg)', maxHeight: '92vh' }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--cal-border)' }}
        >
          <h2
            className="text-base font-bold"
            style={{ color: 'var(--cal-text)', fontFamily: "'Lora', serif" }}
          >
            {isEdit ? '編輯活動' : '新增活動'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 transition-colors"
          >
            <X className="h-4 w-4" style={{ color: 'var(--cal-text2)' }} />
          </button>
        </div>

        {/* ── Scrollable form ─────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5 space-y-4">

            {/* Title — Outlook-style borderless large input */}
            <input
              autoFocus
              value={title}
              onChange={e => { setTitle(e.target.value); setError(''); }}
              placeholder="活動名稱"
              className="w-full bg-transparent border-b-2 pb-2 text-xl font-semibold outline-none
                         placeholder:font-normal placeholder:text-neutral-300"
              style={{ borderColor: 'var(--cal-personal-accent)', color: 'var(--cal-text)' }}
            />

            {/* All-day toggle */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={e => setIsAllDay(e.target.checked)}
                className="h-4 w-4 rounded"
                style={{ accentColor: 'var(--cal-personal-deep)' } as React.CSSProperties}
              />
              <span className="text-sm" style={{ color: 'var(--cal-text)' }}>全天活動</span>
            </label>

            {/* Time fields */}
            {isAllDay ? (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--cal-text2)' }}>日期</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: 'var(--cal-border)', background: 'white', color: 'var(--cal-text)' }}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--cal-text2)' }}>開始時間</label>
                  <input
                    type="datetime-local"
                    value={startAtStr}
                    onChange={e => handleStartChange(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                    style={{ borderColor: 'var(--cal-border)', background: 'white', color: 'var(--cal-text)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--cal-text2)' }}>結束時間</label>
                  <input
                    type="datetime-local"
                    value={endAtStr}
                    onChange={e => { setEndAtStr(e.target.value); setEndManual(true); }}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                    style={{ borderColor: 'var(--cal-border)', background: 'white', color: 'var(--cal-text)' }}
                  />
                </div>
              </div>
            )}

            {/* Attendees */}
            {members.length > 0 && (
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--cal-text2)' }}>邀請對象</label>
                <div className="space-y-1.5">
                  {members.map(m => {
                    const checked = attendees.has(m.userId);
                    const name    = m.user.name ?? m.user.email ?? '未知';
                    return (
                      <label key={m.userId} className="flex items-center gap-2.5 cursor-pointer">
                        {/* Custom checkbox */}
                        <div
                          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-all"
                          style={{
                            borderColor: checked ? 'var(--cal-personal-deep)' : 'var(--cal-border)',
                            background:  checked ? 'var(--cal-personal-deep)' : 'white',
                          }}
                        >
                          {checked && <Check className="h-3 w-3 text-white" strokeWidth={2.5} />}
                        </div>
                        <input type="checkbox" checked={checked} onChange={() => toggleAttendee(m.userId)} className="sr-only" />
                        {/* Avatar */}
                        <div
                          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{ background: 'var(--cal-personal-deep)' }}
                        >
                          {name[0].toUpperCase()}
                        </div>
                        <span className="text-sm" style={{ color: 'var(--cal-text)' }}>{name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Location */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--cal-text2)' }}>地點</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="（選填）"
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                style={{ borderColor: 'var(--cal-border)', background: 'white', color: 'var(--cal-text)' }}
              />
            </div>

            {/* Color / category */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--cal-text2)' }}>活動類別</label>
              <div className="grid grid-cols-2 gap-1.5">
                {PRESET_COLORS.map(c => {
                  const active = color === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition-all"
                      style={{
                        background:  active ? 'var(--cal-personal-card)' : 'var(--cal-bg2)',
                        border:      `1.5px solid ${active ? c.value : 'transparent'}`,
                        color:       active ? c.value : 'var(--cal-text2)',
                        fontWeight:  active ? 600 : 400,
                      }}
                    >
                      <span className="h-3.5 w-3.5 rounded-full flex-shrink-0" style={{ background: c.value }} />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--cal-text2)' }}>備註</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="（選填）"
                rows={3}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none resize-none"
                style={{ borderColor: 'var(--cal-border)', background: 'white', color: 'var(--cal-text)' }}
              />
            </div>

            {/* Notify */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--cal-text2)' }}>提前通知</label>
              <select
                value={String(notifyBefore)}
                onChange={e => setNotifyBefore(Number(e.target.value))}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                style={{ borderColor: 'var(--cal-border)', background: 'white', color: 'var(--cal-text)' }}
              >
                {NOTIFY_OPTIONS.map(o => (
                  <option key={o.value} value={String(o.value)}>{o.label}</option>
                ))}
              </select>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          {/* ── Footer ─────────────────────────────────────────────────────── */}
          <div
            className="flex gap-2 px-6 py-4 border-t flex-shrink-0"
            style={{ borderColor: 'var(--cal-border)' }}
          >
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 rounded-xl py-2 text-sm font-semibold text-white disabled:opacity-50 transition-colors"
              style={{ background: 'var(--cal-personal-deep)' }}
            >
              {saving ? '儲存中…' : isEdit ? '更新活動' : '新增活動'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 rounded-xl border text-sm py-2 hover:bg-black/5 transition-colors"
              style={{ borderColor: 'var(--cal-border)', color: 'var(--cal-text2)' }}
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
