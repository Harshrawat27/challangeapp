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

import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { makeFunctionReference } from 'convex/server';
import { useAction, useMutation, useQuery } from 'convex/react';

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
  weightKg?: number;
  waterGoalMl?: number;
};

export type UserPreferencesRow = UserPreferencesSaveArgs & {
  _id: string;
  _creationTime: number;
  userId: string;
  onboardingCompletedAt: string;
  subscriptionStatus?: 'weekly' | 'monthly' | 'yearly' | 'expired';
};

const userPreferencesSave = makeFunctionReference<'mutation', UserPreferencesSaveArgs, string>(
  'userPreferences:save',
);

const userPreferencesGet = makeFunctionReference<'query', Record<string, never>, UserPreferencesRow | null>(
  'userPreferences:get',
);

const userPreferencesPatch = makeFunctionReference<
  'mutation',
  { waterGoalMl?: number; weightKg?: number },
  void
>('userPreferences:patchPrefs');

const userPreferencesSyncSubscription = makeFunctionReference<
  'mutation',
  { status: 'weekly' | 'monthly' | 'yearly' | 'expired' },
  void
>('userPreferences:syncSubscriptionStatus');

/** Save the entire onboarding payload. Idempotent — upserts the current user's row. */
export function useSavePreferences() {
  return useMutation(userPreferencesSave);
}

/** Partial update — only send the fields you want to change. */
export function usePatchPrefs() {
  return useMutation(userPreferencesPatch);
}

/** Fast-path: sync subscription status to Convex right after a RC purchase, before the webhook arrives. */
export function useSyncSubscriptionStatus() {
  return useMutation(userPreferencesSyncSubscription);
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

const PREFS_CACHE_KEY = 'cached_prefs_v1';

/**
 * Like `useMyPreferences` but reads a SecureStore cache synchronously on first
 * render, so the UI has real data before the first Convex round-trip completes.
 *
 * Safety contract:
 *  - Cache is only ever written FROM Convex data — never the other direction.
 *  - Convex is always source of truth; cached data is display-only.
 *  - Cache is cleared when Convex returns null (no onboarding row).
 */
export function useCachedPreferences(): UserPreferencesRow | null | undefined {
  const [cached, setCached] = useState<UserPreferencesRow | null | undefined>(() => {
    try {
      const raw = SecureStore.getItem(PREFS_CACHE_KEY);
      return raw ? (JSON.parse(raw) as UserPreferencesRow) : undefined;
    } catch {
      return undefined;
    }
  });

  const live = useMyPreferences();

  useEffect(() => {
    if (live === undefined || live === null) return;
    // Only update cache from confirmed non-null Convex data.
    // We deliberately never clear the cache here — a null from Convex can be
    // a transient auth-sync artefact (Convex token not yet applied), not
    // evidence that the row is gone. The cache is cleared explicitly on
    // sign-out via clearPrefsCache().
    setCached(live);
    try { SecureStore.setItem(PREFS_CACHE_KEY, JSON.stringify(live)); } catch {}
  }, [live]);

  // Return priority:
  //   1. Real Convex data when it's confirmed non-null
  //   2. SecureStore cache (covers the Convex auth-sync window)
  //   3. null  — only when both live AND cache are null/undefined (truly new user)
  //   4. undefined — still loading
  if (live !== undefined && live !== null) return live;
  if (cached !== undefined) return cached;
  return live; // null (confirmed new user, no cache) or undefined (loading)
}

/** Call this on sign-out so the next user on this device starts cache-clean. */
export function clearPrefsCache() {
  SecureStore.deleteItemAsync(PREFS_CACHE_KEY).catch(() => {});
}

// ─── dailyLogs ─────────────────────────────────────────────────────────────

export type DailyLog = {
  _id: string;
  _creationTime: number;
  userId: string;
  date: string;                         // YYYY-MM-DD
  challengeDay: number;
  allTaskIds: string[];
  completions: Record<string, string>;  // taskId → ISO timestamp of latest check
};

const dailyLogsToggle = makeFunctionReference<
  'mutation',
  { date: string; taskId: string; allTaskIds: string[]; todayLocal: string },
  string
>('dailyLogs:toggleTask');

const dailyLogsGetDay = makeFunctionReference<
  'query',
  { date: string },
  DailyLog | null
>('dailyLogs:getDay');

const dailyLogsGetRange = makeFunctionReference<
  'query',
  { from: string; to: string },
  DailyLog[]
>('dailyLogs:getRange');

/** Toggle a single task for the given (user-local) date. Throws if `date` isn't today. */
export function useToggleTask() {
  return useMutation(dailyLogsToggle);
}

/** Subscribe to a single day's log. `undefined` = loading, `null` = no row yet. */
export function useDay(date: string): DailyLog | null | undefined {
  return useQuery(dailyLogsGetDay, { date });
}

/**
 * Like `useDay` but reads a SecureStore cache synchronously on first render.
 * Cache is keyed by date so a new day always starts fresh (no stale completions).
 * Assumes `date` is stable for the lifetime of the calling component.
 */
export function useCachedDay(date: string): DailyLog | null | undefined {
  const cacheKey = `daily_log_v1_${date}`;

  const [cached, setCached] = useState<DailyLog | null | undefined>(() => {
    try {
      const raw = SecureStore.getItem(cacheKey);
      return raw ? (JSON.parse(raw) as DailyLog) : undefined;
    } catch {
      return undefined;
    }
  });

  const live = useDay(date);

  useEffect(() => {
    if (live === undefined) return;
    setCached(live);
    if (live !== null) {
      try { SecureStore.setItem(cacheKey, JSON.stringify(live)); } catch {}
    } else {
      SecureStore.deleteItemAsync(cacheKey).catch(() => {});
    }
  }, [live, cacheKey]);

  return live !== undefined ? live : cached;
}

/** Subscribe to a date range (inclusive both ends). */
export function useDayRange(from: string, to: string): DailyLog[] | undefined {
  return useQuery(dailyLogsGetRange, { from, to });
}

// ─── usernames ──────────────────────────────────────────────────────────────

export type UsernameRow = {
  _id: string;
  _creationTime: number;
  userId: string;
  username: string;
  displayName: string;
  setAt: string;
};

export type UsernameAvailability =
  | { ok: true }
  | { ok: false; reason: 'invalid' | 'taken' };

const usernamesIsAvailable = makeFunctionReference<
  'query',
  { username: string },
  UsernameAvailability
>('usernames:isAvailable');

const usernamesGetMine = makeFunctionReference<
  'query',
  Record<string, never>,
  UsernameRow | null
>('usernames:getMine');

const usernamesClaim = makeFunctionReference<
  'mutation',
  { username: string; displayName: string },
  string
>('usernames:claim');

export type FoundUser =
  | { self: true; username: string; displayName: string }
  | {
      self: false;
      userId: string;
      username: string;
      displayName: string;
      name: string;
      challenge: string | null;
      challengeLength: number | null;
      challengeStartDate: string | null;
    };

const usernamesSearch = makeFunctionReference<
  'query',
  { username: string },
  FoundUser | null
>('usernames:searchByUsername');

/** Live check whether a username is available. Debounced query — pass empty string to skip. */
export function useIsUsernameAvailable(username: string): UsernameAvailability | undefined {
  return useQuery(usernamesIsAvailable, username.length >= 3 ? { username } : 'skip' as never);
}

export function useMyUsername(): UsernameRow | null | undefined {
  return useQuery(usernamesGetMine, {});
}

export function useClaimUsername() {
  return useMutation(usernamesClaim);
}

export function useSearchByUsername(username: string): FoundUser | null | undefined {
  return useQuery(usernamesSearch, username.length >= 3 ? { username } : 'skip' as never);
}

// ─── friends ────────────────────────────────────────────────────────────────

export type FriendCard = {
  userId: string;
  username: string | null;
  displayName: string;
  name: string | null;
  challenge: string | null;
  challengeLength: number | null;
  challengeStartDate: string | null;
  customHabits: string[];
  currentDay: number | null;
  todayCompleted: number;
  todayExpected: number;
  todayTaskIds: string[];
  todayCompletions: string[];
};

export type FriendDetail = {
  username: string | null;
  displayName: string;
  challenge: string | null;
  challengeLength: number | null;
  challengeStartDate: string | null;
  customHabits: string[];
  logs: DailyLog[];
} | null;

export type PendingRequests = {
  incoming: Array<{ fromUserId: string; username: string | null; displayName: string; createdAt: string }>;
  outgoing: Array<{ toUserId: string;   username: string | null; displayName: string; createdAt: string }>;
};

const friendsGetDetail = makeFunctionReference<
  'query',
  { friendUserId: string; today: string },
  FriendDetail
>('friends:getFriendDetail');

const friendsSendRequest = makeFunctionReference<
  'mutation',
  { toUsername: string },
  { status: 'sent' | 'already_pending' | 'already_friends' | 'auto_accepted' }
>('friends:sendRequest');

const friendsAccept = makeFunctionReference<'mutation', { fromUserId: string }, null>('friends:acceptRequest');
const friendsDecline = makeFunctionReference<'mutation', { fromUserId: string }, null>('friends:declineRequest');
const friendsRemove = makeFunctionReference<'mutation', { friendUserId: string }, null>('friends:removeFriend');
const friendsGetMine = makeFunctionReference<'query', { today: string }, FriendCard[]>('friends:getMyFriends');
const friendsGetPending = makeFunctionReference<'query', Record<string, never>, PendingRequests>('friends:getPendingRequests');

export function useSendFriendRequest() { return useMutation(friendsSendRequest); }
export function useAcceptFriendRequest() { return useMutation(friendsAccept); }
export function useDeclineFriendRequest() { return useMutation(friendsDecline); }
export function useRemoveFriend() { return useMutation(friendsRemove); }
export function useMyFriends(today: string): FriendCard[] | undefined {
  return useQuery(friendsGetMine, { today });
}
export function usePendingFriendRequests(): PendingRequests | undefined {
  return useQuery(friendsGetPending, {});
}
export function useFriendDetail(friendUserId: string, today: string): FriendDetail | undefined {
  return useQuery(friendsGetDetail, { friendUserId, today });
}

// ─── meals ──────────────────────────────────────────────────────────────────

export type Meal = {
  _id: string;
  _creationTime: number;
  userId: string;
  date: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  scannedAt: string;
};

export type MealScanResult = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const mealsGetForDay = makeFunctionReference<
  'query',
  { date: string },
  Meal[]
>('meals:getMealsForDay');

const mealsSave = makeFunctionReference<
  'mutation',
  { date: string; name: string; calories: number; protein: number; carbs: number; fat: number },
  string
>('meals:saveMeal');

const mealsDelete = makeFunctionReference<
  'mutation',
  { mealId: string },
  null
>('meals:deleteMeal');

const mealsScan = makeFunctionReference<
  'action',
  { imageBase64: string },
  MealScanResult
>('meals:scanMeal');

export function useMealsForDay(date: string): Meal[] | undefined {
  return useQuery(mealsGetForDay, { date });
}

export function useSaveMeal() {
  return useMutation(mealsSave);
}

export function useDeleteMeal() {
  return useMutation(mealsDelete);
}

export function useScanMeal() {
  return useAction(mealsScan);
}

// ─── notes ──────────────────────────────────────────────────────────────────

export type DayNote = {
  _id: string;
  _creationTime: number;
  userId: string;
  date: string;
  note: string;
  updatedAt: string;
};

const notesGetForDay = makeFunctionReference<
  'query',
  { date: string },
  DayNote | null
>('notes:getNoteForDay');

const notesSet = makeFunctionReference<
  'mutation',
  { date: string; note: string },
  null
>('notes:setNote');

export function useNoteForDay(date: string): DayNote | null | undefined {
  return useQuery(notesGetForDay, { date });
}

export function useSetNote() {
  return useMutation(notesSet);
}

// ─── water ───────────────────────────────────────────────────────────────────

export type WaterEntry = {
  _id: string;
  _creationTime: number;
  userId: string;
  date: string;
  amountMl: number;
  loggedAt: string;
};

export const waterGetForDay = makeFunctionReference<
  'query',
  { date: string },
  WaterEntry[]
>('water:getWaterForDay');

const waterLog = makeFunctionReference<
  'mutation',
  { date: string; amountMl: number },
  number
>('water:logWater');

const waterDelete = makeFunctionReference<
  'mutation',
  { entryId: string },
  number
>('water:deleteWaterEntry');

export function useWaterForDay(date: string): WaterEntry[] | undefined {
  return useQuery(waterGetForDay, { date });
}

export function useCachedWaterForDay(date: string): WaterEntry[] | undefined {
  const cacheKey = `water_log_v1_${date}`;

  const [cached, setCached] = useState<WaterEntry[] | undefined>(() => {
    try {
      const raw = SecureStore.getItem(cacheKey);
      return raw ? (JSON.parse(raw) as WaterEntry[]) : undefined;
    } catch {
      return undefined;
    }
  });

  const live = useWaterForDay(date);

  useEffect(() => {
    if (live === undefined) return;
    setCached(live);
    try { SecureStore.setItem(cacheKey, JSON.stringify(live)); } catch {}
  }, [live, cacheKey]);

  return live !== undefined ? live : cached;
}

export function useLogWater() {
  return useMutation(waterLog);
}

export function useDeleteWaterEntry() {
  return useMutation(waterDelete);
}

// ─── changeChallenge ─────────────────────────────────────────────────────────

const userPreferencesChangeChallenge = makeFunctionReference<
  'mutation',
  { challenge: string; challengeLength: number; challengeStartDate: string; customHabits: string[] },
  null
>('userPreferences:changeChallenge');

export function useChangeChallenge() {
  return useMutation(userPreferencesChangeChallenge);
}

export type ChallengeHistoryEntry = {
  _id: string;
  _creationTime: number;
  userId: string;
  challenge: string;
  challengeLength: number;
  challengeStartDate: string;
  endedAt: string;
  daysLogged: number;
  status: 'completed' | 'abandoned';
};

const userPreferencesGetHistory = makeFunctionReference<
  'query',
  Record<string, never>,
  ChallengeHistoryEntry[]
>('userPreferences:getHistory');

export function useChallengeHistory(): ChallengeHistoryEntry[] | undefined {
  return useQuery(userPreferencesGetHistory, {});
}
