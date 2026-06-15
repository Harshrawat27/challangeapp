import { createContext, useCallback, useContext, useMemo, useState } from 'react';

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

type Ctx = {
  state: OnboardingState;
  update: <K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) => void;
  reset: () => void;
};

const OnboardingContext = createContext<Ctx | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState>(DEFAULT);

  const update = useCallback(
    <K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) => {
      setState(prev => ({ ...prev, [key]: value }));
    },
    [],
  );

  const reset = useCallback(() => setState(DEFAULT), []);

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
