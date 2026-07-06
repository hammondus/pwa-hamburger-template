/*
 * Service worker: network-first with cache fallback.
 *
 * Online, every request goes to the Go server and the response refreshes
 * the cache — so during development you always see your latest files.
 * Offline, everything is served from the cache, including navigations
 * (any app route falls back to the cached shell).
 *
 * Bump VERSION to force old caches to be discarded on the next visit.
 */

var VERSION = "sap-v9";

var PRECACHE = [
  "/",
  "/css/style.css",
  "/js/app.js",
  "/js/htmx.min.js",
  "/pages/home.html",
  "/pages/dashboard.html",
  "/pages/profile.html",
  "/pages/settings.html",
  "/pages/about.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches
      .open(VERSION)
      .then(function (cache) {
        return cache.addAll(PRECACHE);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (k) {
              return k !== VERSION;
            })
            .map(function (k) {
              return caches.delete(k);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;

  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  // Never intercept the SSE stream: it's an infinite response, and it is
  // the client's reachability probe — it must hit the network directly.
  if (url.pathname === "/events") return;

  // Every app route (/dashboard, /profile, ...) is served as the shell,
  // so cache and match all navigations under "/".
  var cacheKey = e.request.mode === "navigate" ? "/" : e.request;

  e.respondWith(
    fetch(e.request)
      .then(function (res) {
        if (res.ok) {
          var copy = res.clone();
          caches.open(VERSION).then(function (cache) {
            cache.put(cacheKey, copy);
          });
        }
        return res;
      })
      .catch(function () {
        return caches.match(cacheKey).then(function (cached) {
          return cached || caches.match("/");
        });
      })
  );
});
