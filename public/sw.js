/**
 * Service worker for the Studies PWA.
 *
 * Strategy (deliberately conservative — an aggressive cache here is what made
 * the app load a stale/broken shell on some phones and laptops):
 *
 *   • navigations            → network first, cache only when offline
 *   • /_next/static/**       → cache first (immutable, content-hashed)
 *   • same-origin images/etc → stale-while-revalidate
 *   • /api/**                → network only (never cached)
 *   • cross-origin requests  → untouched
 *
 * Bumping CACHE_VERSION purges every older cache on activate, so devices stuck
 * on a previous build recover on their next visit.
 */

const CACHE_VERSION = "studies-app-v3";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = ["/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];
const OFFLINE_URL = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch((err) => {
            console.warn("[sw] precache skipped:", url, err);
          }),
        ),
      );
      // Keep an offline copy of the shell, but only ever use it as a fallback.
      try {
        const res = await fetch(OFFLINE_URL, { cache: "reload" });
        if (res && res.ok) {
          const runtime = await caches.open(RUNTIME_CACHE);
          await runtime.put(OFFLINE_URL, res);
        }
      } catch {
        /* offline install — fine */
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== RUNTIME_CACHE) return caches.delete(key);
          return Promise.resolve();
        }),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
  if (event.data === "clear-caches") {
    event.waitUntil(
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(() => self.clients.claim()),
    );
  }
});

function isCacheable(response) {
  return (
    response &&
    response.status === 200 &&
    response.type === "basic" &&
    !/no-store|no-cache|private/i.test(response.headers.get("cache-control") || "")
  );
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    if (isCacheable(fresh)) cache.put(request, fresh.clone()).catch(() => {});
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      const offline = await cache.match(OFFLINE_URL);
      if (offline) return offline;
    }
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const fresh = await fetch(request);
  if (isCacheable(fresh)) cache.put(request, fresh.clone()).catch(() => {});
  return fresh;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((fresh) => {
      if (isCacheable(fresh)) cache.put(request, fresh.clone()).catch(() => {});
      return fresh;
    })
    .catch(() => null);

  return cached || (await network) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  // Never intercept cross-origin traffic (fonts, analytics, Brevo…).
  if (url.origin !== self.location.origin) return;

  // Emergency escape hatch: /?sw=reset unregisters the worker and wipes caches.
  if (url.pathname === "/" && url.searchParams.get("sw") === "reset") {
    event.respondWith(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        await self.registration.unregister();
        return Response.redirect("/?sw=cleared", 302);
      })(),
    );
    return;
  }

  // API calls must always hit the network.
  if (url.pathname.startsWith("/api/")) return;

  // Never serve the worker itself from cache.
  if (url.pathname === "/sw.js") {
    event.respondWith(fetch(request));
    return;
  }

  // Immutable, content-hashed build assets.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE).catch(() => Response.error()));
    return;
  }

  // HTML navigations: always try the network first.
  if (request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(
      networkFirst(request, RUNTIME_CACHE).catch(
        () => new Response(offlinePage(), {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      ),
    );
    return;
  }

  // Everything else (icons, images, fonts served from this origin).
  event.respondWith(
    staleWhileRevalidate(request, RUNTIME_CACHE).catch(() => Response.error()),
  );
});

function offlinePage() {
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>غير متصل</title>
<style>body{font-family:system-ui,'Segoe UI',Tahoma,sans-serif;background:#f5f5f7;color:#1d1d1f;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}
.card{background:#fff;border:1px solid #e8e8ed;border-radius:18px;padding:32px 24px;max-width:420px}
h1{font-size:18px;margin:0 0 8px}p{font-size:13px;color:#6e6e73;line-height:1.8;margin:0 0 18px}
button{background:#10b981;color:#fff;border:0;border-radius:999px;padding:11px 22px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}</style>
</head><body><div class="card"><h1>لا يوجد اتصال بالإنترنت</h1>
<p>تعذر تحميل الصفحة لأن الجهاز غير متصل. بياناتك المحفوظة محلياً ما زالت بأمان — أعد المحاولة بعد الاتصال.</p>
<button onclick="location.reload()">إعادة المحاولة</button></div></body></html>`;
}
