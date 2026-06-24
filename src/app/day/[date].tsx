import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { useCachedPreferences, useDay, useMealsForDay, useNoteForDay } from '@/lib/convex-api';
import { buildTasks, localDateString } from '@/lib/tasks';
import { DayStrip } from '@/components/day-strip';
import { Colors, Font, MaxContentWidth, Radius, type Theme } from '@/constants/theme';

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatLongDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// ─── Row ────────────────────────────────────────────────────────────────────

function TaskRow({
  index,
  label,
  meta,
  icon,
  doneAt,           // ISO timestamp or null
  tapCount,
  required,
  isLast,
  T,
}: {
  index: number;
  label: string;
  meta: string;
  icon: string;
  doneAt: string | null;
  tapCount: number;
  required: number;
  isLast: boolean;
  T: Theme;
}) {
  const done = !!doneAt;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        gap: 14,
        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: T.hairline,
        opacity: done ? 1 : 0.55,
      }}>
      {/* Icon tile */}
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: T.cardBorder,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <Text
          style={{
            fontFamily: Font.icon,
            fontSize: 22,
            color: T.text,
            lineHeight: 24,
          }}>
          {icon}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        {/* alignSelf:'flex-start' shrinks wrapper to text width so line doesn't span full row */}
        <View style={{ alignSelf: 'flex-start' }}>
          <Text style={{
            fontFamily: Font.displaySemi,
            fontSize: 15,
            color: T.text,
            letterSpacing: -0.2,
          }}>
            {label}
          </Text>
          {done && (
            <View
              pointerEvents='none'
              style={{
                position: 'absolute',
                top: 0, bottom: 0, left: 0, right: 0,
                justifyContent: 'center',
              }}>
              <View style={{ height: 1, backgroundColor: T.text }} />
            </View>
          )}
        </View>
        <Text
          style={{
            fontFamily: Font.bodyReg,
            fontSize: 12.5,
            color: T.textDim,
            marginTop: 2,
            letterSpacing: -0.05,
          }}>
          {done
            ? required > 1
              ? `${required}/${required} · ${formatTime(doneAt!)}`
              : `Completed at ${formatTime(doneAt!)}`
            : required > 1
              ? `${tapCount}/${required} · missed`
              : meta + ' · missed'}
        </Text>
      </View>

      {/* Status indicator (no tap target — past days are read-only) */}
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 24,
          backgroundColor: done ? T.invertBg : 'transparent',
          borderWidth: done ? 0 : 1.5,
          borderColor: T.cardBorder,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        {done && (
          <Text style={{
            fontFamily: Font.icon,
            fontSize: 14,
            color: T.invertText,
            lineHeight: 16,
          }}>
            check
          </Text>
        )}
      </View>

      <Text
        style={{
          fontFamily: Font.bodyMed,
          fontSize: 10,
          letterSpacing: 1.2,
          color: T.textSubtle,
          marginLeft: 4,
        }}>
        {String(index + 1).padStart(2, '0')}
      </Text>
    </View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  // Guard: if the URL is today's date, redirect home (today is editable there)
  const today = localDateString();
  if (date === today) {
    router.replace('/');
    return null;
  }

  const log = useDay(date ?? '');
  const meals = useMealsForDay(date ?? '');
  const dayNote = useNoteForDay(date ?? '');
  const prefs = useCachedPreferences();

  const dateObj = useMemo(() => (date ? parseISODate(date) : new Date()), [date]);

  // ── Day strip props ──────────────────────────────────────────────────────
  const todayObj = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const challengeStart = useMemo(
    () => (prefs?.challengeStartDate ? parseISODate(prefs.challengeStartDate) : null),
    [prefs?.challengeStartDate],
  );
  const totalDays = prefs?.challengeLength ?? 75;
  const selectedIdx = useMemo(() => {
    if (!challengeStart) return 0;
    return Math.max(0, Math.floor((+dateObj - +challengeStart) / 86_400_000));
  }, [dateObj, challengeStart]);

  const handleDaySelect = (idx: number) => {
    if (!challengeStart) return;
    const target = new Date(challengeStart);
    target.setDate(challengeStart.getDate() + idx);
    const targetStr = localDateString(target);
    if (targetStr === date) return;        // tapped current day — no-op
    if (targetStr === today) {
      router.replace('/');                 // today lives at home
      return;
    }
    // Past day → update the URL param IN PLACE so the screen does NOT remount.
    // Only the bits that read `date` (useDay, dateObj, selectedIdx, rows) re-render.
    // The DayStrip stays mounted, preserving its scroll position and avoiding the
    // "page refresh" flash that router.push/replace would cause.
    router.setParams({ date: targetStr });
  };

  // Build the task list: prefer the day's frozen snapshot (allTaskIds), but
  // pull labels/icons from the current challenge defs. If a saved task ID
  // is no longer in the current challenge (challenge changed), it shows as a
  // generic custom task.
  const currentTaskList = useMemo(
    () => buildTasks(prefs?.challenge, prefs?.customHabits),
    [prefs?.challenge, prefs?.customHabits],
  );
  const lookup = useMemo(() => {
    const m = new Map(currentTaskList.map(t => [t.id, t]));
    return m;
  }, [currentTaskList]);

  const rows = useMemo(() => {
    if (!log) return [];
    return log.allTaskIds.map((id) => {
      const def = lookup.get(id);
      const required = log.taskCounts?.[id] ?? 1;
      const taps = log.completions[id] ?? [];
      const tapCount = Array.isArray(taps) ? taps.length : 0;
      const isDone = tapCount >= required;
      return {
        id,
        label: def?.label ?? 'Task',
        meta: def?.meta ?? '',
        icon: def?.icon ?? 'task_alt',
        doneAt: isDone ? (taps[taps.length - 1] ?? null) : null,
        tapCount,
        required,
      };
    });
  }, [log, lookup]);

  const completedCount = rows.filter(r => r.doneAt).length;
  const totalCount = rows.length;
  const status: 'completed' | 'missed' | 'untouched' =
    log == null || totalCount === 0
      ? 'untouched'
      : completedCount === totalCount
        ? 'completed'
        : 'missed';

  return (
    <View style={{ flex: 1, backgroundColor: T.background, alignItems: 'center' }}>
      <SafeAreaView style={{ flex: 1, width: '100%', maxWidth: MaxContentWidth }} edges={['top']}>

        {/* Header w/ back + journal */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 8,
        }}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            hitSlop={12}
            style={({ pressed }) => ({
              width: 36, height: 36,
              borderRadius: 36,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: T.cardBorder,
              backgroundColor: T.card,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: pressed ? 0.55 : 1,
            })}>
            <Text style={{ fontFamily: Font.icon, fontSize: 18, color: T.text, lineHeight: 20 }}>
              arrow_back
            </Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => router.push(`/note/${date}`)}
            hitSlop={12}
            style={({ pressed }) => ({
              width: 36, height: 36,
              borderRadius: 36,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: dayNote?.note ? T.text : T.cardBorder,
              backgroundColor: dayNote?.note ? T.invertBg : T.card,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: pressed ? 0.55 : 1,
            })}>
            <Text style={{
              fontFamily: Font.icon,
              fontSize: 17,
              lineHeight: 17,
              color: dayNote?.note ? T.invertText : T.text,
              includeFontPadding: false,
              textAlignVertical: 'center',
            }}>
              edit_note
            </Text>
          </Pressable>
        </View>

        {/* Day strip (pinned — lets the user hop between days without going back home) */}
        {challengeStart && (
          <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
            <DayStrip
              todayDate={todayObj}
              challengeStart={challengeStart}
              totalDays={totalDays}
              ink={T.text}
              invertBg={T.invertBg}
              invertText={T.invertText}
              cardBg={T.card}
              cardBorder={T.cardBorder}
              dim={T.textDim}
              edgePadding={20}
              selectedIdx={selectedIdx}
              onSelect={handleDaySelect}
            />
          </View>
        )}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 140 }}>

          {/* Title */}
          <Animated.View entering={FadeIn.duration(400)}>
            <Text style={{
              fontFamily: Font.bodyMed, fontSize: 11, letterSpacing: 2.4, color: T.textDim,
            }}>
              {log ? `DAY ${log.challengeDay}` : 'NO ACTIVITY'}
            </Text>
            <Text style={{
              fontFamily: Font.displayBlack,
              fontSize: 38,
              color: T.text,
              letterSpacing: -1.4,
              lineHeight: 42,
              marginTop: 6,
            }}>
              {formatLongDate(dateObj)}
            </Text>
          </Animated.View>

          {/* Status pill */}
          <Animated.View
            entering={FadeInDown.delay(80).duration(440)}
            style={{ marginTop: 18, flexDirection: 'row' }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: Radius.pill,
              backgroundColor: status === 'completed' ? T.invertBg : T.card,
              borderWidth: status === 'completed' ? 0 : StyleSheet.hairlineWidth,
              borderColor: T.cardBorder,
            }}>
              <Text style={{
                fontFamily: Font.icon,
                fontSize: 16,
                lineHeight: 18,
                color: status === 'completed' ? T.invertText : T.textDim,
              }}>
                {status === 'completed' ? 'check_circle' : status === 'missed' ? 'warning' : 'help'}
              </Text>
              <Text style={{
                fontFamily: Font.displaySemi,
                fontSize: 13,
                letterSpacing: -0.1,
                color: status === 'completed' ? T.invertText : T.text,
              }}>
                {status === 'completed'
                  ? 'Completed'
                  : status === 'missed'
                    ? `${completedCount}/${totalCount} done`
                    : 'No activity'}
              </Text>
            </View>
          </Animated.View>

          {/* Loading state */}
          {log === undefined && (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <ActivityIndicator color={T.text} />
            </View>
          )}

          {/* No row exists — untouched day */}
          {log === null && (
            <View style={{ marginTop: 40 }}>
              <View style={{
                backgroundColor: T.card,
                borderRadius: Radius.lg,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: T.cardBorder,
                padding: 20,
              }}>
                <Text style={{
                  fontFamily: Font.displaySemi,
                  fontSize: 15,
                  color: T.text,
                  letterSpacing: -0.2,
                  marginBottom: 6,
                }}>
                  Nothing logged on this day
                </Text>
                <Text style={{
                  fontFamily: Font.bodyReg,
                  fontSize: 13.5,
                  color: T.textDim,
                  lineHeight: 19,
                }}>
                  Past days are read-only. If you missed a check-in, the day stays missed —
                  that&apos;s the point.
                </Text>
              </View>
            </View>
          )}

          {/* Task rows */}
          {log && rows.length > 0 && (
            <Animated.View
              entering={FadeInDown.delay(140).duration(460)}
              style={{
                marginTop: 28,
                backgroundColor: T.card,
                borderRadius: Radius.lg,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: T.cardBorder,
                paddingHorizontal: 16,
                paddingVertical: 4,
              }}>
              {rows.map((r, i) => (
                <TaskRow
                  key={r.id}
                  index={i}
                  label={r.label}
                  meta={r.meta}
                  icon={r.icon}
                  doneAt={r.doneAt}
                  tapCount={r.tapCount}
                  required={r.required}
                  isLast={i === rows.length - 1}
                  T={T}
                />
              ))}
            </Animated.View>
          )}

          {/* Footer */}
          {log && rows.length > 0 && (
            <Animated.View entering={FadeIn.delay(320).duration(400)} style={{ marginTop: 20 }}>
              <Text style={{
                fontFamily: Font.bodyReg,
                fontSize: 12.5,
                color: T.textSubtle,
                textAlign: 'center',
                letterSpacing: -0.05,
              }}>
                Past days can&apos;t be edited.
              </Text>
            </Animated.View>
          )}

          {/* Meals */}
          {meals && meals.length > 0 && (() => {
            const totalCal = meals.reduce((s, m) => s + m.calories, 0);
            const totalP   = meals.reduce((s, m) => s + m.protein, 0);
            const totalC   = meals.reduce((s, m) => s + m.carbs, 0);
            const totalF   = meals.reduce((s, m) => s + m.fat, 0);
            return (
              <Animated.View entering={FadeInDown.delay(200).duration(460)} style={{ marginTop: 28 }}>
                {/* Section header */}
                <View style={{
                  flexDirection: 'row', justifyContent: 'space-between',
                  alignItems: 'baseline', marginBottom: 12,
                }}>
                  <Text style={{
                    fontFamily: Font.displayBold, fontSize: 18,
                    color: T.text, letterSpacing: -0.4,
                  }}>
                    Meals
                  </Text>
                  <Text style={{ fontFamily: Font.bodySemi, fontSize: 13, color: T.textDim }}>
                    {meals.length} {meals.length === 1 ? 'meal' : 'meals'}
                  </Text>
                </View>

                {/* Totals card */}
                <View style={{
                  backgroundColor: T.invertBg,
                  borderRadius: Radius.lg,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 10,
                }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontFamily: Font.bodyMed, fontSize: 10,
                      color: T.invertText, opacity: 0.5, letterSpacing: 1.4,
                    }}>
                      TOTAL
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                      <Text style={{
                        fontFamily: Font.displayBlack, fontSize: 32,
                        color: T.invertText, letterSpacing: -0.8,
                      }}>
                        {totalCal}
                      </Text>
                      <Text style={{ fontFamily: Font.bodyMed, fontSize: 13, color: T.invertText, opacity: 0.55 }}>
                        kcal
                      </Text>
                    </View>
                  </View>
                  <View style={{ gap: 6, alignItems: 'flex-end' }}>
                    {([['Protein', totalP], ['Carbs', totalC], ['Fat', totalF]] as [string, number][]).map(([label, val]) => (
                      <View key={label} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <Text style={{ fontFamily: Font.bodyMed, fontSize: 11, color: T.invertText, opacity: 0.5, width: 42, textAlign: 'right' }}>
                          {label}
                        </Text>
                        <Text style={{ fontFamily: Font.displaySemi, fontSize: 15, color: T.invertText, minWidth: 44, textAlign: 'right', letterSpacing: -0.3 }}>
                          {val}g
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Individual meals */}
                <View style={{
                  backgroundColor: T.card,
                  borderRadius: Radius.lg,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: T.cardBorder,
                  overflow: 'hidden',
                }}>
                  {meals.map((meal, i) => (
                    <View
                      key={meal._id}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        borderBottomWidth: i === meals.length - 1 ? 0 : StyleSheet.hairlineWidth,
                        borderBottomColor: T.hairline,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                      }}>
                      <Text style={{
                        fontFamily: Font.icon, fontSize: 20, lineHeight: 22,
                        color: '#FB923C', includeFontPadding: false,
                      }}>
                        local_fire_department
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontFamily: Font.displaySemi, fontSize: 15,
                          color: T.text, letterSpacing: -0.2,
                        }}>
                          {meal.name}
                        </Text>
                        <Text style={{
                          fontFamily: Font.bodyReg, fontSize: 12,
                          color: T.textDim, marginTop: 2,
                        }}>
                          P {meal.protein}g · C {meal.carbs}g · F {meal.fat}g
                        </Text>
                      </View>
                      <Text style={{
                        fontFamily: Font.displayBold, fontSize: 15,
                        color: T.text, letterSpacing: -0.3,
                      }}>
                        {meal.calories}
                        <Text style={{ fontFamily: Font.bodyReg, fontSize: 11, color: T.textDim }}> kcal</Text>
                      </Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            );
          })()}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
