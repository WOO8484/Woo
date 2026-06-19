// NovelShelf Service Worker v1.0
const CACHE_NAME = 'novelshelf-v1';
const FIREBASE_CACHE = 'firebase-sdk-v1';

// 앱 셸 — 항상 캐시
const APP_SHELL = [
  '/',
  '/index.html',
];

// Firebase SDK — 장기 캐시 (버전이 고정되어 있으므로)
const FIREBASE_URLS = [
  'https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/11.0.0/firebase-storage.js',
  'https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js',
];

// ── 설치: 앱 셸 + Firebase SDK 캐싱 ──
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)),
      caches.open(FIREBASE_CACHE).then(cache => cache.addAll(FIREBASE_URLS)),
    ]).then(() => self.skipWaiting())
  );
});

// ── 활성화: 이전 캐시 정리 ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== FIREBASE_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch 전략 ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Firebase API / Auth / Storage 요청 → 캐시 안 함 (항상 네트워크)
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('firebasestorage.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com')
  ) {
    return; // 기본 fetch 동작 (네트워크)
  }

  // Firebase SDK (gstatic) → Cache First (버전 고정이라 안전)
  if (url.hostname === 'www.gstatic.com') {
    event.respondWith(
      caches.open(FIREBASE_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(res => {
            cache.put(event.request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // 앱 셸 (index.html 등) → Network First, 실패 시 캐시
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
