import { useCallback, useEffect, useState } from 'react';

const PREFIX = 'parvaz-play:';

function readStored(key: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function writeStored(key: string, value: number) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PREFIX + key, String(value));
  } catch {
    /* ignore quota / privacy mode errors */
  }
}

/**
 * Persistent best-score hook. Always keeps the highest value per game key.
 * Pass `mode: 'lower'` for games where smaller is better (moves, time, etc.).
 */
export function useBestScore(key: string, mode: 'higher' | 'lower' = 'higher') {
  const [best, setBest] = useState<number>(() => readStored(key));

  useEffect(() => {
    setBest(readStored(key));
  }, [key]);

  const submit = useCallback(
    (value: number) => {
      if (!Number.isFinite(value)) return;
      setBest((prev) => {
        const isBetter = mode === 'higher'
          ? value > prev
          : prev === 0 || value < prev;
        if (isBetter) {
          writeStored(key, value);
          return value;
        }
        return prev;
      });
    },
    [key, mode]
  );

  const reset = useCallback(() => {
    writeStored(key, 0);
    setBest(0);
  }, [key]);

  return { best, submit, reset };
}

/**
 * Drop-in `useState`-style replacement that persists a number to localStorage.
 * Designed so existing games can swap `useState(0)` → `usePersistedNumber('key', 0)`
 * without changing the rest of their code. The setter accepts both a value and
 * an updater function, just like `useState`.
 */
export function usePersistedNumber(
  key: string,
  initial: number
): [number, (next: number | ((prev: number) => number)) => void] {
  const fullKey = PREFIX + 'num:' + key;
  const [value, setValue] = useState<number>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const raw = window.localStorage.getItem(fullKey);
      if (raw === null) return initial;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : initial;
    } catch {
      return initial;
    }
  });

  const update = useCallback(
    (next: number | ((prev: number) => number)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: number) => number)(prev) : next;
        try {
          window.localStorage.setItem(fullKey, String(resolved));
        } catch {
          /* ignore */
        }
        return resolved;
      });
    },
    [fullKey]
  );

  return [value, update];
}

/**
 * Same as above for nullable numbers (used by reaction-time best score).
 */
export function usePersistedNullableNumber(
  key: string,
  initial: number | null
): [number | null, (next: number | null | ((prev: number | null) => number | null)) => void] {
  const fullKey = PREFIX + 'num:' + key;
  const [value, setValue] = useState<number | null>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const raw = window.localStorage.getItem(fullKey);
      if (raw === null) return initial;
      if (raw === 'null') return null;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : initial;
    } catch {
      return initial;
    }
  });

  const update = useCallback(
    (next: number | null | ((prev: number | null) => number | null)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: number | null) => number | null)(prev) : next;
        try {
          window.localStorage.setItem(fullKey, resolved === null ? 'null' : String(resolved));
        } catch {
          /* ignore */
        }
        return resolved;
      });
    },
    [fullKey]
  );

  return [value, update];
}

/**
 * Generic JSON autosave for in-progress game state.
 * Returns [value, setter, clear]. Initial value is loaded from storage if present.
 */
export function useAutosave<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void, () => void] {
  const fullKey = PREFIX + 'state:' + key;
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const raw = window.localStorage.getItem(fullKey);
      if (!raw) return initial;
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(fullKey, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [fullKey, value]);

  const clear = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(fullKey);
    } catch {
      /* ignore */
    }
  }, [fullKey]);

  return [value, setValue, clear];
}
