'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import LeftPanel from '@/components/calendarease/LeftPanel';
import CalendarView from '@/components/calendarease/CalendarView';
import InviteMemberForm from '@/components/calendarease/InviteMemberForm';

interface Member {
  id: string;
  userId: string;
  role: 'OWNER' | 'MEMBER';
  user: { id: string; name: string | null; email: string | null };
}

export default function CalendarEaseShell({
  groupId,
  groupName,
  members,
  isOwner,
  currentUserId,
}: {
  groupId: string;
  groupName: string;
  members: Member[];
  isOwner: boolean;
  currentUserId: string;
}) {
  // Shared state: which event to show prep tasks for in LeftPanel
  const [prepEventId, setPrepEventId] = useState<string | null>(null);

  return (
    <div
      data-cal
      className="flex h-full overflow-hidden"
      style={{ background: 'var(--cal-bg)' }}
    >
      {/* ── Left panel ────────────────────────────────────────────────────── */}
      <LeftPanel
        groupId={groupId}
        currentUserId={currentUserId}
        prepEventId={prepEventId}
        onPrepTaskClose={() => setPrepEventId(null)}
      />

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Group header bar */}
        <div
          className="flex items-center gap-3 px-4 py-2.5 border-b flex-shrink-0"
          style={{ background: 'var(--cal-panel-bg)', borderColor: 'var(--cal-border)' }}
        >
          <Link
            href="/calendarease"
            className="p-1 rounded-lg hover:bg-black/5 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" style={{ color: 'var(--cal-text2)' }} />
          </Link>

          <div className="flex-1 min-w-0">
            <h1
              className="text-base font-semibold truncate"
              style={{ color: 'var(--cal-text)', fontFamily: "'Lora', serif" }}
            >
              {groupName}
            </h1>
          </div>

          {/* Member avatars */}
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" style={{ color: 'var(--cal-text3)' }} />
            <div className="flex -space-x-1.5">
              {members.slice(0, 5).map(m => (
                <div
                  key={m.id}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white border border-white"
                  style={{ background: 'var(--cal-personal-deep)' }}
                  title={m.user.name ?? m.user.email ?? '?'}
                >
                  {(m.user.name ?? m.user.email ?? '?')[0].toUpperCase()}
                </div>
              ))}
              {members.length > 5 && (
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold border border-white"
                  style={{ background: 'var(--cal-bg3)', color: 'var(--cal-text2)' }}
                >
                  +{members.length - 5}
                </div>
              )}
            </div>
          </div>

          {/* Invite (owner only) */}
          {isOwner && <InviteMemberForm groupId={groupId} />}
        </div>

        {/* Calendar */}
        <CalendarView
          groupId={groupId}
          currentUserId={currentUserId}
          onOpenPrepTask={setPrepEventId}
        />
      </div>
    </div>
  );
}
