import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

import type { ChallengeId } from '@/constants/challenges';

export type OnboardingState = {
  name: string;
  challenge: ChallengeId | null;
  challengeLength: number;     // days
  customHabits: string[];
  whyMotivations: string[];
  pastFailures: string[];
  seriousness: number;         // 1-10
  partnerInvited: boolean;
  reminderTimes: { morning: string; afternoon: string; evening: string };
  weightKg: number | null;
  waterGoalMl: number;         // ml, default 2500
  username: string;            // claimed at S14
};

const DEFAULT: OnboardingState = {
  name: '',
  challenge: null,
  challengeLength: 75,
  customHabits: [],
  whyMotivations: [],
  pastFailures: [],
  seriousness: 7,
  partnerInvited: false,
  reminderTimes: { morning: '07:00', afternoon: '13:00', evening: '21:00' },
  weightKg: null,
  waterGoalMl: 2500,
  username: '',
};

const DRAFT_KEY = 'onboarding_draft_v1';

// Module-level callback — lets clearOnboardingDraft() reset in-memory state
// from outside the component tree (e.g., after payment or account switch).
let _resetOnboardingState: (() => void) | null = null;

/** Wipes the SecureStore draft and resets in-memory OnboardingState to defaults. */
export function clearOnboardingDraft() {
  SecureStore.deleteItemAsync(DRAFT_KEY).catch(() => {});
  _resetOnboardingState?.();
}

type Ctx = {
  state: OnboardingState;
  update: <K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) => void;
  reset: () => void;
};

const OnboardingContext = createContext<Ctx | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState>(() => {
    // Restore draft from SecureStore on first render (survives app kills).
    try {
      const raw = SecureStore.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<OnboardingState>;
        return { ...DEFAULT, ...parsed };
      }
    } catch {}
    return DEFAULT;
  });

  // Register the module-level reset so clearOnboardingDraft() can wipe this state.
  useEffect(() => {
    _resetOnboardingState = () => setState(DEFAULT);
    return () => { _resetOnboardingState = null; };
  }, []);

  const update = useCallback(
    <K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) => {
      setState(prev => {
        const next = { ...prev, [key]: value };
        // Persist draft asynchronously — no await, never blocks the UI.
        SecureStore.setItemAsync(DRAFT_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [],
  );

  const reset = useCallback(() => {
    SecureStore.deleteItemAsync(DRAFT_KEY).catch(() => {});
    setState(DEFAULT);
  }, []);

  const ctx = useMemo<Ctx>(() => ({ state, update, reset }), [state, update, reset]);

  return (
    <OnboardingContext.Provider value={ctx}>{children}</OnboardingContext.Provider>
  );
}

export function useOnboarding(): Ctx {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be inside <OnboardingProvider>');
  return ctx;
}
