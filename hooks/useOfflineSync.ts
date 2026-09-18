"use client";

import { useCallback, useEffect, useState } from "react";
import {
  flushSyncQueue,
  getPendingSyncCount,
  subscribeSyncQueue,
} from "../lib/sync";

export function useOfflineSync() {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setPendingCount(getPendingSyncCount());
  }, []);

  const syncNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await flushSyncQueue();
      setPendingCount(result.pending);
      if (result.synced > 0) {
        setLastSync(new Date().toLocaleTimeString("pt-BR"));
      }
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  useEffect(() => {
    refresh();

    const unsubscribe = subscribeSyncQueue(refresh);
    const onOnline = () => {
      refresh();
      void syncNow();
    };

    window.addEventListener("online", onOnline);
    return () => {
      unsubscribe();
      window.removeEventListener("online", onOnline);
    };
  }, [refresh, syncNow]);

  return { pendingCount, syncing, lastSync, syncNow };
}
