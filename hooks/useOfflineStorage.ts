"use client";

import { useCallback, useEffect, useState } from "react";

export function useOfflineStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        setValue(JSON.parse(raw) as T);
      }
    } catch {
      // Keep the in-memory default if local storage is unavailable/corrupt.
    } finally {
      setHydrated(true);
    }
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // The UI remains usable even if storage is temporarily unavailable.
    }
  }, [key, value, hydrated]);

  const update = useCallback((next: T | ((current: T) => T)) => {
    setValue(current =>
      typeof next === "function"
        ? (next as (current: T) => T)(current)
        : next
    );
  }, []);

  return { value, setValue: update, hydrated };
}
