"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import { useMediaQuery } from "@/lib/hooks";
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
  updatePrefs,
  type Theme,
} from "./prefsStore";

export type { Theme };
export { bootScript } from "./prefsStore";

type PreferencesContext = {
  theme: Theme;
  /** Recruiter Mode strips decoration and 3D for a fast, plain read. */
  recruiterMode: boolean;
  soundEnabled: boolean;
  /** True when the OS asks for reduced motion — honoured everywhere. */
  reducedMotion: boolean;
  /** True once the user is past the ENTER gate. */
  entered: boolean;
  /** Convenience: decorative motion should be suppressed. */
  motionOff: boolean;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  toggleRecruiterMode: () => void;
  /**
   * Leaves Recruiter Mode *and* marks the gate as passed.
   *
   * `entered` below is `manuallyEntered || recruiterMode || …`, so turning
   * Recruiter Mode off on someone who never passed the ENTER gate would drop
   * them straight back onto it — which is exactly the navigation dead end this
   * exists to avoid. Anything that leaves the mode as a side effect of going
   * somewhere else must use this, not `toggleRecruiterMode`.
   */
  exitRecruiterMode: () => void;
  toggleSound: () => void;
  enter: () => void;
};

const Ctx = createContext<PreferencesContext | null>(null);

export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Persisted prefs live in an external store, so hydration doesn't need an
  // effect-driven setState pass.
  const { theme, recruiterMode, soundEnabled } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  // Recruiter Mode and reduced-motion skip the cinematic gate — derived rather
  // than synced, so there's no cascading render.
  const [manuallyEntered, setManuallyEntered] = useState(false);
  const entered = manuallyEntered || recruiterMode || reducedMotion;

  // Reflect onto <html> so CSS can react without prop drilling. Writing to the
  // DOM is exactly what an effect is for.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.recruiter = recruiterMode ? "on" : "off";
  }, [theme, recruiterMode]);

  const value = useMemo<PreferencesContext>(
    () => ({
      theme,
      recruiterMode,
      soundEnabled,
      reducedMotion,
      entered,
      motionOff: recruiterMode || reducedMotion,
      setTheme: (t) => updatePrefs({ theme: t }),
      toggleTheme: () =>
        updatePrefs({ theme: theme === "dark" ? "light" : "dark" }),
      toggleRecruiterMode: () => updatePrefs({ recruiterMode: !recruiterMode }),
      exitRecruiterMode: () => {
        updatePrefs({ recruiterMode: false });
        setManuallyEntered(true);
      },
      toggleSound: () => updatePrefs({ soundEnabled: !soundEnabled }),
      enter: () => setManuallyEntered(true),
    }),
    [theme, recruiterMode, soundEnabled, reducedMotion, entered],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePreferences() {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("usePreferences must be used inside <PreferencesProvider>");
  return ctx;
}
