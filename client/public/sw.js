const CACHE_NAME = 'flexaccess-v1';
const STATIC_CACHE_NAME = 'flexaccess-static-v1';
const DYNAMIC_CACHE_NAME = 'flexaccess-dynamic-v1';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/search',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
  '/api/pods',
  '/api/pods/search',
  '/api/pods/filter'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).catch((error) => {
      console.error('Service Worker: Failed to cache static assets', error);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - implement cache-first strategy for static assets, network-first for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests that aren't from our allowed origins
  if (url.origin !== location.origin && !url.href.includes('cdnjs.cloudflare.com') && !url.href.includes('fonts.googleapis.com')) {
    return;
  }

  // Handle API requests with network-first strategy
  if (API_CACHE_PATTERNS.some(pattern => url.pathname.startsWith(pattern))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try to get from cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline fallback for API requests
            return new Response(JSON.stringify([]), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // Handle static assets with cache-first strategy
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Return cached version if available
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise fetch from network
      return fetch(request).then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // If it's a navigation request and we're offline, return the main page
        if (request.mode === 'navigate') {
          return caches.match('/');
        }
        
        // For other requests, return a generic offline response
        return new Response('Offline', { 
          status: 503, 
          statusText: 'Service Unavailable' 
        });
      });
    })
  );
});

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync triggered');
    event.waitUntil(
      // Perform background sync operations here
      syncOfflineData()
    );
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New accessible pod available!',
    icon: 'https://cdn.jsdelivr.net/npm/@tabler/icons@2.44.0/icons/universal-access.svg',
    badge: 'https://cdn.jsdelivr.net/npm/@tabler/icons@2.44.0/icons/universal-access.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: 'https://cdn.jsdelivr.net/npm/@tabler/icons@2.44.0/icons/eye.svg'
      },
      {
        action: 'close',
        title: 'Dismiss',
        icon: 'https://cdn.jsdelivr.net/npm/@tabler/icons@2.44.0/icons/x.svg'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('FlexAccess', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    // Open the app to the search page
    event.waitUntil(
      clients.openWindow('/search')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Background sync helper function
async function syncOfflineData() {
  try {
    // Sync any offline data here
    // This could include user preferences, bookmarks, etc.
    console.log('Service Worker: Syncing offline data...');
    
    // Example: Sync user preferences
    const preferencesData = await getStoredPreferences();
    if (preferencesData) {
      await syncUserPreferences(preferencesData);
    }
    
    return Promise.resolve();
  } catch (error) {
    console.error('Service Worker: Failed to sync offline data', error);
    return Promise.reject(error);
  }
}

// Helper functions for offline data management
async function getStoredPreferences() {
  // This would retrieve preferences from IndexedDB or similar
  return null;
}

async function syncUserPreferences(preferences) {
  // This would sync preferences to the server
  return fetch('/api/user/preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preferences)
  });
}
