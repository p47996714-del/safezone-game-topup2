/* Service Worker KILLED - 2026-10-10T20:40:17.790Z */
// ============================================
// SAFE ZONE — SERVICE WORKER (DISABLED)
// Old cache အားလုံး ဖျက်ပြီး fetch အားလုံး Network ကနေ ယူ
// ============================================

self.addEventListener('install', function(e) {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  console.log('[SW] Activating — killing all caches...');
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.map(function(name) {
          console.log('[SW] Deleting cache:', name);
          return caches.delete(name);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  // Network-first — cache မသုံး
  e.respondWith(
    fetch(e.request).catch(function() {
      return new Response('Offline', { status: 503 });
    })
  );
});

// Message handler — client ကနေ skipWaiting ခေါ်ရင်
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
