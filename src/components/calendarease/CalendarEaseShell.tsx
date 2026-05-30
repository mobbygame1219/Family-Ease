'use client';

import { useState } from 'react';
import LeftPanel from './LeftPanel';
import CalendarView from './CalendarView';

export default function CalendarEaseShell({
  groupId,
  currentUserId,
}: {
  groupId: string;
  currentUserId: string;
}) {
  const [prepEventId, setPrepEventId] = useState<string | null>(null);

  return (
    <div className="flex gap-4 min-h-0 flex-1">
      {/* Left panel: groups / pets / prep tasks */}
      <LeftPanel
        groupId={groupId}
        currentUserId={currentUserId}
        prepEventId={prepEventId}
        onPrepTaskClose={() => setPrepEventId(null)}
      />

      {/* Main calendar */}
      <div className="flex-1 min-w-0">
        <CalendarView
          groupId={groupId}
          currentUserId={currentUserId}
          onOpenPrepTask={(eventId) => setPrepEventId(eventId)}
        />
      </div>
    </div>
  );
}
