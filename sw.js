const CACHE_NAME='smv-astro-en-20260919-v27-fix';
const APP_SHELL=['./layout-sep19.css','./layout-v27.css','./assets/topics-v27.png','./layout-v26.css','./assets/social/facebook.svg','./assets/social/instagram.svg','./assets/social/youtube.svg','./assets/social/whatsapp.svg','./assets/social/phone.svg','./layout-v25.css','./premium-v24.css','./assets/topics-v24.png','./assets/service-icons-v24.png','./assets/footer-v24.png','./sitemap.html','./horoscope-theme-v23.css','./assets/smv-premium-desktop-v20.png','./section-colors-v18.css','./brand-login-v17.css','./assets/smv-brand-logo-v17.png','./terms.html','./privacy.html','./legal-pages-v16.css','./login-footer-v16.css','./controls-v15.css','./public-navigation.js?v=15','./dashboard-live.mjs?v=13','./bright-theme-v12.css','./refinements-v14.css','./assets/smv-veerayah-family-mobile-v14.webp','./index.html','./legacy.css?v=20260911c','./interface.css?v=20260911c','./interface.js?v=20260917-v13','./app.mjs?v=20260918-v17','./public-content.mjs?v=20260911c','./admin-workflows.mjs?v=20260911c','./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('smv-astro-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin)return;
 if(req.mode==='navigate'){
  event.respondWith(fetch(req,{cache:'no-cache'}).then(res=>{if(res.ok && (url.pathname.endsWith('/index.html')||url.pathname.endsWith('/'))){const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put('./index.html',copy));}return res;}).catch(()=>caches.match('./index.html')));return;
 }
 if(['image','style','script','font'].includes(req.destination)||url.pathname.endsWith('.webmanifest')){
  event.respondWith(fetch(req,{cache:'no-cache'}).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put(req,copy));}return res;}).catch(()=>caches.match(req)));
 }
});
