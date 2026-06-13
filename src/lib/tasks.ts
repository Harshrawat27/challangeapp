import { getChallenge, type ChallengeId, type ChallengeTask } from '@/constants/challenges';

/** Today's date as a user-local YYYY-MM-DD string (the wire format we use server-side). */
export function localDateString(d: Date = new Date()): string {
  return d.toLocaleDateString('en-CA');
}

/**
 * Compose the day's task list from the user's chosen challenge + their custom
 * habits. Used by both the home screen (for today) and the Day Detail screen
 * (for rendering past days, where the displayed labels/icons may differ from
 * what the user had at the time — see the day's `allTaskIds` for the frozen
 * historical set).
 */
export function buildTasks(
  challengeId: string | null | undefined,
  customHabits: string[] | undefined,
): ChallengeTask[] {
  const ch = getChallenge((challengeId as ChallengeId | undefined) ?? null);
  const base = ch?.tasks ?? [];
  const custom: ChallengeTask[] = (customHabits ?? []).map((label, i) => ({
    id: `custom-${i}-${label}`,
    icon: 'task_alt',
    label,
    meta: 'Custom',
  }));
  return [...base, ...custom];
}
