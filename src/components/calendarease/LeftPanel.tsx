'use client';

import { useState, useEffect, useRef } from 'react';
import {
  CalendarHeart, PawPrint, ListChecks,
  Dog, Cat, Rabbit, Fish, Bird, Squirrel,
  ChevronRight, ChevronDown, UserPlus, Check, X, Trash2,
  GripVertical, Plus, Pencil,
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
  color:        string | null;
  quickActions: string | null;   // JSON: [{emoji, label}]
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

// Custom frog SVG — lucide-react 0.383 doesn't include a Frog icon yet

function FrogIcon({ className, strokeWidth = 1.75, style }: { className?: string; strokeWidth?: number; style?: React.CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* body */}
      <ellipse cx="12" cy="15" rx="5.5" ry="4.5" />
      {/* left eye dome */}
      <circle cx="8.5" cy="9.5" r="2.5" />
      {/* right eye dome */}
      <circle cx="15.5" cy="9.5" r="2.5" />
      {/* pupils */}
      <circle cx="8.5" cy="9.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="9.5" r="1" fill="currentColor" stroke="none" />
      {/* smile */}
      <path d="M9.5 17 Q12 19 14.5 17" />
      {/* front toes left */}
      <path d="M6.5 15.5 Q4.5 17 4 16" />
      <path d="M6.5 15.5 Q5 18 4.5 17.5" />
      {/* front toes right */}
      <path d="M17.5 15.5 Q19.5 17 20 16" />
      <path d="M17.5 15.5 Q19 18 19.5 17.5" />
    </svg>
  );
}

const PET_ICON: Record<string, LucideIcon> = {
  DOG:     Dog,
  CAT:     Cat,
  RABBIT:  Rabbit,
  FISH:    Fish,
  BIRD:    Bird,
  HAMSTER: Squirrel,
  FROG:    FrogIcon as unknown as LucideIcon,
};

const PET_TYPE_LABEL: Record<string, string> = {
  DOG:     '狗',
  CAT:     '貓',
  RABBIT:  '兔子',
  FISH:    '魚',
  BIRD:    '鳥',
  HAMSTER: '倉鼠',
  FROG:    '青蛙',
};

const PET_QUICK_ACTIONS = [
  { emoji: '🏥', label: '看診'  },
  { emoji: '✂️', label: '美容'  },
  { emoji: '💉', label: '疫苗'  },
  { emoji: '🛁', label: '洗澡'  },
  { emoji: '🐾', label: '活動'  },
];

const PET_PRESET_COLORS = [
  { label: '森林綠', value: '#3a7c3a' },
  { label: '海洋藍', value: '#1e6b8c' },
  { label: '深棕',   value: '#7c5c3a' },
  { label: '夕陽橙', value: '#c47030' },
  { label: '玫瑰紅', value: '#8c3a5c' },
  { label: '薰衣草', value: '#6b4da3' },
  { label: '碧藍',   value: '#1e8c7a' },
  { label: '珊瑚',   value: '#c44a3a' },
];

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
          <PetsTabContent
            groupId={groupId}
            pets={pets}
            onPetsChange={setPets}
          />
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

// ─── PetsTabContent ───────────────────────────────────────────────────────────
function PetsTabContent({
  groupId,
  pets,
  onPetsChange,
}: {
  groupId: string;
  pets: Pet[];
  onPetsChange: (pets: Pet[]) => void;
}) {
  // null = closed, 'new' = add mode, Pet = edit mode
  const [formTarget, setFormTarget] = useState<'new' | Pet | null>(null);

  function openAdd()          { setFormTarget('new'); }
  function openEdit(pet: Pet) { setFormTarget(pet); }
  function closeForm()        { setFormTarget(null); }

  function handleSaved(saved: Pet) {
    if (formTarget === 'new') {
      onPetsChange([...pets, saved]);
    } else {
      onPetsChange(pets.map(p => p.id === saved.id ? saved : p));
    }
    closeForm();
  }

  async function handleDelete(petId: string) {
    if (!confirm('確定要刪除此寵物及所有記錄？')) return;
    const r = await fetch(`/api/calendarease/pets/${petId}`, { method: 'DELETE' });
    if (r.ok) {
      onPetsChange(pets.filter(p => p.id !== petId));
      closeForm();
    }
  }

  return (
    <div className="p-3 space-y-2.5">
      {/* ── Add button ──────────────────────────────────────────────────── */}
      <button
        onClick={openAdd}
        className="w-full flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium transition-all hover:opacity-90 active:scale-[0.98]"
        style={{ background: 'rgba(45,107,45,0.10)', color: '#3a7c3a', border: '1.5px dashed rgba(45,107,45,0.35)' }}
      >
        <Plus className="h-3.5 w-3.5" />
        新增寵物
      </button>

      {pets.length === 0 ? (
        <div className="flex flex-col items-center py-6 gap-2" style={{ color: 'var(--cal-text3)' }}>
          <PawPrint className="h-7 w-7 opacity-30" strokeWidth={1.5} />
          <span className="text-xs">尚無寵物成員</span>
        </div>
      ) : (
        <>
          {pets.map(pet => {
            const PetIcon  = PET_ICON[pet.type] ?? PawPrint;
            const petColor = pet.color ?? '#3a7c3a';
            const chipActions: { emoji: string; label: string }[] = (() => {
              if (pet.quickActions) {
                try { return JSON.parse(pet.quickActions); } catch { /* ignore */ }
              }
              return PET_QUICK_ACTIONS;
            })();

            return (
              <div
                key={pet.id}
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData('application/pet', JSON.stringify({
                    petId:   pet.id,
                    petName: pet.name,
                    petType: pet.type,
                  }));
                  e.dataTransfer.effectAllowed = 'copy';
                  window.dispatchEvent(
                    new CustomEvent('cal:petDragStart', { detail: { name: pet.name } })
                  );
                }}
                className="group rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing transition-all hover:shadow-md"
                style={{
                  background: petColor + '15',
                  border:     `1.5px solid ${petColor}`,
                }}
              >
                {/* ── Header ─────────────────────────────────────────── */}
                <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                    style={{ background: petColor }}
                  >
                    <PetIcon className="h-5 w-5 text-white" strokeWidth={1.75} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate"
                      style={{ color: petColor, fontFamily: "'Lora', serif" }}>
                      {pet.name}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--cal-text3)' }}>
                      {PET_TYPE_LABEL[pet.type] ?? pet.type}
                      {pet._count.logs > 0 && ` · ${pet._count.logs} 筆記錄`}
                    </div>
                  </div>

                  {/* Edit button (on hover) + drag hint */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      draggable={false}
                      onClick={e => { e.stopPropagation(); openEdit(pet); }}
                      className="hidden group-hover:flex h-6 w-6 items-center justify-center rounded-lg transition-colors hover:bg-black/10"
                      title="編輯寵物"
                    >
                      <Pencil className="h-3 w-3" style={{ color: petColor }} />
                    </button>
                    <span title="拖曳至行事曆建立活動">
                      <GripVertical className="h-4 w-4 opacity-40" style={{ color: petColor }} />
                    </span>
                  </div>
                </div>

                {/* ── Divider ────────────────────────────────────────── */}
                <div className="mx-3 border-t" style={{ borderColor: petColor, opacity: 0.2 }} />

                {/* ── Quick action chips ─────────────────────────────── */}
                <div className="flex flex-wrap gap-1.5 px-3 py-2.5">
                  {chipActions.map((action, idx) => (
                    <button
                      key={idx}
                      draggable={false}
                      onClick={e => {
                        e.stopPropagation();
                        const start = new Date();
                        start.setDate(start.getDate() + 1);
                        start.setHours(10, 0, 0, 0);
                        const end = new Date(start);
                        end.setHours(11, 0, 0, 0);
                        window.dispatchEvent(new CustomEvent('cal:openModal', {
                          detail: {
                            title:   `${pet.name} ${action.label}`,
                            startAt: start.toISOString(),
                            endAt:   end.toISOString(),
                          },
                        }));
                      }}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition-all hover:brightness-95 active:scale-95"
                      style={{
                        background: petColor + '18',
                        color:      petColor,
                        border:     `1px solid ${petColor}30`,
                      }}
                    >
                      <span className="leading-none">{action.emoji}</span>
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="text-[10px] text-center py-0.5" style={{ color: 'var(--cal-text3)' }}>
            拖曳卡片至行事曆可快速建立活動
          </div>
        </>
      )}

      {/* ── Form modal ──────────────────────────────────────────────────── */}
      {formTarget !== null && (
        <PetFormModal
          groupId={groupId}
          pet={formTarget === 'new' ? null : formTarget}
          onClose={closeForm}
          onSaved={handleSaved}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

// ─── PetFormModal ─────────────────────────────────────────────────────────────
function PetFormModal({
  groupId,
  pet,
  onClose,
  onSaved,
  onDelete,
}: {
  groupId:  string;
  pet:      Pet | null;
  onClose:  () => void;
  onSaved:  (pet: Pet) => void;
  onDelete: (petId: string) => void;
}) {
  const isEdit = pet !== null;
  const defaultColor = PET_PRESET_COLORS[0].value;

  const [name,     setName]     = useState(pet?.name  ?? '');
  const [type,     setType]     = useState(pet?.type  ?? 'DOG');
  const [color,    setColor]    = useState(pet?.color ?? defaultColor);
  const [actions,  setActions]  = useState<{ emoji: string; label: string }[]>(() => {
    if (pet?.quickActions) {
      try { return JSON.parse(pet.quickActions); } catch { /* ignore */ }
    }
    return [...PET_QUICK_ACTIONS];
  });
  const [newEmoji, setNewEmoji] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  function addAction() {
    if (!newLabel.trim()) return;
    setActions(prev => [...prev, { emoji: newEmoji.trim() || '🐾', label: newLabel.trim() }]);
    setNewEmoji(''); setNewLabel('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('請輸入寵物名稱'); return; }
    setSaving(true); setError('');
    try {
      const body = {
        name:        name.trim(),
        type,
        color,
        quickActions: JSON.stringify(actions),
        ...(isEdit ? {} : { groupId }),
      };
      const url    = isEdit ? `/api/calendarease/pets/${pet.id}` : '/api/calendarease/pets';
      const method = isEdit ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.error ?? '儲存失敗'); return;
      }
      onSaved(await r.json());
    } catch {
      setError('儲存失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        data-cal
        className="relative w-full max-w-sm rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ background: 'var(--cal-panel-bg)', maxHeight: '90vh' }}
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--cal-border)' }}
        >
          <h2 className="text-sm font-bold"
            style={{ color: 'var(--cal-text)', fontFamily: "'Lora', serif" }}>
            {isEdit ? '編輯寵物' : '新增寵物'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/5 transition-colors">
            <X className="h-4 w-4" style={{ color: 'var(--cal-text2)' }} />
          </button>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-4 space-y-5">

            {/* 種類 & 圖示 */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--cal-text2)' }}>
                種類 & 圖示
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.entries(PET_ICON) as [string, LucideIcon][]).map(([key, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setType(key)}
                    className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs transition-all"
                    style={{
                      background: type === key ? color + '22' : 'var(--cal-bg2)',
                      border:     `1.5px solid ${type === key ? color : 'transparent'}`,
                      color:      type === key ? color : 'var(--cal-text2)',
                      fontWeight: type === key ? 600 : 400,
                    }}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.75} />
                    {PET_TYPE_LABEL[key]}
                  </button>
                ))}
              </div>
            </div>

            {/* 名稱 */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--cal-text2)' }}>
                名稱
              </label>
              <input
                autoFocus={!isEdit}
                value={name}
                onChange={e => { setName(e.target.value); setError(''); }}
                placeholder="寵物名字"
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                style={{ borderColor: 'var(--cal-border)', background: 'white', color: 'var(--cal-text)' }}
              />
            </div>

            {/* 代表色 */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--cal-text2)' }}>
                代表色（行事曆記錄同步顯示）
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {PET_PRESET_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-[10px] transition-all"
                    style={{
                      background: color === c.value ? c.value + '22' : 'var(--cal-bg2)',
                      border:     `1.5px solid ${color === c.value ? c.value : 'transparent'}`,
                      color:      color === c.value ? c.value : 'var(--cal-text3)',
                      fontWeight: color === c.value ? 600 : 400,
                    }}
                  >
                    <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: c.value }} />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 快速活動 Chip */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--cal-text2)' }}>
                快速活動 Chip
              </label>

              <div className="space-y-1.5 mb-2">
                {actions.map((a, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-xl px-3 py-1.5"
                    style={{ background: 'var(--cal-bg2)' }}
                  >
                    <span className="text-base leading-none w-5 text-center">{a.emoji}</span>
                    <span className="flex-1 text-xs" style={{ color: 'var(--cal-text)' }}>{a.label}</span>
                    <button
                      type="button"
                      onClick={() => setActions(prev => prev.filter((_, i) => i !== idx))}
                      className="p-0.5 rounded hover:bg-red-100 transition-colors"
                    >
                      <X className="h-3 w-3" style={{ color: '#dc2626' }} />
                    </button>
                  </div>
                ))}
              </div>

              {actions.length < 8 && (
                <div className="flex items-center gap-2">
                  <input
                    value={newEmoji}
                    onChange={e => setNewEmoji(e.target.value)}
                    placeholder="😺"
                    maxLength={4}
                    className="w-12 rounded-lg border px-2 py-1.5 text-center text-sm outline-none"
                    style={{ borderColor: 'var(--cal-border)', background: 'white' }}
                  />
                  <input
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    placeholder="活動名稱"
                    className="flex-1 rounded-lg border px-2 py-1.5 text-xs outline-none"
                    style={{ borderColor: 'var(--cal-border)', background: 'white', color: 'var(--cal-text)' }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAction(); } }}
                  />
                  <button
                    type="button"
                    onClick={addAction}
                    disabled={!newLabel.trim()}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-white disabled:opacity-40 flex-shrink-0 transition-colors"
                    style={{ background: color }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          {/* ── Footer ───────────────────────────────────────────────────── */}
          <div
            className="flex gap-2 px-5 py-4 border-t flex-shrink-0"
            style={{ borderColor: 'var(--cal-border)' }}
          >
            {/* Delete (edit mode only) */}
            {isEdit && (
              <button
                type="button"
                onClick={() => onDelete(pet.id)}
                className="px-3 rounded-xl border text-xs py-2 hover:bg-red-50 transition-colors"
                style={{ borderColor: '#fecaca', color: '#dc2626' }}
              >
                刪除
              </button>
            )}

            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 rounded-xl py-2 text-sm font-semibold text-white disabled:opacity-50 transition-colors"
              style={{ background: color }}
            >
              {saving ? '儲存中…' : isEdit ? '更新寵物' : '新增寵物'}
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
