const CACHE_NAME = 'alfajr-v5.0';
const STATIC_CACHE = 'alfajr-static-v5';
const DYNAMIC_CACHE = 'alfajr-dynamic-v5';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/responsive.css',
  '/css/theme.css',
  '/js/app.js',
  '/js/db.js',
  '/js/customer.js',
  '/js/utils.js',
  '/js/id-generator.js',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

// Fetch event with offline-first strategy
self.addEventListener('fetch', event => {
  // Skip non-GET requests and chrome-extension requests
  if (event.request.method !== 'GET' || 
      event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // For API requests, try network first, then cache
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // For static assets, try cache first, then network
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(event.request)
            .then(fetchResponse => {
              // Check if we received a valid response
              if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
                return fetchResponse;
              }

              const responseToCache = fetchResponse.clone();
              caches.open(DYNAMIC_CACHE)
                .then(cache => cache.put(event.request, responseToCache));

              return fetchResponse;
            })
            .catch(error => {
              // Return offline page or fallback
              if (event.request.headers.get('accept').includes('text/html')) {
                return caches.match('/index.html');
              }
              throw error;
            });
        })
    );
  }
});

// Background sync for offline data
self.addEventListener('sync', event => {
  if (event.tag === 'sync-customers') {
    event.waitUntil(syncPendingCustomers());
  }
});

async function syncPendingCustomers() {
  // Implementation for syncing pending operations
  console.log('Syncing pending customers...');
}

// Periodic background sync
self.addEventListener('periodicsync', event => {
  if (event.tag === 'backup-sync') {
    event.waitUntil(performBackup());
  }
});

async function performBackup() {
  console.log('Performing periodic backup...');
}