"use client";

export type SyncOperation = {
  id: string;
  type: "movement" | "item-created" | "minimum-updated";
  payload: Record<string, unknown>;
  createdAt: string;
};

const QUEUE_KEY = "estoque-sync-queue";
const SYNC_EVENT = "estoque-sync-updated";

function readQueue(): SyncOperation[] {
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: SyncOperation[]) {
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new Event(SYNC_EVENT));
  } catch {
    // Keep the application usable even if storage is unavailable.
  }
}

export function getPendingSyncCount() {
  if (typeof window === "undefined") return 0;
  return readQueue().length;
}

export function queueSyncOperation(
  type: SyncOperation["type"],
  payload: SyncOperation["payload"]
) {
  if (typeof window === "undefined") return;

  const operation: SyncOperation = {
    id: crypto.randomUUID(),
    type,
    payload,
    createdAt: new Date().toISOString(),
  };

  writeQueue([...readQueue(), operation]);
  void requestBackgroundSync();
}

export async function requestBackgroundSync() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const syncManager = (registration as ServiceWorkerRegistration & {
      sync?: { register(tag: string): Promise<void> };
    }).sync;

    if (syncManager) {
      await syncManager.register("estoque-sync");
    }
  } catch {
    // Not all browsers implement Background Sync.
  }
}

export async function flushSyncQueue() {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { synced: 0, pending: getPendingSyncCount(), mode: "offline" as const };
  }

  const endpoint = process.env.NEXT_PUBLIC_SYNC_ENDPOINT;
  const queue = readQueue();

  if (!endpoint || queue.length === 0) {
    return {
      synced: 0,
      pending: queue.length,
      mode: endpoint ? "idle" as const : "local-only" as const,
    };
  }

  let synced = 0;
  const pending: SyncOperation[] = [];

  for (const operation of queue) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(operation),
      });

      if (!response.ok) {
        pending.push(operation);
      } else {
        synced += 1;
      }
    } catch {
      pending.push(operation);
    }
  }

  writeQueue(pending);
  return { synced, pending: pending.length, mode: "remote" as const };
}

export function subscribeSyncQueue(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener(SYNC_EVENT, handler);
  return () => window.removeEventListener(SYNC_EVENT, handler);
}
