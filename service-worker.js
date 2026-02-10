const CACHE_NAME = 'alfajr-v5.0';
const urlsToCache = [
  'index.html',
  'manifest.json',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'css/main.css',
  'css/theme.css',
  'css/responsive.css',
  'js/config.js',
  'js/customer.js',
  'js/database.js',
  'js/ui.js',
  'js/print.js',
  'js/theme.js',
  'js/main.js'
];

// نصب Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 در حال کش کردن فایل‌ها...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ نصب Service Worker کامل شد');
        return self.skipWaiting();
      })
  );
});

// فعال‌سازی Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log(`🗑️ حذف کش قدیمی: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker فعال شد');
      return self.clients.claim();
    })
  );
});

// مدیریت درخواست‌ها
self.addEventListener('fetch', event => {
  // برای درخواست‌های چاپ، از شبکه استفاده کن
  if (event.request.url.includes('print') || event.request.url.includes('blob:')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          });
      })
      .catch(() => {
        // اگر آفلاین بودیم و فایل مورد نظر در کش نبود
        if (event.request.url.includes('.html')) {
          return caches.match('/index.html');
        }
        
        return new Response('آفلاین هستید. لطفاً اتصال اینترنت را بررسی کنید.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain; charset=utf-8'
          })
        });
      })
  );
});

// همگام‌سازی پس‌زمینه
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

// همگام‌سازی داده‌ها
async function syncData() {
  console.log('🔄 همگام‌سازی داده‌ها...');
  // اینجا می‌توانید کد همگام‌سازی با سرور را اضافه کنید
}

// دریافت پیام‌ها
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
