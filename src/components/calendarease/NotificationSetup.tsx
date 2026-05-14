'use client';

import { useEffect } from 'react';

interface CalendarEvent {
  id: string;
  title: string;
  startAt: string;
  notifyBefore: number;
}

interface Props {
  events: CalendarEvent[];
}

export default function NotificationSetup({ events }: Props) {
  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

    // Register SW
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Request permission
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
      if (Notification.permission !== 'granted') return;

      // Schedule a notification for each upcoming event
      const now = Date.now();
      events.forEach((ev) => {
        const fireAt = new Date(ev.startAt).getTime() - ev.notifyBefore * 60 * 1000;
        const delayMs = fireAt - now;
        // Only schedule if it's in the future (up to 24 h ahead)
        if (delayMs > 0 && delayMs < 24 * 60 * 60 * 1000) {
          reg.active?.postMessage({
            type: 'SCHEDULE_NOTIFICATION',
            title: `📅 ${ev.title}`,
            body: `${ev.notifyBefore} 分鐘後開始`,
            delayMs,
            tag: `event-${ev.id}`,
          });
        }
      });
    });
  }, [events]);

  return null;
}
