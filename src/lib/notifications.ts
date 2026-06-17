import * as Notifications from 'expo-notifications';
import type { Reminder } from './convex-api';

// Expo's CALENDAR weekday: 1=Sunday, 2=Monday, ..., 7=Saturday
// Our daysOfWeek: 0=Sunday, 1=Monday, ..., 6=Saturday
function toExpoWeekday(day: number): number {
  return day + 1;
}

function parseTime(hhmm: string): { hour: number; minute: number } {
  const [h, m] = hhmm.split(':').map(Number);
  return { hour: h, minute: m };
}

type ScheduleEntry = { hour: number; minute: number; weekday?: number };

function getScheduleEntries(reminder: Reminder): ScheduleEntry[] {
  if (reminder.type === 'every_x_hours') {
    const entries: ScheduleEntry[] = [];
    const start = parseTime(reminder.intervalStart ?? '08:00');
    const end = parseTime(reminder.intervalEnd ?? '20:00');
    const interval = reminder.intervalHours ?? 2;
    let totalMinutes = start.hour * 60 + start.minute;
    const endMinutes = end.hour * 60 + end.minute;
    while (totalMinutes <= endMinutes) {
      entries.push({ hour: Math.floor(totalMinutes / 60), minute: totalMinutes % 60 });
      totalMinutes += interval * 60;
    }
    return entries;
  }

  if (reminder.type === 'weekly') {
    const days = reminder.daysOfWeek ?? [];
    return reminder.times.flatMap(t => {
      const { hour, minute } = parseTime(t);
      return days.map(day => ({ hour, minute, weekday: toExpoWeekday(day) }));
    });
  }

  return reminder.times.map(parseTime);
}

async function scheduleOne(label: string, entry: ScheduleEntry): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'HardPact',
      body: label,
      sound: true,
    },
    trigger: entry.weekday
      ? {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          weekday: entry.weekday,
          hour: entry.hour,
          minute: entry.minute,
          repeats: true,
        }
      : {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: entry.hour,
          minute: entry.minute,
          repeats: true,
        },
  });
}

export async function rescheduleAllReminders(reminders: Reminder[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const active = reminders.filter(r => r.isActive);
  for (const reminder of active) {
    const entries = getScheduleEntries(reminder);
    for (const entry of entries) {
      await scheduleOne(reminder.label, entry).catch(() => {});
    }
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  if (existing === 'denied') return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// Human-readable summary of a reminder's schedule
export function reminderSummary(reminder: Reminder): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (reminder.type === 'every_x_hours') {
    return `Every ${reminder.intervalHours}h from ${reminder.intervalStart} to ${reminder.intervalEnd}`;
  }
  if (reminder.type === 'weekly') {
    const dayNames = (reminder.daysOfWeek ?? []).map(d => days[d]).join(', ');
    return `${dayNames} at ${reminder.times[0]}`;
  }
  if (reminder.type === 'twice_daily') {
    return `Daily at ${reminder.times[0]} & ${reminder.times[1]}`;
  }
  if (reminder.type === 'thrice_daily') {
    return `Daily at ${reminder.times[0]}, ${reminder.times[1]} & ${reminder.times[2]}`;
  }
  return `Daily at ${reminder.times[0]}`;
}
