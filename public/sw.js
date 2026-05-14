// CalendarEase Service Worker — browser push notifications

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Listen for messages from the app
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, delayMs, tag } = e.data;
    if (delayMs <= 0) {
      self.registration.showNotification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag,
      });
    } else {
      setTimeout(() => {
        self.registration.showNotification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag,
        });
      }, delayMs);
    }
  }
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) return clients[0].focus();
      return self.clients.openWindow('/calendarease');
    })
  );
});
