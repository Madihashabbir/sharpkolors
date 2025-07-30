const CACHE_NAME = 'sharp-kolors-v1';
const CACHE_VERSION = Date.now(); // Always update cache with timestamp
const urlsToCache = [
    '/',
    '/index.html',
    '/portfolio.html',
    '/manifest.json',
    // Add your CSS files
    
    '/portfolio.css',
    // Add your JS files if any
    
    // Add important images (optional)
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// Install Service Worker
self.addEventListener('install', (event) => {
    console.log('Service Worker: Install');
    event.waitUntil(
        caches.open(CACHE_NAME + '-' + CACHE_VERSION)
            .then((cache) => {
                console.log('Service Worker: Caching App Shell');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                // Skip waiting to activate new service worker immediately
                return self.skipWaiting();
            })
    );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activate');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Delete old caches
                    if (cacheName.startsWith('sharp-kolors-v') && cacheName !== CACHE_NAME + '-' + CACHE_VERSION) {
                        console.log('Service Worker: Clearing Old Cache');
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Claim all clients immediately
            return self.clients.claim();
        })
    );
});

// Fetch Strategy: Network First (Always try to get fresh content)
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;
    
    // Skip external requests
    if (!event.request.url.startsWith(self.location.origin)) return;
    
    // Skip chrome-extension requests
    if (event.request.url.startsWith('chrome-extension://')) return;
    
    event.respondWith(
        // Always try network first for fresh content
        fetch(event.request)
            .then((response) => {
                // If we got a response, clone it and store in cache
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME + '-' + CACHE_VERSION)
                        .then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                }
                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(event.request)
                    .then((response) => {
                        if (response) {
                            return response;
                        }
                        // If not in cache either, return offline page for HTML requests
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return new Response(
                                `
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <title>Sharp Kolors - Offline</title>
                                    <style>
                                        body { 
                                            font-family: Arial, sans-serif; 
                                            text-align: center; 
                                            padding: 50px; 
                                            background: linear-gradient(135deg, #0a0a0a, #00d4ff, #d4af37);
                                            color: white;
                                            min-height: 100vh;
                                            margin: 0;
                                            display: flex;
                                            flex-direction: column;
                                            justify-content: center;
                                        }
                                        h1 { font-size: 2.5rem; margin-bottom: 1rem; }
                                        p { font-size: 1.2rem; margin-bottom: 2rem; }
                                        .retry-btn { 
                                            background: #00d4ff; 
                                            color: white; 
                                            border: none; 
                                            padding: 1rem 2rem; 
                                            border-radius: 25px; 
                                            cursor: pointer; 
                                            font-size: 1rem;
                                            font-weight: 600;
                                        }
                                    </style>
                                </head>
                                <body>
                                    <h1>Sharp Kolors Photopoint</h1>
                                    <p>You are offline. Please check your internet connection.</p>
                                    <button class="retry-btn" onclick="window.location.reload()">Try Again</button>
                                </body>
                                </html>
                                `,
                                {
                                    headers: { 'Content-Type': 'text/html' }
                                }
                            );
                        }
                    });
            })
    );
});

// Listen for update messages from the app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Send update notification to clients
self.addEventListener('activate', (event) => {
    // Notify all clients about the update
    self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
            client.postMessage({
                type: 'UPDATE_AVAILABLE',
                message: 'New version available!'
            });
        });
    });
});
