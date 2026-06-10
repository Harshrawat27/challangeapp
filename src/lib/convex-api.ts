/**
 * Typed wrappers around Convex functions.
 *
 * The convex source code lives in habittrackerweb/my-app/convex (the canonical
 * deployment). To call it from this Expo app without pulling in the full
 * codegen folder, we declare each function reference manually using
 * `makeFunctionReference`. Args + return type still get inferred at call sites.
 *
 * Keep the argument shapes in sync with convex/userPreferences.ts.
 */

import { makeFunctionReference } from 'convex/server';
import { useMutation, useQuery } from 'convex/react';

// ─── userPreferences ───────────────────────────────────────────────────────

export type ReminderTimes = {
  morning: string;
  afternoon: string;
  evening: string;
};

export type UserPreferencesSaveArgs = {
  name: string;
  challenge: string;
  challengeLength: number;
  challengeStartDate: string;        // YYYY-MM-DD (user-local)
  customHabits: string[];
  whyMotivations: string[];
  pastFailures: string[];
  seriousness: number;
  partnerInvited: boolean;
  reminderTimes: ReminderTimes;
};

export type UserPreferencesRow = UserPreferencesSaveArgs & {
  _id: string;
  _creationTime: number;
  userId: string;
  onboardingCompletedAt: string;
};

const userPreferencesSave = makeFunctionReference<'mutation', UserPreferencesSaveArgs, string>(
  'userPreferences:save',
);

const userPreferencesGet = makeFunctionReference<'query', Record<string, never>, UserPreferencesRow | null>(
  'userPreferences:get',
);

/** Save the entire onboarding payload. Idempotent — upserts the current user's row. */
export function useSavePreferences() {
  return useMutation(userPreferencesSave);
}

/**
 * Subscribe to the current user's preferences.
 * Returns:
 *  - `undefined` while loading (or while session isn't ready)
 *  - `null` if no row exists yet (user hasn't completed onboarding)
 *  - the prefs row otherwise
 */
export function useMyPreferences(): UserPreferencesRow | null | undefined {
  return useQuery(userPreferencesGet, {});
}
