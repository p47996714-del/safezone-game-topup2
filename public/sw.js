const CACHE='safezone-v6';
const ASSETS=['/','/app.html','/admin.html','/offline.html','/manifest.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS).catch(()=>{})).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;if(e.request.url.includes('/api/'))return;e.respondWith(fetch(e.request).then(r=>{const cl=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cl)).catch(()=>{});return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/offline.html'))));});
self.addEventListener('push',e=>{
  let d={title:'🔔 Safe Zone',body:'Notification အသစ်',url:'/app.html'};
  try{if(e.data)d=Object.assign(d,e.data.json());}catch(x){}
  e.waitUntil(self.registration.showNotification(d.title,{
    body:d.body,
    icon:'https://i.imgur.com/iRwIfqs.png',
    badge:'https://i.imgur.com/iRwIfqs.png',
    vibrate:[200,100,200],
    tag:'safezone-'+Date.now(),
    renotify:true,
    data:{url:d.url||'/app.html'},
    requireInteraction:false
  }));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=(e.notification.data&&e.notification.data.url)||'/app.html';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const c of list){if(c.url.includes(location.origin)&&'focus' in c){c.focus();if('navigate' in c)c.navigate(url);return;}}
    if(clients.openWindow)return clients.openWindow(url);
  }));
});
