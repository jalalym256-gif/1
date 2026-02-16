const CACHE_NAME = 'alfajr-v5.3';

const CORE_FILES = [
  'index.html',
  'manifest.json',
  'css/main.css',
  'css/theme.css',
  'css/responsive.css',
  'js/config.js',
  'js/customer.js',
  'js/database.js',
  'js/ui.js',
  'js/profile.js',
  'js/print.js',
  'js/theme.js',
  'js/main.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
];

const OPTIONAL_FILES = [
  'assets/icon-192.png',
  'assets/icon-512.png',
];

// ========== نصب ==========
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      console.log('📦 Service Worker در حال نصب...');

      // هر فایل جداگانه cache میشه — خطای یکی بقیه رو خراب نمیکنه
      for (const url of CORE_FILES) {
        try {
          await cache.add(url);
        } catch (e) {
          console.warn('cache خطا:', url, e.message);
        }
      }
      for (const url of OPTIONAL_FILES) {
        try {
          await cache.add(url);
        } catch (e) {
          console.warn('فایل اختیاری نبود:', url);
        }
      }

      console.log('✅ نصب Service Worker کامل شد');
      return self.skipWaiting();
    })
  );
});

// ========== فعال‌سازی ==========
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.map(name => {
        if (name !== CACHE_NAME) {
          console.log('🗑️ حذف cache قدیمی:', name);
          return caches.delete(name);
        }
      }))
    ).then(() => {
      console.log('✅ Service Worker فعال شد');
      return self.clients.claim();
    })
  );
});

// ========== fetch ==========
self.addEventListener('fetch', event => {
  if (event.request.url.startsWith('blob:') ||
      event.request.url.includes('print')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('index.html');
        }
      });
    })
  );
});

// ========== message ==========
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
