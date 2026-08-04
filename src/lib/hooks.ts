"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Media query as an external store.
 *
 * Using `useSyncExternalStore` rather than `useState` + `useEffect` means no
 * setState-in-effect cascade: React reads the server snapshot during hydration
 * and swaps to the live value in the same commit.
 */
export function useMediaQuery(query: string, serverValue = false) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => serverValue);
}

/** True once mounted on the client — for genuinely client-only branches. */
export function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
