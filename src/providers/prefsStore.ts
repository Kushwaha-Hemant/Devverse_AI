"use client";

export type Theme = "dark" | "light";

/** What actually survives a reload. */
export type StoredPrefs = {
  theme: Theme;
  soundEnabled: boolean;
};

/**
 * The full in-memory shape.
 *
 * `recruiterMode` is deliberately NOT part of `StoredPrefs`. It is a per-visit
 * view rather than a preference: persisting it meant a reload dropped the
 * visitor straight back into Recruiter Mode instead of the home page. It lives
 * in the snapshot so the rest of the app reads it the same way, but it is
 * never read from nor written to storage, so every load starts with it off.
 */
export type Prefs = StoredPrefs & { recruiterMode: boolean };

export const DEFAULT_PREFS: Prefs = {
  theme: "dark",
  soundEnabled: false, // ambient audio starts muted
  recruiterMode: false,
};

export const STORAGE_KEY = "devverse:prefs";

const listeners = new Set<() => void>();

/**
 * Cached snapshot. `useSyncExternalStore` requires referential stability —
 * returning a fresh object each call would loop forever.
 */
let cache: Prefs | null = null;

function read(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<StoredPrefs>;
    return {
      theme: parsed.theme === "light" ? "light" : "dark",
      soundEnabled: !!parsed.soundEnabled,
      // Never restored — a reload always starts on the home page. Any
      // `recruiterMode` left in storage by an older build is ignored here and
      // dropped the next time anything is written.
      recruiterMode: false,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getSnapshot(): Prefs {
  cache ??= read();
  return cache;
}

/** Server render always uses defaults; React swaps in the real value on hydrate. */
export function getServerSnapshot(): Prefs {
  return DEFAULT_PREFS;
}

export function updatePrefs(patch: Partial<Prefs>) {
  cache = { ...getSnapshot(), ...patch };
  try {
    // Only the persisted keys are written. Spreading the whole cache here is
    // what put `recruiterMode` into storage in the first place.
    const stored: StoredPrefs = {
      theme: cache.theme,
      soundEnabled: cache.soundEnabled,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Private mode / storage disabled — keep the in-memory value.
  }
  listeners.forEach((l) => l());
}

/**
 * Runs before paint. Applies the stored theme without a flash, and pins two
 * things that must be settled before the browser does anything of its own:
 *
 * - `data-recruiter` is always "off". Recruiter Mode no longer persists, so
 *   reading it back from storage would flash the recruiter styling on load.
 * - `scrollRestoration = "manual"` stops the browser putting a reload back at
 *   the section you were reading. A refresh should land on the home page, and
 *   this has to be set before restoration would otherwise happen.
 */
export const bootScript = `
(function(){
  try { history.scrollRestoration = "manual"; } catch (e) {}
  try {
    var p = JSON.parse(localStorage.getItem("${STORAGE_KEY}") || "{}");
    var r = document.documentElement;
    r.dataset.theme = p.theme === "light" ? "light" : "dark";
    r.dataset.recruiter = "off";
  } catch (e) {
    document.documentElement.dataset.theme = "dark";
  }
})();
`;
