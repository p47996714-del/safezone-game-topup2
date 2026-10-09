self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
self.addEventListener('push', (e) => {
  let data = { title: 'Safe Zone', body: 'New notification' };
  try { if (e.data) data = e.data.json(); } catch(err) {}
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: 'https://i.imgur.com/iRwIfqs.png',
    badge: 'https://i.imgur.com/iRwIfqs.png',
    vibrate: [200, 100, 200],
    data: data.data || {}
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window'}).then((cl) => {
    for (const c of cl) { if (c.url.includes('/app.html') && 'focus' in c) return c.focus(); }
    if (clients.openWindow) return clients.openWindow('/app.html');
  }));
});
