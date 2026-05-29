'use client';

import { useState, useEffect, useRef } from 'react';
import {
  CalendarHeart, PawPrint, ListChecks,
  Dog, Cat, Rabbit, Fish, Bird, Squirrel,
  ChevronRight, ChevronDown, UserPlus, Check, X, Trash2,
  type LucideIcon,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────
interface GroupMember {
  id: string;
  role: 'OWNER' | 'MEMBER';
  userId: string;
  user: { id: string; name: string | null; email: string | null };
}

interface CalGroup {
  id: string;
  name: string;
  members: GroupMember[];
  _count: { events: number; pets: number };
}

interface Pet {
  id: string;
  name: string;
  type: string;
  _count: { logs: number };
}

interface PrepTask {
  id: string;
  title: string;
  notes: string | null;
  isDone: boolean;
  suggestedAt: string | null;
  order: number;
  eventId: string;
}

const PET_ICON: Record<string, LucideIcon> = {
  DOG:     Dog,
  CAT:     Cat,
  RABBIT:  Rabbit,
  FISH:    Fish,
  BIRD:    Bird,
  HAMSTER: Squirrel,
};

type Tab = 'groups' | 'pets' | 'tasks';

// ─── LeftPanel ────────────────────────────────────────────────────────────────
export default function LeftPanel({
  groupId,
  currentUserId,
  prepEventId,
  onPrepTaskClose,
}: {
  groupId: string;
  currentUserId: string;
  prepEventId: string | null;
  onPrepTaskClose: () => void;
}) {
  const [tab,     setTab]     = useState<Tab>('groups');
  const [groups,  setGroups]  = useState<CalGroup[]>([]);
  const [pets,    setPets]    = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/calendarease/groups').then(r => r.ok ? r.json() : []),
      fetch(`/api/calendarease/pets?groupId=${groupId}`).then(r => r.ok ? r.json() : []),
    ]).then(([gs, ps]) => {
      setGroups(gs);
      setPets(ps);
      setLoading(false);
    });
  }, [groupId]);

  // Auto-switch to tasks tab when prepEventId is set
  useEffect(() => {
    if (prepEventId) setTab('tasks');
  }, [prepEventId]);

  const refreshGroups = () => {
    fetch('/api/calendarease/groups')
      .then(r => r.ok ? r.json() : [])
      .then(setGroups);
  };

  return (
    <aside
      className="hidden lg:flex flex-col w-64 flex-shrink-0 border-r overflow-hidden"
      style={{ background: 'var(--cal-panel-bg)', borderColor: 'var(--cal-border)' }}
    >
      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex border-b flex-shrink-0" style={{ borderColor: 'var(--cal-border)' }}>
        {(['groups', 'pets', 'tasks'] as Tab[]).map(t => (
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
            {{ groups: '家庭', pets: '寵物', tasks: '任務' }[t]}
          </button>
        ))}
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">

        {/* Groups tab */}
        {tab === 'groups' && (
          <>
            {loading ? (
              <div className="p-3 space-y-2">
                {[1, 2].map(i => (
                  <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'var(--cal-bg2)' }} />
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2" style={{ color: 'var(--cal-text3)' }}>
                <CalendarHeart className="h-8 w-8 opacity-30" strokeWidth={1.5} />
                <span className="text-xs">尚無行事曆群組</span>
              </div>
            ) : (
              <div className="py-2">
                {groups.map(group => (
                  <GroupItem
                    key={group.id}
                    group={group}
                    currentUserId={currentUserId}
                    isCurrentGroup={group.id === groupId}
                    onInvited={refreshGroups}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Pets tab */}
        {tab === 'pets' && (
          <div className="p-3 space-y-2">
            {pets.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2" style={{ color: 'var(--cal-text3)' }}>
                <PawPrint className="h-8 w-8 opacity-30" strokeWidth={1.5} />
                <span className="text-xs">尚無寵物成員</span>
              </div>
            ) : pets.map(pet => {
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
            })}
          </div>
        )}

        {/* Tasks tab */}
        {tab === 'tasks' && (
          <PrepTaskPanel
            prepEventId={prepEventId}
            onClose={onPrepTaskClose}
          />
        )}
      </div>
    </aside>
  );
}

// ─── PrepTaskPanel ────────────────────────────────────────────────────────────
function PrepTaskPanel({
  prepEventId,
  onClose,
}: {
  prepEventId: string | null;
  onClose: () => void;
}) {
  const [tasks,      setTasks]      = useState<PrepTask[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error,      setError]      = useState('');
  // Track the eventId for which we've generated, to avoid re-generating
  const generatedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!prepEventId) {
      setTasks([]);
      setError('');
      generatedFor.current = null;
      return;
    }

    // Already generated for this event
    if (generatedFor.current === prepEventId) return;
    generatedFor.current = prepEventId;

    // 1. Check if tasks already exist for this event
    setGenerating(true);
    setError('');
    setTasks([]);

    fetch(`/api/calendarease/prep-tasks?eventId=${prepEventId}`)
      .then(r => r.ok ? r.json() : [])
      .then(async (existing: PrepTask[]) => {
        if (existing.length > 0) {
          setTasks(existing);
          setGenerating(false);
          return;
        }
        // 2. No existing tasks → call AI generate
        const res = await fetch('/api/calendarease/prep-tasks/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId: prepEventId }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setError(d.error ?? 'AI 生成失敗');
        } else {
          setTasks(await res.json());
        }
        setGenerating(false);
      })
      .catch(() => {
        setError('載入失敗，請重試');
        setGenerating(false);
      });
  }, [prepEventId]);

  // Toggle isDone
  async function toggleDone(task: PrepTask) {
    const optimistic = tasks.map(t => t.id === task.id ? { ...t, isDone: !t.isDone } : t);
    setTasks(optimistic);
    const r = await fetch(`/api/calendarease/prep-tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDone: !task.isDone }),
    });
    if (!r.ok) setTasks(tasks); // revert on error
  }

  // Delete task
  async function deleteTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id));
    const r = await fetch(`/api/calendarease/prep-tasks/${id}`, { method: 'DELETE' });
    if (!r.ok) {
      // revert — reload
      fetch(`/api/calendarease/prep-tasks?eventId=${prepEventId}`)
        .then(r2 => r2.ok ? r2.json() : [])
        .then(setTasks);
    }
  }

  if (!prepEventId) {
    return (
      <div className="flex flex-col items-center py-10 gap-2 px-4 text-center" style={{ color: 'var(--cal-text3)' }}>
        <ListChecks className="h-8 w-8 opacity-30" strokeWidth={1.5} />
        <span className="text-xs">點擊活動的「✨ 事前準備」來生成準備步驟</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with close */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0"
        style={{ borderColor: 'var(--cal-border)' }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-sm">✨</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--cal-text)' }}>事前準備</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-black/5 transition-colors"
          title="關閉任務面板"
        >
          <X className="h-3.5 w-3.5" style={{ color: 'var(--cal-text3)' }} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-3 space-y-2">
        {generating ? (
          <div className="flex flex-col items-center py-8 gap-3" style={{ color: 'var(--cal-text3)' }}>
            <div
              className="h-6 w-6 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--cal-personal-accent)', borderTopColor: 'transparent' }}
            />
            <span className="text-xs text-center">AI 正在生成準備步驟…</span>
          </div>
        ) : error ? (
          <div className="rounded-xl p-3 text-center text-xs text-red-500"
            style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            {error}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-2" style={{ color: 'var(--cal-text3)' }}>
            <ListChecks className="h-6 w-6 opacity-30" strokeWidth={1.5} />
            <span className="text-xs">尚無準備步驟</span>
          </div>
        ) : (
          tasks.map(task => (
            <PrepTaskCard
              key={task.id}
              task={task}
              onToggle={() => toggleDone(task)}
              onDelete={() => deleteTask(task.id)}
            />
          ))
        )}

        {/* Completion summary */}
        {tasks.length > 0 && !generating && (
          <div
            className="text-[10px] text-center pt-1"
            style={{ color: 'var(--cal-text3)' }}
          >
            {tasks.filter(t => t.isDone).length} / {tasks.length} 已完成
            　·　拖曳任務卡到行事曆可建立活動
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PrepTaskCard ─────────────────────────────────────────────────────────────
function PrepTaskCard({
  task,
  onToggle,
  onDelete,
}: {
  task: PrepTask;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('application/prep-task', JSON.stringify({
          title:       task.title,
          suggestedAt: task.suggestedAt,
        }));
        e.dataTransfer.effectAllowed = 'copy';
        // Broadcast title so CalendarView can show a drag-over preview
        // (dataTransfer.getData is unavailable during dragover for security reasons)
        window.dispatchEvent(
          new CustomEvent('cal:prepDragStart', { detail: { title: task.title } })
        );
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group flex items-start gap-2.5 rounded-xl p-2.5 cursor-grab active:cursor-grabbing transition-all"
      style={{
        background:  task.isDone ? 'var(--cal-bg2)' : 'var(--cal-personal-card)',
        border:      `1.5px solid ${task.isDone ? 'var(--cal-border)' : 'var(--cal-personal-accent)'}`,
        opacity:     task.isDone ? 0.65 : 1,
      }}
    >
      {/* Checkbox */}
      <button
        onClick={e => { e.stopPropagation(); onToggle(); }}
        className="flex-shrink-0 mt-0.5"
      >
        <div
          className="flex h-4 w-4 items-center justify-center rounded border-2 transition-all"
          style={{
            borderColor: task.isDone ? 'var(--cal-personal-deep)' : 'var(--cal-personal-accent)',
            background:  task.isDone ? 'var(--cal-personal-deep)' : 'white',
          }}
        >
          {task.isDone && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
        </div>
      </button>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div
          className="text-xs font-medium leading-snug"
          style={{
            color:          'var(--cal-text)',
            textDecoration: task.isDone ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </div>
        {task.notes && (
          <div className="text-[10px] mt-0.5 opacity-70 leading-tight" style={{ color: 'var(--cal-text2)' }}>
            {task.notes}
          </div>
        )}
        {task.suggestedAt && (
          <div
            className="text-[10px] mt-1 font-medium"
            style={{ color: 'var(--cal-personal-deep)' }}
          >
            建議：{format(parseISO(task.suggestedAt), 'M/d 前完成')}
          </div>
        )}
      </div>

      {/* Delete (show on hover) */}
      {hovered && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="flex-shrink-0 p-0.5 rounded hover:bg-red-100 transition-colors"
          title="刪除此步驟"
        >
          <Trash2 className="h-3 w-3" style={{ color: '#dc2626' }} />
        </button>
      )}
    </div>
  );
}

// ─── GroupItem ────────────────────────────────────────────────────────────────
function GroupItem({
  group,
  currentUserId,
  isCurrentGroup,
  onInvited,
}: {
  group: CalGroup;
  currentUserId: string;
  isCurrentGroup: boolean;
  onInvited: () => void;
}) {
  const [expanded,    setExpanded]    = useState(isCurrentGroup);
  const [inviteOpen,  setInviteOpen]  = useState(false);
  const [email,       setEmail]       = useState('');
  const [inviting,    setInviting]    = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteOk,    setInviteOk]    = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const myMembership = group.members.find(m => m.userId === currentUserId);
  const isOwner      = myMembership?.role === 'OWNER';

  function openInvite() {
    setInviteOpen(true); setEmail(''); setInviteError(''); setInviteOk('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true); setInviteError(''); setInviteOk('');
    try {
      const res = await fetch(`/api/calendarease/groups/${group.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error ?? '邀請失敗');
      } else {
        setInviteOk(`已邀請 ${email.trim()}`);
        setEmail('');
        onInvited();
        setTimeout(() => { setInviteOpen(false); setInviteOk(''); }, 2000);
      }
    } catch {
      setInviteError('網路錯誤，請重試');
    } finally {
      setInviting(false);
    }
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-black/5"
        style={{
          background: isCurrentGroup && !expanded ? 'var(--cal-personal-card)' : 'transparent',
        }}
      >
        {expanded
          ? <ChevronDown  className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--cal-text3)' }} />
          : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--cal-text3)' }} />
        }
        <span
          className="flex-1 text-xs font-semibold truncate"
          style={{ color: isCurrentGroup ? 'var(--cal-personal-deep)' : 'var(--cal-text)' }}
        >
          {group.name}
        </span>
        <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--cal-text3)' }}>
          {group.members.length} 人
        </span>
      </button>

      {expanded && (
        <div
          className="mx-2 mb-1 rounded-xl overflow-hidden border"
          style={{ background: 'var(--cal-bg2)', borderColor: 'var(--cal-border)' }}
        >
          <div className="px-3 py-2 space-y-1.5">
            {group.members.map(m => (
              <div key={m.id} className="flex items-center gap-2">
                <div
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white flex-shrink-0"
                  style={{ background: 'var(--cal-personal-deep)' }}
                >
                  {(m.user.name ?? m.user.email ?? '?')[0].toUpperCase()}
                </div>
                <span className="text-[11px] flex-1 truncate" style={{ color: 'var(--cal-text)' }}>
                  {m.user.name ?? m.user.email ?? '未知'}
                </span>
                {m.role === 'OWNER' && (
                  <span
                    className="text-[9px] px-1 rounded"
                    style={{ background: 'var(--cal-personal-card)', color: 'var(--cal-personal-deep)' }}
                  >
                    管理員
                  </span>
                )}
              </div>
            ))}
          </div>

          {isOwner && (
            <div className="border-t px-3 py-2" style={{ borderColor: 'var(--cal-border)' }}>
              {!inviteOpen ? (
                <button
                  onClick={openInvite}
                  className="flex items-center gap-1.5 text-[11px] font-medium transition-colors hover:opacity-80"
                  style={{ color: 'var(--cal-personal-deep)' }}
                >
                  <UserPlus className="h-3 w-3" />
                  邀請成員
                </button>
              ) : (
                <form onSubmit={handleInvite} className="space-y-1.5">
                  <div className="flex items-center gap-1">
                    <input
                      ref={inputRef}
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setInviteError(''); }}
                      placeholder="輸入 Email"
                      className="flex-1 min-w-0 rounded-lg border px-2 py-1 text-[11px] outline-none"
                      style={{
                        borderColor: inviteError ? '#ef4444' : 'var(--cal-border)',
                        background:  'white',
                        color:       'var(--cal-text)',
                      }}
                      onKeyDown={e => e.key === 'Escape' && setInviteOpen(false)}
                      disabled={inviting}
                    />
                    <button
                      type="submit"
                      disabled={inviting || !email.trim()}
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-white flex-shrink-0 disabled:opacity-50 transition-colors"
                      style={{ background: 'var(--cal-personal-deep)' }}
                    >
                      {inviting ? (
                        <span className="inline-block h-2 w-2 rounded-full border border-white border-t-transparent animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setInviteOpen(false)}
                      className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-black/10 flex-shrink-0 transition-colors"
                    >
                      <X className="h-3 w-3" style={{ color: 'var(--cal-text2)' }} />
                    </button>
                  </div>
                  {inviteError && <p className="text-[10px] text-red-500 pl-0.5">{inviteError}</p>}
                  {inviteOk    && <p className="text-[10px] pl-0.5" style={{ color: 'var(--cal-pet-accent)' }}>✓ {inviteOk}</p>}
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
