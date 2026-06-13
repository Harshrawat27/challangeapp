import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { useDayRange, useMyPreferences, type DailyLog } from '@/lib/convex-api';
import { buildTasks, localDateString } from '@/lib/tasks';
import { Colors, Font, MaxContentWidth, Radius, type Theme } from '@/constants/theme';

// ─── Date utils ─────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(d.getDate() + n);
  return x;
}
function diffDays(later: Date, earlier: Date): number {
  return Math.floor((+later - +earlier) / MS_PER_DAY);
}

// ─── Heatmap cell shade ─────────────────────────────────────────────────────
// 6 shades of ink. ratio in [0,1] maps to opacity.
const SHADE_OPACITIES = [0.0, 0.14, 0.28, 0.45, 0.62, 0.80, 1.0];
function shadeColor(ratio: number, isDark: boolean): string {
  if (ratio <= 0) return 'transparent';
  const step = Math.min(6, Math.max(1, Math.round(ratio * 6)));
  const op = SHADE_OPACITIES[step];
  return isDark ? `rgba(250,250,250,${op})` : `rgba(10,10,10,${op})`;
}

// ─── Stats computation ─────────────────────────────────────────────────────

type ChallengeStats = {
  pastDays: number;            // days from start through YESTERDAY
  fullyCompleted: number;
  completedTotal: number;
  expectedTotal: number;
  completionPct: number;
  streak: number;
  perTask: Map<string, { done: number; expected: number }>;
};

function computeStats(
  logs: DailyLog[],
  challengeStart: Date,
  today: Date,
  expectedCountIfUnlogged: number,
): ChallengeStats {
  const byDate = new Map(logs.map((l) => [l.date, l]));
  const pastDays = Math.max(0, diffDays(today, challengeStart));

  let completedTotal = 0;
  let expectedTotal = 0;
  let fullyCompleted = 0;
  const perTask = new Map<string, { done: number; expected: number }>();

  for (let i = 0; i < pastDays; i++) {
    const d = addDays(challengeStart, i);
    const log = byDate.get(localDateString(d));
    if (log) {
      const completedCount = Object.keys(log.completions).length;
      completedTotal += completedCount;
      expectedTotal += log.allTaskIds.length;
      if (log.allTaskIds.length > 0 && completedCount === log.allTaskIds.length) {
        fullyCompleted++;
      }
      for (const id of log.allTaskIds) {
        const row = perTask.get(id) ?? { done: 0, expected: 0 };
        row.expected++;
        if (id in log.completions) row.done++;
        perTask.set(id, row);
      }
    } else {
      // Missed day with no log — penalize for the current expected task count.
      expectedTotal += expectedCountIfUnlogged;
    }
  }

  // Streak: walk backwards from yesterday.
  let streak = 0;
  for (let i = pastDays - 1; i >= 0; i--) {
    const d = addDays(challengeStart, i);
    const log = byDate.get(localDateString(d));
    if (
      log &&
      log.allTaskIds.length > 0 &&
      Object.keys(log.completions).length === log.allTaskIds.length
    ) {
      streak++;
    } else {
      break;
    }
  }

  const completionPct = expectedTotal === 0 ? 0 : Math.round((completedTotal / expectedTotal) * 100);

  return {
    pastDays,
    fullyCompleted,
    completedTotal,
    expectedTotal,
    completionPct,
    streak,
    perTask,
  };
}

// ─── UI atoms ───────────────────────────────────────────────────────────────

function SectionLabel({ children, T }: { children: string; T: Theme }) {
  return (
    <Text style={{
      fontFamily: Font.bodyMed,
      fontSize: 11,
      letterSpacing: 1.8,
      color: T.textSubtle,
      marginLeft: 4,
      marginBottom: 8,
    }}>
      {children.toUpperCase()}
    </Text>
  );
}

function StatTile({
  label, value, hint, T,
}: { label: string; value: string; hint?: string; T: Theme }) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: T.card,
      borderRadius: Radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: T.cardBorder,
      padding: 16,
      gap: 6,
    }}>
      <Text style={{
        fontFamily: Font.bodyMed,
        fontSize: 10,
        letterSpacing: 1.6,
        color: T.textSubtle,
      }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{
        fontFamily: Font.displayBlack,
        fontSize: 32,
        color: T.text,
        letterSpacing: -1,
        lineHeight: 36,
      }}>
        {value}
      </Text>
      {hint && (
        <Text style={{
          fontFamily: Font.bodyReg,
          fontSize: 12,
          color: T.textDim,
          letterSpacing: -0.05,
        }}>
          {hint}
        </Text>
      )}
    </View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];
  const { width: screenW } = useWindowDimensions();

  const prefs = useMyPreferences();
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const challengeStart = useMemo(() => {
    if (prefs?.challengeStartDate) return parseDate(prefs.challengeStartDate);
    return today;
  }, [prefs?.challengeStartDate, today]);

  const challengeLength = prefs?.challengeLength ?? 75;
  const challengeEnd = useMemo(() => addDays(challengeStart, challengeLength - 1), [challengeStart, challengeLength]);

  // Pull all logs for the challenge window.
  const fromStr = useMemo(() => localDateString(challengeStart), [challengeStart]);
  const toStr = useMemo(() => localDateString(challengeEnd), [challengeEnd]);
  const logs = useDayRange(fromStr, toStr);

  // Current task list (used for "what's expected today" + labels in by-task chart).
  const currentTasks = useMemo(
    () => buildTasks(prefs?.challenge, prefs?.customHabits),
    [prefs?.challenge, prefs?.customHabits],
  );

  // Compute stats.
  const stats = useMemo(
    () => computeStats(logs ?? [], challengeStart, today, currentTasks.length || 1),
    [logs, challengeStart, today, currentTasks.length],
  );

  // Current day number (1..N).
  const currentDay = Math.max(1, Math.min(diffDays(today, challengeStart) + 1, challengeLength));

  // ── Heatmap layout
  const HPAD = 20;
  const containerW = Math.min(screenW, MaxContentWidth) - HPAD * 2;
  const HEATMAP_COLS = 15;
  const HEATMAP_GAP = 4;
  const cellSize = (containerW - HEATMAP_GAP * (HEATMAP_COLS - 1)) / HEATMAP_COLS;

  // Pre-index logs for O(1) lookups.
  const logByDate = useMemo(() => {
    const m = new Map<string, DailyLog>();
    for (const l of logs ?? []) m.set(l.date, l);
    return m;
  }, [logs]);

  // Recent days (history) — past days only, sorted desc, top 10.
  const recentDays = useMemo(() => {
    const list = (logs ?? [])
      .filter((l) => parseDate(l.date) < today)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    return list.slice(0, 10);
  }, [logs, today]);

  return (
    <View style={{ flex: 1, backgroundColor: T.background, alignItems: 'center' }}>
      <SafeAreaView style={{ flex: 1, width: '100%', maxWidth: MaxContentWidth }} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: HPAD, paddingTop: 8, paddingBottom: 140 }}>

          {/* Header */}
          <Animated.View entering={FadeIn.duration(400)} style={{ marginTop: 12 }}>
            <Text style={{
              fontFamily: Font.bodyMed,
              fontSize: 11,
              letterSpacing: 3,
              color: T.textDim,
            }}>
              75 / HARD
            </Text>
            <Text style={{
              fontFamily: Font.displayBlack,
              fontSize: 38,
              color: T.text,
              letterSpacing: -1.4,
              lineHeight: 42,
              marginTop: 6,
            }}>
              Progress.
            </Text>
            <Text style={{
              fontFamily: Font.bodyReg,
              fontSize: 14,
              color: T.textDim,
              marginTop: 6,
              letterSpacing: -0.05,
            }}>
              Every checkmark tells a story.
            </Text>
          </Animated.View>

          {/* ─── Stat tiles ─────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(100).duration(420)} style={{ marginTop: 28, gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <StatTile
                label='Day'
                value={`${currentDay}`}
                hint={`of ${challengeLength}`}
                T={T}
              />
              <StatTile
                label='On Track'
                value={`${stats.completionPct}%`}
                hint='past days'
                T={T}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <StatTile
                label='Streak'
                value={`${stats.streak}d`}
                hint={stats.streak === 1 ? 'day' : 'consecutive'}
                T={T}
              />
              <StatTile
                label='Tasks Done'
                value={`${stats.completedTotal}`}
                hint={`of ${stats.expectedTotal}`}
                T={T}
              />
            </View>
          </Animated.View>

          {/* ─── Heatmap ────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(200).duration(440)} style={{ marginTop: 36 }}>
            <SectionLabel T={T}>Heatmap</SectionLabel>
            <View style={{
              backgroundColor: T.card,
              borderRadius: Radius.lg,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: T.cardBorder,
              padding: 16,
            }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: HEATMAP_GAP }}>
                {Array.from({ length: challengeLength }).map((_, i) => {
                  const cellDate = addDays(challengeStart, i);
                  const cellDateStr = localDateString(cellDate);
                  const log = logByDate.get(cellDateStr);
                  const isToday = +cellDate === +today;
                  const isFuture = +cellDate > +today;
                  const completedCount = log ? Object.keys(log.completions).length : 0;
                  const expected = log?.allTaskIds.length ?? currentTasks.length;
                  const ratio = expected > 0 ? completedCount / expected : 0;

                  const onPress = () => {
                    if (isFuture) return;
                    if (isToday) {
                      router.push('/');
                      return;
                    }
                    router.push(`/day/${cellDateStr}`);
                  };

                  return (
                    <Pressable
                      key={i}
                      onPress={onPress}
                      disabled={isFuture}
                      style={({ pressed }) => ({
                        width: cellSize,
                        height: cellSize,
                        borderRadius: 3,
                        backgroundColor: isFuture
                          ? 'transparent'
                          : shadeColor(ratio, isDark),
                        borderWidth: ratio === 0 || isFuture ? StyleSheet.hairlineWidth : 0,
                        borderColor: T.cardBorder,
                        opacity: pressed && !isFuture ? 0.6 : 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                      })}>
                      {isToday && (
                        <View style={{
                          width: cellSize - 6,
                          height: cellSize - 6,
                          borderRadius: 2,
                          borderWidth: 1.5,
                          borderColor: T.text,
                          backgroundColor: 'transparent',
                        }} />
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* Legend */}
              <View style={{
                marginTop: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <Text style={{
                  fontFamily: Font.bodyMed,
                  fontSize: 10,
                  letterSpacing: 1.4,
                  color: T.textSubtle,
                }}>
                  LESS
                </Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {[0, 1, 2, 3, 4, 5, 6].map((step) => (
                    <View
                      key={step}
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 2,
                        backgroundColor: step === 0
                          ? 'transparent'
                          : isDark
                            ? `rgba(250,250,250,${SHADE_OPACITIES[step]})`
                            : `rgba(10,10,10,${SHADE_OPACITIES[step]})`,
                        borderWidth: step === 0 ? StyleSheet.hairlineWidth : 0,
                        borderColor: T.cardBorder,
                      }}
                    />
                  ))}
                </View>
                <Text style={{
                  fontFamily: Font.bodyMed,
                  fontSize: 10,
                  letterSpacing: 1.4,
                  color: T.textSubtle,
                }}>
                  MORE
                </Text>
              </View>
            </View>
            <Text style={{
              fontFamily: Font.bodyReg,
              fontSize: 12,
              color: T.textDim,
              marginTop: 10,
              marginLeft: 4,
              letterSpacing: -0.05,
            }}>
              Each square is a day · Darker = more tasks done · Tap a past day to see details
            </Text>
          </Animated.View>

          {/* ─── By task ────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(300).duration(440)} style={{ marginTop: 36 }}>
            <SectionLabel T={T}>By Task</SectionLabel>
            <View style={{
              backgroundColor: T.card,
              borderRadius: Radius.lg,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: T.cardBorder,
              paddingHorizontal: 16,
              paddingVertical: 6,
            }}>
              {currentTasks.length === 0 && (
                <View style={{ paddingVertical: 18 }}>
                  <Text style={{
                    fontFamily: Font.bodyReg,
                    fontSize: 13,
                    color: T.textDim,
                    textAlign: 'center',
                    letterSpacing: -0.05,
                  }}>
                    No tasks yet — pick a challenge first.
                  </Text>
                </View>
              )}
              {currentTasks.map((task, i) => {
                const entry = stats.perTask.get(task.id);
                const expected = entry?.expected ?? 0;
                const done = entry?.done ?? 0;
                const pct = expected === 0 ? 0 : (done / expected) * 100;
                const isLast = i === currentTasks.length - 1;
                return (
                  <View
                    key={task.id}
                    style={{
                      paddingVertical: 14,
                      borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                      borderBottomColor: T.hairline,
                      gap: 8,
                    }}>
                    {/* Top row: icon + label + percent */}
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}>
                      <Text style={{
                        fontFamily: Font.icon,
                        fontSize: 18,
                        color: T.text,
                        lineHeight: 20,
                      }}>
                        {task.icon}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={{
                          flex: 1,
                          fontFamily: Font.displaySemi,
                          fontSize: 14,
                          color: T.text,
                          letterSpacing: -0.2,
                        }}>
                        {task.label}
                      </Text>
                      <Text style={{
                        fontFamily: Font.bodyMed,
                        fontSize: 13,
                        color: expected === 0 ? T.textSubtle : T.text,
                        letterSpacing: -0.1,
                        minWidth: 38,
                        textAlign: 'right',
                      }}>
                        {expected === 0 ? '—' : `${Math.round(pct)}%`}
                      </Text>
                    </View>
                    {/* Bar */}
                    <View style={{
                      height: 6,
                      borderRadius: 6,
                      backgroundColor: T.hairline,
                      overflow: 'hidden',
                    }}>
                      <View style={{
                        width: `${pct}%`,
                        height: '100%',
                        backgroundColor: T.text,
                        borderRadius: 6,
                      }} />
                    </View>
                    {/* Subtext */}
                    {expected > 0 && (
                      <Text style={{
                        fontFamily: Font.bodyReg,
                        fontSize: 11,
                        color: T.textDim,
                        letterSpacing: 0.1,
                      }}>
                        {done} / {expected} days
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </Animated.View>

          {/* ─── History ────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(400).duration(440)} style={{ marginTop: 36 }}>
            <SectionLabel T={T}>History</SectionLabel>
            {recentDays.length === 0 ? (
              <View style={{
                backgroundColor: T.card,
                borderRadius: Radius.lg,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: T.cardBorder,
                padding: 18,
              }}>
                <Text style={{
                  fontFamily: Font.displaySemi,
                  fontSize: 14,
                  color: T.text,
                  letterSpacing: -0.2,
                  marginBottom: 4,
                }}>
                  Nothing yet
                </Text>
                <Text style={{
                  fontFamily: Font.bodyReg,
                  fontSize: 13,
                  color: T.textDim,
                  lineHeight: 19,
                  letterSpacing: -0.05,
                }}>
                  As you check off tasks each day, your completed days will appear here.
                </Text>
              </View>
            ) : (
              <View style={{
                backgroundColor: T.card,
                borderRadius: Radius.lg,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: T.cardBorder,
                paddingHorizontal: 16,
                paddingVertical: 4,
              }}>
                {recentDays.map((log, i) => {
                  const dayDate = parseDate(log.date);
                  const completed = Object.keys(log.completions).length;
                  const expected = log.allTaskIds.length;
                  const isComplete = expected > 0 && completed === expected;
                  const dateStr = dayDate.toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  });
                  const isLast = i === recentDays.length - 1;

                  return (
                    <Pressable
                      key={log._id}
                      onPress={() => router.push(`/day/${log.date}`)}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 14,
                        gap: 14,
                        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                        borderBottomColor: T.hairline,
                        opacity: pressed ? 0.55 : 1,
                      })}>
                      <View style={{
                        width: 40, height: 40, borderRadius: 12,
                        backgroundColor: isComplete ? T.invertBg : T.hairline,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                        <Text style={{
                          fontFamily: Font.displayBold,
                          fontSize: 14,
                          color: isComplete ? T.invertText : T.text,
                          letterSpacing: -0.4,
                        }}>
                          {log.challengeDay}
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontFamily: Font.displaySemi,
                          fontSize: 14,
                          color: T.text,
                          letterSpacing: -0.2,
                        }}>
                          {dateStr}
                        </Text>
                        <Text style={{
                          fontFamily: Font.bodyReg,
                          fontSize: 12,
                          color: T.textDim,
                          marginTop: 1,
                          letterSpacing: -0.05,
                        }}>
                          {isComplete
                            ? 'Completed'
                            : expected === 0
                              ? 'Nothing logged'
                              : `${completed}/${expected} done`}
                        </Text>
                      </View>

                      <Text style={{
                        fontFamily: Font.icon,
                        fontSize: 18,
                        color: T.textSubtle,
                        lineHeight: 20,
                      }}>
                        chevron_right
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </Animated.View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
