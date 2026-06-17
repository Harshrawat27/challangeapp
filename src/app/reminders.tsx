import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Notifications from 'expo-notifications';

import { Colors, Font, Radius, type Theme } from '@/constants/theme';
import {
  useReminders,
  useCreateReminder,
  useUpdateReminder,
  useRemoveReminder,
  type Reminder,
  type ReminderType,
  type ReminderInput,
} from '@/lib/convex-api';
import { rescheduleAllReminders, requestNotificationPermission, reminderSummary } from '@/lib/notifications';

// ─── Constants ───────────────────────────────────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TYPE_OPTIONS: { key: ReminderType; label: string; description: string }[] = [
  { key: 'daily',        label: 'Once daily',    description: 'One time per day' },
  { key: 'twice_daily',  label: 'Twice daily',   description: 'Two times per day' },
  { key: 'thrice_daily', label: 'Thrice daily',  description: 'Three times per day' },
  { key: 'every_x_hours',label: 'Every X hours', description: 'Interval between times' },
  { key: 'weekly',       label: 'Weekly',        description: 'Specific days of week' },
];

const INTERVAL_OPTIONS = [1, 2, 3, 4, 6, 8, 12];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function defaultTimes(type: ReminderType): string[] {
  if (type === 'twice_daily')  return ['08:00', '20:00'];
  if (type === 'thrice_daily') return ['08:00', '13:00', '20:00'];
  return ['08:00'];
}

function pad(n: number) { return n.toString().padStart(2, '0'); }

function formatTime(h: number, m: number) { return `${pad(h)}:${pad(m)}`; }

// ─── TimePicker ──────────────────────────────────────────────────────────────

function TimePicker({ value, onChange, T }: { value: string; onChange: (v: string) => void; T: Theme }) {
  const [h, m] = value.split(':').map(Number);

  const adjHour = (d: number) => onChange(formatTime((h + d + 24) % 24, m));
  const adjMin  = (d: number) => onChange(formatTime(h, (m + d + 60) % 60));

  const btnStyle = (pressed: boolean) => ({
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: pressed ? T.hairline : T.background,
    justifyContent: 'center' as const, alignItems: 'center' as const,
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {/* Hour */}
      <View style={{ alignItems: 'center', gap: 2 }}>
        <Pressable onPress={() => adjHour(1)} style={({ pressed }) => btnStyle(pressed)}>
          <Text style={{ fontFamily: Font.icon, fontSize: 16, color: T.text, lineHeight: 18 }}>expand_less</Text>
        </Pressable>
        <Text style={{ fontFamily: Font.displayBold, fontSize: 20, color: T.text, letterSpacing: -0.5, minWidth: 28, textAlign: 'center' }}>
          {pad(h)}
        </Text>
        <Pressable onPress={() => adjHour(-1)} style={({ pressed }) => btnStyle(pressed)}>
          <Text style={{ fontFamily: Font.icon, fontSize: 16, color: T.text, lineHeight: 18 }}>expand_more</Text>
        </Pressable>
      </View>
      <Text style={{ fontFamily: Font.displayBold, fontSize: 20, color: T.textDim }}>:</Text>
      {/* Minute */}
      <View style={{ alignItems: 'center', gap: 2 }}>
        <Pressable onPress={() => adjMin(5)} style={({ pressed }) => btnStyle(pressed)}>
          <Text style={{ fontFamily: Font.icon, fontSize: 16, color: T.text, lineHeight: 18 }}>expand_less</Text>
        </Pressable>
        <Text style={{ fontFamily: Font.displayBold, fontSize: 20, color: T.text, letterSpacing: -0.5, minWidth: 28, textAlign: 'center' }}>
          {pad(m)}
        </Text>
        <Pressable onPress={() => adjMin(-5)} style={({ pressed }) => btnStyle(pressed)}>
          <Text style={{ fontFamily: Font.icon, fontSize: 16, color: T.text, lineHeight: 18 }}>expand_more</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── ReminderForm ─────────────────────────────────────────────────────────────

type FormState = {
  label: string;
  type: ReminderType;
  times: string[];
  intervalHours: number;
  intervalStart: string;
  intervalEnd: string;
  daysOfWeek: number[];
};

function defaultForm(): FormState {
  return {
    label: '',
    type: 'daily',
    times: ['08:00'],
    intervalHours: 2,
    intervalStart: '08:00',
    intervalEnd: '20:00',
    daysOfWeek: [1, 2, 3, 4, 5],
  };
}

function formFromReminder(r: Reminder): FormState {
  return {
    label: r.label,
    type: r.type,
    times: r.times,
    intervalHours: r.intervalHours ?? 2,
    intervalStart: r.intervalStart ?? '08:00',
    intervalEnd: r.intervalEnd ?? '20:00',
    daysOfWeek: r.daysOfWeek ?? [1, 2, 3, 4, 5],
  };
}

function ReminderForm({
  initial,
  onSave,
  onCancel,
  saving,
  T,
  isDark,
}: {
  initial: FormState;
  onSave: (f: FormState) => void;
  onCancel: () => void;
  saving: boolean;
  T: Theme;
  isDark: boolean;
}) {
  const [form, setForm] = useState(initial);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const timesNeeded = form.type === 'twice_daily' ? 2 : form.type === 'thrice_daily' ? 3 : 1;

  const handleTypeChange = (type: ReminderType) => {
    setForm(prev => ({ ...prev, type, times: defaultTimes(type) }));
  };

  const isValid = form.label.trim().length > 0 &&
    (form.type === 'every_x_hours' || form.times.every(t => t.length === 5)) &&
    (form.type !== 'weekly' || form.daysOfWeek.length > 0);

  return (
    <View style={{ gap: 20 }}>
      {/* Label */}
      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: Font.bodyMed, fontSize: 12, letterSpacing: 1.2, color: T.textSubtle }}>
          LABEL
        </Text>
        <TextInput
          value={form.label}
          onChangeText={v => set('label', v)}
          placeholder='e.g. Drink water, Workout...'
          placeholderTextColor={T.textSubtle}
          style={{
            fontFamily: Font.bodyReg, fontSize: 15, color: T.text,
            backgroundColor: T.card, borderRadius: Radius.md,
            borderWidth: StyleSheet.hairlineWidth, borderColor: T.cardBorder,
            paddingHorizontal: 14, paddingVertical: 12,
          }}
        />
      </View>

      {/* Frequency type */}
      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: Font.bodyMed, fontSize: 12, letterSpacing: 1.2, color: T.textSubtle }}>
          FREQUENCY
        </Text>
        <View style={{ gap: 6 }}>
          {TYPE_OPTIONS.map(opt => {
            const selected = form.type === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => handleTypeChange(opt.key)}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  backgroundColor: selected ? T.invertBg : T.card,
                  borderRadius: Radius.md,
                  borderWidth: selected ? 0 : StyleSheet.hairlineWidth,
                  borderColor: T.cardBorder,
                  paddingHorizontal: 14, paddingVertical: 12,
                  opacity: pressed ? 0.8 : 1,
                })}>
                <View>
                  <Text style={{ fontFamily: Font.bodySemi, fontSize: 14, color: selected ? T.invertText : T.text }}>
                    {opt.label}
                  </Text>
                  <Text style={{ fontFamily: Font.bodyReg, fontSize: 12, color: selected ? 'rgba(255,255,255,0.6)' : T.textDim, marginTop: 1 }}>
                    {opt.description}
                  </Text>
                </View>
                {selected && (
                  <Text style={{ fontFamily: Font.icon, fontSize: 18, color: T.invertText, lineHeight: 20 }}>
                    check_circle
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Time pickers */}
      {form.type !== 'every_x_hours' && (
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: Font.bodyMed, fontSize: 12, letterSpacing: 1.2, color: T.textSubtle }}>
            {timesNeeded === 1 ? 'TIME' : 'TIMES'}
          </Text>
          <View style={{
            backgroundColor: T.card, borderRadius: Radius.md,
            borderWidth: StyleSheet.hairlineWidth, borderColor: T.cardBorder,
            padding: 16, gap: 16,
          }}>
            {Array.from({ length: timesNeeded }).map((_, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                {timesNeeded > 1 && (
                  <Text style={{ fontFamily: Font.bodyMed, fontSize: 13, color: T.textDim, width: 60 }}>
                    {i === 0 ? 'First' : i === 1 ? 'Second' : 'Third'}
                  </Text>
                )}
                <TimePicker
                  value={form.times[i] ?? '08:00'}
                  onChange={v => {
                    const next = [...form.times];
                    next[i] = v;
                    set('times', next);
                  }}
                  T={T}
                />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Interval config */}
      {form.type === 'every_x_hours' && (
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: Font.bodyMed, fontSize: 12, letterSpacing: 1.2, color: T.textSubtle }}>
            INTERVAL
          </Text>
          <View style={{
            backgroundColor: T.card, borderRadius: Radius.md,
            borderWidth: StyleSheet.hairlineWidth, borderColor: T.cardBorder,
            padding: 16, gap: 16,
          }}>
            {/* Every X hours */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: Font.bodyMed, fontSize: 13, color: T.textDim }}>Every</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {INTERVAL_OPTIONS.map(h => {
                  const sel = form.intervalHours === h;
                  return (
                    <Pressable
                      key={h}
                      onPress={() => set('intervalHours', h)}
                      style={({ pressed }) => ({
                        paddingHorizontal: 14, paddingVertical: 8,
                        borderRadius: Radius.pill,
                        backgroundColor: sel ? T.invertBg : T.background,
                        borderWidth: sel ? 0 : StyleSheet.hairlineWidth,
                        borderColor: T.cardBorder,
                        opacity: pressed ? 0.7 : 1,
                      })}>
                      <Text style={{ fontFamily: Font.bodySemi, fontSize: 13, color: sel ? T.invertText : T.text }}>
                        {h}h
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            {/* Start */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: Font.bodyMed, fontSize: 13, color: T.textDim }}>From</Text>
              <TimePicker value={form.intervalStart} onChange={v => set('intervalStart', v)} T={T} />
            </View>
            {/* End */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: Font.bodyMed, fontSize: 13, color: T.textDim }}>Until</Text>
              <TimePicker value={form.intervalEnd} onChange={v => set('intervalEnd', v)} T={T} />
            </View>
          </View>
        </View>
      )}

      {/* Day of week picker (weekly) */}
      {form.type === 'weekly' && (
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: Font.bodyMed, fontSize: 12, letterSpacing: 1.2, color: T.textSubtle }}>
            DAYS
          </Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {DAYS.map((day, i) => {
              const sel = form.daysOfWeek.includes(i);
              return (
                <Pressable
                  key={day}
                  onPress={() => {
                    const next = sel
                      ? form.daysOfWeek.filter(d => d !== i)
                      : [...form.daysOfWeek, i];
                    set('daysOfWeek', next);
                  }}
                  style={({ pressed }) => ({
                    flex: 1, paddingVertical: 10, borderRadius: Radius.md,
                    backgroundColor: sel ? T.invertBg : T.card,
                    borderWidth: sel ? 0 : StyleSheet.hairlineWidth,
                    borderColor: T.cardBorder,
                    alignItems: 'center',
                    opacity: pressed ? 0.7 : 1,
                  })}>
                  <Text style={{ fontFamily: Font.bodySemi, fontSize: 11, color: sel ? T.invertText : T.textDim }}>
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => ({
            flex: 1, height: 48, borderRadius: Radius.pill,
            backgroundColor: T.card,
            borderWidth: StyleSheet.hairlineWidth, borderColor: T.cardBorder,
            justifyContent: 'center', alignItems: 'center',
            opacity: pressed ? 0.6 : 1,
          })}>
          <Text style={{ fontFamily: Font.displaySemi, fontSize: 15, color: T.text }}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={() => isValid && onSave(form)}
          disabled={!isValid || saving}
          style={({ pressed }) => ({
            flex: 2, height: 48, borderRadius: Radius.pill,
            backgroundColor: T.invertBg,
            justifyContent: 'center', alignItems: 'center',
            opacity: (!isValid || saving) ? 0.35 : pressed ? 0.78 : 1,
          })}>
          {saving
            ? <ActivityIndicator color={T.invertText} />
            : <Text style={{ fontFamily: Font.displaySemi, fontSize: 15, color: T.invertText }}>Save reminder</Text>}
        </Pressable>
      </View>
    </View>
  );
}

// ─── Toggle ──────────────────────────────────────────────────────────────────

function Toggle({ value, onToggle, T }: { value: boolean; onToggle: () => void; T: Theme }) {
  return (
    <Pressable onPress={onToggle} hitSlop={8}>
      <View style={{
        width: 44, height: 26, borderRadius: 26,
        backgroundColor: value ? T.invertBg : T.hairline,
        padding: 2, justifyContent: 'center',
      }}>
        <View style={{
          width: 22, height: 22, borderRadius: 22,
          backgroundColor: value ? T.invertText : T.card,
          marginLeft: value ? 18 : 0,
          shadowColor: '#000', shadowOpacity: 0.15,
          shadowOffset: { width: 0, height: 1 }, shadowRadius: 2,
        }} />
      </View>
    </Pressable>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

type Mode = 'list' | 'create' | { edit: Reminder };

type PermissionStatus = 'granted' | 'denied' | 'undetermined';

async function checkPermissionStatus(): Promise<PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status as PermissionStatus;
}

export default function RemindersScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const reminders = useReminders();
  const createReminder = useCreateReminder();
  const updateReminder = useUpdateReminder();
  const removeReminder = useRemoveReminder();

  const [mode, setMode] = useState<Mode>('list');
  const [saving, setSaving] = useState(false);
  const [permStatus, setPermStatus] = useState<PermissionStatus>('undetermined');
  const appStateRef = useRef(AppState.currentState);

  // Read permission status on mount and whenever app comes back to foreground
  // (user may have toggled it in iOS Settings).
  useEffect(() => {
    checkPermissionStatus().then(setPermStatus);
    const sub = AppState.addEventListener('change', nextState => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        checkPermissionStatus().then(setPermStatus);
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, []);

  const handleNotificationToggle = useCallback(async () => {
    if (permStatus === 'granted') {
      // Can't programmatically turn off — send to Settings.
      Linking.openSettings();
    } else if (permStatus === 'undetermined') {
      // First time — show Apple's native dialog.
      const { status } = await Notifications.requestPermissionsAsync();
      setPermStatus(status as PermissionStatus);
    } else {
      // Previously denied — must go to Settings.
      Alert.alert(
        'Notifications blocked',
        'You\'ve previously declined notifications. Enable them in Settings to receive reminders.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
    }
  }, [permStatus]);

  // Reschedule whenever the reminder list changes.
  useEffect(() => {
    if (reminders) rescheduleAllReminders(reminders).catch(() => {});
  }, [reminders]);

  const toInput = (f: FormState): ReminderInput => ({
    label: f.label.trim(),
    type: f.type,
    times: f.type === 'every_x_hours' ? [] : f.times.slice(0, f.type === 'twice_daily' ? 2 : f.type === 'thrice_daily' ? 3 : 1),
    intervalHours: f.type === 'every_x_hours' ? f.intervalHours : undefined,
    intervalStart: f.type === 'every_x_hours' ? f.intervalStart : undefined,
    intervalEnd: f.type === 'every_x_hours' ? f.intervalEnd : undefined,
    daysOfWeek: f.type === 'weekly' ? f.daysOfWeek : undefined,
  });

  const handleSave = useCallback(async (form: FormState) => {
    setSaving(true);
    try {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert('Notifications blocked', 'Enable notifications in Settings to receive reminders.');
        return;
      }
      if (typeof mode === 'object' && 'edit' in mode) {
        await updateReminder({ id: mode.edit._id, ...toInput(form) });
      } else {
        await createReminder(toInput(form));
      }
      setMode('list');
    } catch {
      Alert.alert('Error', 'Could not save reminder. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [mode, createReminder, updateReminder]);

  const handleToggle = useCallback(async (reminder: Reminder) => {
    await updateReminder({ id: reminder._id, isActive: !reminder.isActive }).catch(() => {});
  }, [updateReminder]);

  const handleDelete = useCallback((reminder: Reminder) => {
    Alert.alert(
      'Delete reminder?',
      `"${reminder.label}" will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await removeReminder({ id: reminder._id }).catch(() => {});
          },
        },
      ],
    );
  }, [removeReminder]);

  const isFormMode = mode === 'create' || (typeof mode === 'object' && 'edit' in mode);
  const formInitial = typeof mode === 'object' && 'edit' in mode
    ? formFromReminder(mode.edit)
    : defaultForm();

  return (
    <View style={{ flex: 1, backgroundColor: T.background, alignItems: 'center' }}>
      <SafeAreaView style={{ flex: 1, width: '100%', maxWidth: 480 }} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8,
        }}>
          <Pressable onPress={() => isFormMode ? setMode('list') : router.back()} hitSlop={12}
            style={({ pressed }) => ({
              width: 36, height: 36, borderRadius: 36,
              borderWidth: StyleSheet.hairlineWidth, borderColor: T.cardBorder,
              backgroundColor: T.card,
              justifyContent: 'center', alignItems: 'center',
              opacity: pressed ? 0.5 : 1,
            })}>
            <Text style={{ fontFamily: Font.icon, fontSize: 18, color: T.text, lineHeight: 20 }}>
              arrow_back
            </Text>
          </Pressable>
          {!isFormMode && (
            <Pressable
              onPress={() => setMode('create')}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: T.invertBg, borderRadius: Radius.pill,
                paddingHorizontal: 14, paddingVertical: 8,
                opacity: pressed ? 0.7 : 1,
              })}>
              <Text style={{ fontFamily: Font.icon, fontSize: 16, color: T.invertText, lineHeight: 18 }}>add</Text>
              <Text style={{ fontFamily: Font.bodySemi, fontSize: 13, color: T.invertText }}>New</Text>
            </Pressable>
          )}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>

          {/* Page title */}
          <Animated.View entering={FadeIn.duration(400)}>
            <Text style={{ fontFamily: Font.bodyMed, fontSize: 11, letterSpacing: 3, color: T.textDim, marginTop: 8 }}>
              NOTIFICATIONS
            </Text>
            <Text style={{
              fontFamily: Font.displayBlack, fontSize: 36, color: T.text,
              letterSpacing: -1.2, lineHeight: 40, marginTop: 6, marginBottom: 24,
            }}>
              {isFormMode
                ? (typeof mode === 'object' && 'edit' in mode ? 'Edit reminder' : 'New reminder')
                : 'Reminders.'}
            </Text>
          </Animated.View>

          {/* Notification permission banner */}
          {permStatus !== 'granted' && (
            <Animated.View entering={FadeInDown.duration(380)} style={{
              backgroundColor: isDark ? '#1C1C1E' : '#FFF9EC',
              borderRadius: Radius.lg,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: isDark ? '#3A3A1E' : '#F0D080',
              padding: 14,
              marginBottom: 20,
              gap: 10,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <Text style={{ fontFamily: Font.icon, fontSize: 20, color: '#F59E0B', lineHeight: 22 }}>
                  notifications_off
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: Font.displaySemi, fontSize: 14, color: T.text, letterSpacing: -0.2 }}>
                    {permStatus === 'undetermined' ? 'Allow notifications' : 'Notifications are off'}
                  </Text>
                  <Text style={{ fontFamily: Font.bodyReg, fontSize: 12.5, color: T.textDim, marginTop: 3, lineHeight: 17 }}>
                    {permStatus === 'undetermined'
                      ? 'Enable notifications so your reminders actually reach you.'
                      : 'Your reminders won\'t fire. Tap to turn them on in Settings.'}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={handleNotificationToggle}
                style={({ pressed }) => ({
                  backgroundColor: '#F59E0B',
                  borderRadius: Radius.pill,
                  paddingVertical: 10,
                  alignItems: 'center',
                  opacity: pressed ? 0.75 : 1,
                })}>
                <Text style={{ fontFamily: Font.displaySemi, fontSize: 13, color: '#fff', letterSpacing: -0.1 }}>
                  {permStatus === 'undetermined' ? 'Enable notifications' : 'Open Settings'}
                </Text>
              </Pressable>
            </Animated.View>
          )}

          {/* Form */}
          {isFormMode && (
            <Animated.View entering={FadeInDown.delay(80).duration(400)}>
              <ReminderForm
                initial={formInitial}
                onSave={handleSave}
                onCancel={() => setMode('list')}
                saving={saving}
                T={T}
                isDark={isDark}
              />
            </Animated.View>
          )}

          {/* List */}
          {!isFormMode && (
            <Animated.View entering={FadeInDown.delay(80).duration(400)} style={{ gap: 10 }}>
              {reminders === undefined && (
                <ActivityIndicator color={T.text} style={{ marginTop: 40 }} />
              )}

              {reminders?.length === 0 && (
                <View style={{
                  backgroundColor: T.card, borderRadius: Radius.lg,
                  borderWidth: StyleSheet.hairlineWidth, borderColor: T.cardBorder,
                  padding: 24, alignItems: 'center', gap: 8,
                }}>
                  <Text style={{ fontFamily: Font.icon, fontSize: 32, color: T.textDim, lineHeight: 36 }}>
                    notifications_none
                  </Text>
                  <Text style={{ fontFamily: Font.displaySemi, fontSize: 15, color: T.text }}>
                    No reminders yet
                  </Text>
                  <Text style={{ fontFamily: Font.bodyReg, fontSize: 13, color: T.textDim, textAlign: 'center' }}>
                    Tap "New" to create your first reminder.
                  </Text>
                </View>
              )}

              {reminders?.map((r, i) => (
                <Animated.View
                  key={r._id}
                  entering={FadeInDown.delay(i * 60).duration(380)}
                  style={{
                    backgroundColor: T.card, borderRadius: Radius.lg,
                    borderWidth: StyleSheet.hairlineWidth, borderColor: T.cardBorder,
                    overflow: 'hidden',
                  }}>
                  {/* Main row */}
                  <Pressable
                    onPress={() => setMode({ edit: r })}
                    style={({ pressed }) => ({
                      flexDirection: 'row', alignItems: 'center',
                      padding: 14, gap: 12,
                      opacity: pressed ? 0.7 : 1,
                    })}>
                    <View style={{
                      width: 40, height: 40, borderRadius: 12,
                      backgroundColor: r.isActive ? T.invertBg : T.hairline,
                      justifyContent: 'center', alignItems: 'center',
                    }}>
                      <Text style={{ fontFamily: Font.icon, fontSize: 20, color: r.isActive ? T.invertText : T.textDim, lineHeight: 22 }}>
                        alarm
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: Font.displaySemi, fontSize: 15, color: T.text, letterSpacing: -0.2 }}>
                        {r.label}
                      </Text>
                      <Text style={{ fontFamily: Font.bodyReg, fontSize: 12, color: T.textDim, marginTop: 2 }}>
                        {reminderSummary(r)}
                      </Text>
                    </View>
                    <Toggle value={r.isActive} onToggle={() => handleToggle(r)} T={T} />
                  </Pressable>

                  {/* Delete strip */}
                  <Pressable
                    onPress={() => handleDelete(r)}
                    style={({ pressed }) => ({
                      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.hairline,
                      paddingVertical: 10, alignItems: 'center',
                      opacity: pressed ? 0.5 : 1,
                    })}>
                    <Text style={{ fontFamily: Font.bodyMed, fontSize: 12, color: '#DC2626', letterSpacing: -0.1 }}>
                      Delete
                    </Text>
                  </Pressable>
                </Animated.View>
              ))}
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
