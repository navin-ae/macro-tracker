/**
 * sw.js — service worker for the single-file build.
 *
 * Everything the app needs is inside index.html, so the precache list is one
 * entry instead of 35. This file has to stay separate: a service worker must
 * be a real same-origin URL with a JavaScript MIME type — blob: and data:
 * URLs are rejected by spec.
 *
 * Bump CACHE_VERSION on every release; the activate handler drops older
 * caches, which is what stops users being pinned to a stale build.
 */

const CACHE_VERSION = 'macrotrack-single-v3';
const SHELL = ['./', './index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached || fallback(request));
      return cached || network;
    }),
  );
});

/** A navigation that misses the cache while offline still gets the app. */
function fallback(request) {
  if (request.mode === 'navigate') return caches.match('./index.html');
  return new Response('', { status: 504, statusText: 'Offline' });
}