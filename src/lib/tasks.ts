import { getChallenge, type ChallengeId, type ChallengeTask } from '@/constants/challenges';

/** Today's date as a user-local YYYY-MM-DD string (the wire format we use server-side). */
export function localDateString(d: Date = new Date()): string {
  return d.toLocaleDateString('en-CA');
}

/**
 * Parsed representation of a custom habit.
 * Wire format: "startDate::endDate::count::icon::label"
 *   startDate  — YYYY-MM-DD or '' (empty = active from challenge start)
 *   endDate    — YYYY-MM-DD or '' (empty = not soft-deleted)
 *   count      — required taps per day (1 = simple toggle)
 *   icon       — Material Symbols ligature name
 *   label      — display text
 *
 * Legacy format (2 parts): "icon::label" — count defaults to 1, no dates.
 */
export type ParsedCustomHabit = {
  startDate: string;
  endDate: string;
  count: number;
  icon: string;
  label: string;
};

export function parseCustomHabit(raw: string): ParsedCustomHabit {
  const parts = raw.split('::');
  if (parts.length >= 5) {
    const [startDate, endDate, countStr, icon, ...labelParts] = parts;
    return {
      startDate: startDate ?? '',
      endDate: endDate ?? '',
      count: Math.max(1, parseInt(countStr ?? '1', 10) || 1),
      icon: icon ?? 'task_alt',
      label: labelParts.join('::'),
    };
  }
  // Legacy: icon::label
  const sep = raw.indexOf('::');
  return {
    startDate: '',
    endDate: '',
    count: 1,
    icon: sep !== -1 ? raw.slice(0, sep) : 'task_alt',
    label: sep !== -1 ? raw.slice(sep + 2) : raw,
  };
}

export function encodeCustomHabit(
  startDate: string,
  endDate: string,
  count: number,
  icon: string,
  label: string,
): string {
  return `${startDate}::${endDate}::${count}::${icon}::${label}`;
}

/**
 * Compose the day's task list from the user's chosen challenge + their custom
 * habits.
 *
 * forDate (optional YYYY-MM-DD): when provided, filters custom habits so only
 * habits active on that date are included:
 *   - startDate <= forDate  (empty startDate = always active from beginning)
 *   - endDate > forDate or empty  (empty endDate = not deleted)
 * Without forDate, all custom habits are returned (no date filtering), which
 * is useful for lookup tables and onboarding where all definitions are needed.
 */
export function buildTasks(
  challengeId: string | null | undefined,
  customHabits: string[] | undefined,
  forDate?: string,
): ChallengeTask[] {
  const ch = getChallenge((challengeId as ChallengeId | undefined) ?? null);
  const base: ChallengeTask[] = (ch?.tasks ?? []).map(t => ({ ...t, count: 1 }));

  const custom: ChallengeTask[] = (customHabits ?? [])
    .map((raw) => ({ raw, ...parseCustomHabit(raw) }))
    .filter(h => {
      if (forDate) {
        if (h.startDate && h.startDate > forDate) return false;
        if (h.endDate && h.endDate <= forDate) return false;
      }
      return true;
    })
    .map(h => ({
      id: `custom-${h.icon}-${h.label}`,
      icon: h.icon,
      label: h.label,
      meta: h.count > 1 ? `${h.count}× per day` : 'Custom',
      count: h.count,
    }));

  return [...base, ...custom];
}
