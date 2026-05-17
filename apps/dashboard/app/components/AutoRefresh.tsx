"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Server-component refresh on a fixed interval. Mounts invisibly inside
// a server-rendered tree to keep the page alive without a full reload.
export function AutoRefresh({ intervalMs = 12_000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
