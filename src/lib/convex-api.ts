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
import { useAction, useConvexAuth, useMutation, useQuery } from 'convex/react';

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
  onboardingCompleted?: boolean;     // false = draft, true = paid & done
};

export type UserPreferencesRow = UserPreferencesSaveArgs & {
  _id: string;
  _creationTime: number;
  userId: string;
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: string;
  subscriptionStatus?: 'weekly' | 'monthly' | 'yearly' | 'expired';
  profilePictureId?: string;
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

const userPreferencesMarkComplete = makeFunctionReference<
  'mutation',
  { challengeStartDate: string },
  void
>('userPreferences:markOnboardingComplete');

const userPreferencesSyncSubscription = makeFunctionReference<
  'mutation',
  { status: 'weekly' | 'monthly' | 'yearly' | 'expired'; source?: 'direct' | 'restored' | 'transferred' },
  void
>('userPreferences:syncSubscriptionStatus');

const userPreferencesGenerateUploadUrl = makeFunctionReference<'mutation', Record<string, never>, string>(
  'userPreferences:generateUploadUrl',
);

const userPreferencesSaveProfilePicture = makeFunctionReference<'mutation', { storageId: string }, void>(
  'userPreferences:saveProfilePicture',
);

const userPreferencesGetProfilePictureUrl = makeFunctionReference<'query', { storageId: string }, string | null>(
  'userPreferences:getProfilePictureUrl',
);

/** Save the entire onboarding payload. Idempotent — upserts the current user's row. */
export function useSavePreferences() {
  return useMutation(userPreferencesSave);
}

/** Partial update — only send the fields you want to change. */
export function usePatchPrefs() {
  return useMutation(userPreferencesPatch);
}

/** After successful payment: sets challengeStartDate to today and marks onboardingCompleted: true. */
export function useMarkOnboardingComplete() {
  return useMutation(userPreferencesMarkComplete);
}

/** Fast-path: sync subscription status to Convex right after a RC purchase, before the webhook arrives. */
export function useSyncSubscriptionStatus() {
  return useMutation(userPreferencesSyncSubscription);
}

export function useGenerateUploadUrl() {
  return useMutation(userPreferencesGenerateUploadUrl);
}

export function useSaveProfilePicture() {
  return useMutation(userPreferencesSaveProfilePicture);
}

export function useProfilePictureUrl(storageId: string | null | undefined): string | null | undefined {
  return useQuery(
    userPreferencesGetProfilePictureUrl,
    storageId ? { storageId } : 'skip' as never,
  );
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

// Lets clearPrefsCache() wipe the in-memory React state (not just SecureStore).
let _resetCachedPrefs: (() => void) | null = null;

/**
 * Preferences for routing + UI, with a SecureStore fast-path.
 *
 * Semantics of the return value (relied on by _layout routing):
 *   - `undefined` → not resolved yet. Either Convex hasn't applied the auth
 *      token (fresh sign-in) or the query is still loading and there's no cache.
 *      Callers should show a spinner and make NO routing decision.
 *   - `null`      → Convex is authenticated AND the backend confirmed there is
 *      no preferences row. This is definitive — safe to send the user to
 *      onboarding. (We never surface a pre-auth `null`.)
 *   - object      → the user's preferences (a live row, or the SecureStore
 *      cache as an instant fast-path for a returning user on cold start).
 *
 * The key correctness rule: `userPreferences:get` returns `null` when Convex is
 * UNAUTHENTICATED (before the token is applied right after sign-in), which is
 * indistinguishable from "authenticated but no row". So we only trust a `null`
 * once `useConvexAuth()` reports the backend has confirmed the token.
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

  // Register the reset callback so clearPrefsCache() can wipe React state too.
  useEffect(() => {
    _resetCachedPrefs = () => setCached(undefined);
    return () => { _resetCachedPrefs = null; };
  }, []);

  const live = useMyPreferences();
  const { isAuthenticated, isLoading } = useConvexAuth();
  // `isAuthenticated` flips true only after the Convex backend confirms the
  // token (queries have re-run under the new identity by then), and
  // `isLoading` covers the transitional window right after sign-in.
  const convexReady = isAuthenticated && !isLoading;

  useEffect(() => {
    if (live === undefined || live === null) return;
    // Real prefs row loaded — refresh the cache for the next cold start.
    setCached(live);
    try { SecureStore.setItem(PREFS_CACHE_KEY, JSON.stringify(live)); } catch {}
  }, [live]);

  // Return priority:
  //   1. Live value once auth is confirmed — authoritative (null or row).
  //   2. SecureStore cache — instant home for a returning user while Convex
  //      re-authenticates on cold start. Only ever a row (we never cache null),
  //      so this can't produce a spurious "no prefs" answer.
  //   3. undefined — nothing to show yet; caller shows a spinner and waits.
  if (convexReady && live !== undefined) return live;
  if (cached !== undefined) return cached;
  return undefined;
}

/** Call this on sign-out/delete so the next user on this device starts cache-clean. */
export function clearPrefsCache() {
  SecureStore.deleteItemAsync(PREFS_CACHE_KEY).catch(() => {});
  _resetCachedPrefs?.();
}

// ─── dailyLogs ─────────────────────────────────────────────────────────────

export type DailyLog = {
  _id: string;
  _creationTime: number;
  userId: string;
  date: string;                                    // YYYY-MM-DD
  challengeDay: number;
  allTaskIds: string[];
  taskCounts?: Record<string, number>;             // taskId → required taps (1 = toggle)
  completions: Record<string, string[]>;           // taskId → array of tap timestamps
};

const dailyLogsTap = makeFunctionReference<
  'mutation',
  {
    date: string;
    taskId: string;
    allTaskIds: string[];
    taskCounts?: Record<string, number>;
    todayLocal: string;
    action: 'add' | 'remove';
  },
  string
>('dailyLogs:tapTask');

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

/** Add or remove one tap for a task on today's date. */
export function useTapTask() {
  return useMutation(dailyLogsTap);
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
  profilePictureUrl: string | null;
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
  profilePictureUrl: string | null;
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

// ─── custom habits (mid-challenge) ───────────────────────────────────────────

const userPreferencesAddCustomHabit = makeFunctionReference<
  'mutation',
  { encoded: string },
  void
>('userPreferences:addCustomHabit');

const userPreferencesUpdateCustomHabits = makeFunctionReference<
  'mutation',
  { customHabits: string[] },
  void
>('userPreferences:updateCustomHabits');

export function useAddCustomHabit() {
  return useMutation(userPreferencesAddCustomHabit);
}

export function useUpdateCustomHabits() {
  return useMutation(userPreferencesUpdateCustomHabits);
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

// ─── reminders ───────────────────────────────────────────────────────────────

export type ReminderType = 'daily' | 'twice_daily' | 'thrice_daily' | 'every_x_hours' | 'weekly';

export type Reminder = {
  _id: string;
  _creationTime: number;
  userId: string;
  label: string;
  type: ReminderType;
  times: string[];
  intervalHours?: number;
  intervalStart?: string;
  intervalEnd?: string;
  daysOfWeek?: number[];
  isActive: boolean;
  createdAt: string;
};

export type ReminderInput = {
  label: string;
  type: ReminderType;
  times: string[];
  intervalHours?: number;
  intervalStart?: string;
  intervalEnd?: string;
  daysOfWeek?: number[];
};

const remindersList = makeFunctionReference<'query', Record<string, never>, Reminder[]>('reminders:list');
const remindersCreate = makeFunctionReference<'mutation', ReminderInput, string>('reminders:create');
const remindersUpdate = makeFunctionReference<'mutation', Partial<ReminderInput> & { id: string; isActive?: boolean }, void>('reminders:update');
const remindersRemove = makeFunctionReference<'mutation', { id: string }, void>('reminders:remove');

export function useReminders(): Reminder[] | undefined {
  return useQuery(remindersList, {});
}

export function useCreateReminder() {
  return useMutation(remindersCreate);
}

export function useUpdateReminder() {
  return useMutation(remindersUpdate);
}

export function useRemoveReminder() {
  return useMutation(remindersRemove);
}
