// DRO Service Worker - Offline Support and Caching
const CACHE_NAME = 'dro-v1.0.0';
const STATIC_CACHE = 'dro-static-v1.0.0';
const DYNAMIC_CACHE = 'dro-dynamic-v1.0.0';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg',
  // Core JS and CSS will be added dynamically during build
];

// Assets that should be cached when requested
const CACHE_PATTERNS = [
  /\.(?:js|css|woff2?|png|jpg|jpeg|svg|ico)$/,
  /^https:\/\/fonts\./,
  /^https:\/\/cdn\./
];

// Assets that should never be cached
const NO_CACHE_PATTERNS = [
  /\/api\//,
  /\/admin\//,
  /\/__/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('DRO SW: Installing service worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('DRO SW: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('DRO SW: Static assets cached successfully');
        // Force activation of new service worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('DRO SW: Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('DRO SW: Activating service worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('DRO SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('DRO SW: Service worker activated successfully');
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip requests that shouldn't be cached
  if (NO_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return;
  }
  
  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/')
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(request);
        })
        .catch(() => {
          // Return offline page if available
          return caches.match('/');
        })
    );
    return;
  }
  
  // Handle static assets
  if (CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            console.log('DRO SW: Serving from cache:', request.url);
            return response;
          }
          
          // Not in cache, fetch from network and cache
          return fetch(request)
            .then((response) => {
              // Only cache successful responses
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Clone response before caching
              const responseToCache = response.clone();
              
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  console.log('DRO SW: Caching new asset:', request.url);
                  cache.put(request, responseToCache);
                });
              
              return response;
            })
            .catch((error) => {
              console.error('DRO SW: Fetch failed:', error);
              // Try to serve from cache as fallback
              return caches.match(request);
            });
        })
    );
  }
});

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      console.log('DRO SW: Received skip waiting message');
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
      
    case 'CLEAR_CACHE':
      console.log('DRO SW: Clearing all caches');
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => caches.delete(cacheName))
          );
        })
        .then(() => {
          event.ports[0].postMessage({ success: true });
        })
        .catch((error) => {
          event.ports[0].postMessage({ success: false, error: error.message });
        });
      break;
      
    default:
      console.log('DRO SW: Unknown message type:', type);
  }
});

// Background sync for future enhancements
self.addEventListener('sync', (event) => {
  console.log('DRO SW: Background sync triggered:', event.tag);
  
  if (event.tag === 'dro-sync') {
    event.waitUntil(
      // Future: sync user scripts, settings, etc.
      Promise.resolve()
    );
  }
});

// Push notifications for future enhancements
self.addEventListener('push', (event) => {
  console.log('DRO SW: Push notification received');
  
  const options = {
    body: 'DRO has been updated with new features!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('DRO Update', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('DRO SW: Notification clicked');
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
}); 