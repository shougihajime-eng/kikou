// 棋稿 PWA サービスワーカー（最小構成・Turbopack互換のため手書き）
// 方針: ナビゲーションはネット優先＋オフライン時はキャッシュ。静的資産はキャッシュ優先。
// Supabase / API / 認証は一切キャッシュしない（常に最新・安全のため）。

const CACHE = "kikou-v1";
const SHELL = ["/projects", "/login", "/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 別オリジン（Supabase 等）・API はそのまま通す
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // ページ遷移: ネット優先 → 失敗時キャッシュ → シェル
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/projects")))
    );
    return;
  }

  // 静的資産: キャッシュ優先
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:css|js|png|jpg|jpeg|webp|svg|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            return res;
          })
      )
    );
  }
});
