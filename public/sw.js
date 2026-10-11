// HouseSplits Service Worker for Android PWA Web Push Notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push notification received in background
self.addEventListener('push', (event) => {
  let data = {
    title: '🏠 HouseSplits Bill Reminder',
    body: 'You have an upcoming household bill due soon.',
    url: '/',
    billId: null,
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.billId ? `bill-${data.billId}` : 'housesplits-alert',
    renotify: true,
    data: {
      url: data.url || '/',
      billId: data.billId,
    },
    actions: [
      {
        action: 'open',
        title: 'Open App',
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// User taps on notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it
      for (const client of windowClients) {
        if ('focus' in client) {
          if (client.url.includes(targetUrl)) {
            return client.focus();
          }
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
