"use client";

import { useEffect } from "react";

// サービスワーカーを登録（PWA インストール／オフライン対応）。
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
