import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { authClient } from '@/lib/auth-client';
import { useCachedDay, useCachedPreferences, useMealsForDay, useNoteForDay, useToggleTask, useWaterForDay } from '@/lib/convex-api';
import { buildTasks, localDateString } from '@/lib/tasks';
import { DayStrip } from '@/components/day-strip';
import { type ChallengeTask } from '@/constants/challenges';
import { Colors, Font, MaxContentWidth, Radius, Spacing } from '@/constants/theme';

// ─── Domain ─────────────────────────────────────────────────────────────────

const dayDiff = (a: Date, b: Date) => Math.floor((+a - +b) / 86_400_000);

type TaskDef = ChallengeTask;

// ─── Material Symbols icon (uses ligature support in the loaded font) ──────

function Icon({ name, size, color }: { name: string; size: number; color: string }) {
  return (
    <Text
      selectable={false}
      style={{
        fontFamily: Font.icon,
        fontSize: size,
        lineHeight: size,
        color,
        textAlign: 'center',
        includeFontPadding: false,
      }}>
      {name}
    </Text>
  );
}

// DayStrip moved to @/components/day-strip — shared between Home and Day Detail.

// ─── 75-day progress dot row ────────────────────────────────────────────────

function JourneyDots({
  current,
  totalDays,
  ink,
  cardBorder,
  dim,
  width,
}: {
  current: number;
  totalDays: number;
  ink: string;
  cardBorder: string;
  dim: string;
  width: number;
}) {
  const gap = 3;
  const cellSize = (width - gap * (totalDays - 1)) / totalDays;

  return (
    <View style={{ flexDirection: 'row', gap, height: cellSize * 1.6, alignItems: 'flex-end' }}>
      {Array.from({ length: totalDays }).map((_, i) => {
        const day = i + 1;
        const isPast = day < current;
        const isToday = day === current;
        return (
          <Animated.View
            key={i}
            entering={FadeIn.delay(280 + i * 7).duration(280)}
            style={{
              width: cellSize,
              height: isToday ? cellSize * 1.6 : cellSize,
              borderRadius: cellSize / 2,
              backgroundColor: isPast || isToday ? ink : 'transparent',
              borderWidth: !isPast && !isToday ? StyleSheet.hairlineWidth : 0,
              borderColor: cardBorder,
            }}
          />
        );
      })}
    </View>
  );
}

// ─── Task Card ──────────────────────────────────────────────────────────────

function TaskCard({
  task,
  done,
  index,
  onToggle,
  ink,
  dim,
  cardBg,
  cardBorder,
  invertBg,
  invertText,
}: {
  task: TaskDef;
  done: boolean;
  index: number;
  onToggle: () => void;
  ink: string;
  dim: string;
  cardBg: string;
  cardBorder: string;
  invertBg: string;
  invertText: string;
}) {
  const v = useSharedValue(done ? 1 : 0);
  const labelW = useSharedValue(0);
  // Tracks whether the most recent `done` change came from a press (animation
  // already started) vs. external data arriving (Convex load / app reopen).
  const pressInFlight = useRef(false);

  const handle = useCallback(() => {
    pressInFlight.current = true;
    v.value = withTiming(done ? 0 : 1, { duration: 260, easing: Easing.out(Easing.cubic) });
    onToggle();
  }, [done, onToggle, v]);

  // Sync visual state when external data changes (app reopen, Convex response).
  // Skip when a press just triggered the change to avoid cancelling its animation.
  useEffect(() => {
    if (pressInFlight.current) {
      pressInFlight.current = false;
      return;
    }
    v.value = done ? 1 : 0;
  }, [done, v]);

  const contentDim = useAnimatedStyle(() => ({
    opacity: interpolate(v.value, [0, 1], [1, 0.45]),
  }));
  const checkFill = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ scale: interpolate(v.value, [0, 1], [0.4, 1]) }],
  }));
  const checkOutline = useAnimatedStyle(() => ({
    opacity: interpolate(v.value, [0, 1], [1, 0]),
  }));
  // Clip container matches the text's intrinsic width (not the flex container)
  const clipStyle = useAnimatedStyle(() => ({ width: labelW.value }));
  // Line slides from left (-labelW) to 0 inside that clip
  const strikeStyle = useAnimatedStyle(() => ({
    width: labelW.value,
    transform: [{ translateX: interpolate(v.value, [0, 1], [-labelW.value, 0]) }],
  }));

  return (
    <Animated.View entering={FadeInDown.delay(520 + index * 70).duration(420)}>
      <Pressable
        onPress={handle}
        style={({ pressed }) => ({
          backgroundColor: cardBg,
          borderRadius: Radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: cardBorder,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          marginBottom: 10,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        })}>

        {/* Icon tile */}
        <Animated.View style={[{
          width: 46,
          height: 46,
          borderRadius: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: cardBorder,
          backgroundColor: 'transparent',
          justifyContent: 'center',
          alignItems: 'center',
        }, contentDim]}>
          <Icon name={task.icon} size={22} color={ink} />
        </Animated.View>

        {/* Label + meta */}
        <Animated.View style={[{ flex: 1, gap: 3 }, contentDim]}>
          {/* alignSelf:'flex-start' shrinks the wrapper to text content width */}
          <View
            onLayout={(e) => { labelW.value = e.nativeEvent.layout.width; }}
            style={{ alignSelf: 'flex-start' }}>
            <Text style={{
              fontFamily: Font.displaySemi,
              fontSize: 16,
              color: ink,
              letterSpacing: -0.2,
            }}>
              {task.label}
            </Text>
            {/* Clip container is exactly text-wide; line slides inside it */}
            <Animated.View
              pointerEvents='none'
              style={[{
                position: 'absolute',
                top: 0, bottom: 0, left: 0,
                justifyContent: 'center',
                overflow: 'hidden',
              }, clipStyle]}>
              <Animated.View style={[{ height: 1, backgroundColor: ink }, strikeStyle]} />
            </Animated.View>
          </View>
          <Text style={{
            fontFamily: Font.bodyReg,
            fontSize: 12.5,
            color: dim,
            letterSpacing: 0.1,
          }}>
            {task.meta}
          </Text>
        </Animated.View>

        {/* Check indicator */}
        <View style={{ width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }}>
          {/* outline state */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: 24,
                height: 24,
                borderRadius: 24,
                borderWidth: 1.5,
                borderColor: cardBorder,
              },
              checkOutline,
            ]}
          />
          {/* filled state */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: 24,
                height: 24,
                borderRadius: 24,
                backgroundColor: invertBg,
                justifyContent: 'center',
                alignItems: 'center',
              },
              checkFill,
            ]}>
            <Icon name="check" size={16} color={invertText} />
          </Animated.View>
        </View>

      </Pressable>
    </Animated.View>
  );
}

// ─── Water Task Card ────────────────────────────────────────────────────────

function WaterTaskCard({
  task,
  index,
  waterTotal,
  waterGoal,
  done,
  date,
  ink,
  dim,
  cardBg,
  cardBorder,
  invertBg,
  invertText,
}: {
  task: TaskDef;
  index: number;
  waterTotal: number;
  waterGoal: number;
  done: boolean;
  date: string;
  ink: string;
  dim: string;
  cardBg: string;
  cardBorder: string;
  invertBg: string;
  invertText: string;
}) {
  const pct = Math.min(1, waterGoal > 0 ? waterTotal / waterGoal : 0);

  // Strikethrough — same clip+slide approach as TaskCard, synced to external done state.
  const v = useSharedValue(done ? 1 : 0);
  const labelW = useSharedValue(0);
  useEffect(() => {
    v.value = withTiming(done ? 1 : 0, { duration: 400, easing: Easing.out(Easing.cubic) });
  }, [done, v]);
  const contentDim = useAnimatedStyle(() => ({ opacity: interpolate(v.value, [0, 1], [1, 0.45]) }));
  const clipStyle = useAnimatedStyle(() => ({ width: labelW.value }));
  const strikeStyle = useAnimatedStyle(() => ({
    width: labelW.value,
    transform: [{ translateX: interpolate(v.value, [0, 1], [-labelW.value, 0]) }],
  }));

  return (
    <Animated.View entering={FadeInDown.delay(520 + index * 70).duration(420)}>
      <Pressable
        onPress={() => router.push(`/water-log?date=${date}`)}
        style={({ pressed }) => ({
          backgroundColor: cardBg,
          borderRadius: Radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: cardBorder,
          padding: 16,
          gap: 10,
          marginBottom: 10,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        })}>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          {/* Icon tile */}
          <Animated.View style={[{
            width: 46, height: 46, borderRadius: 12,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: cardBorder,
            justifyContent: 'center', alignItems: 'center',
          }, contentDim]}>
            <Icon name={task.icon} size={22} color={done ? '#3B82F6' : ink} />
          </Animated.View>

          {/* Label + progress text */}
          <Animated.View style={[{ flex: 1, gap: 3 }, contentDim]}>
            {/* alignSelf:'flex-start' shrinks to text width for accurate strikethrough */}
            <View
              onLayout={(e) => { labelW.value = e.nativeEvent.layout.width; }}
              style={{ alignSelf: 'flex-start' }}>
              <Text style={{
                fontFamily: Font.displaySemi, fontSize: 16,
                color: ink, letterSpacing: -0.2,
              }}>
                {task.label}
              </Text>
              <Animated.View
                pointerEvents='none'
                style={[{
                  position: 'absolute', top: 0, bottom: 0, left: 0,
                  justifyContent: 'center', overflow: 'hidden',
                }, clipStyle]}>
                <Animated.View style={[{ height: 1, backgroundColor: ink }, strikeStyle]} />
              </Animated.View>
            </View>
            <Text style={{
              fontFamily: Font.bodyReg, fontSize: 12.5,
              color: dim, letterSpacing: 0.1,
            }}>
              {waterTotal > 0
                ? `${mlLabel(waterTotal)} of ${mlLabel(waterGoal)}`
                : `Goal: ${mlLabel(waterGoal)} · Tap to log`}
            </Text>
          </Animated.View>

          {/* Check indicator */}
          <View style={{ width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }}>
            <Animated.View style={[{
              position: 'absolute', width: 24, height: 24, borderRadius: 24,
              borderWidth: 1.5, borderColor: cardBorder,
            }, useAnimatedStyle(() => ({ opacity: interpolate(v.value, [0, 1], [1, 0]) }))]}>
            </Animated.View>
            <Animated.View style={[{
              position: 'absolute', width: 24, height: 24, borderRadius: 24,
              backgroundColor: invertBg,
              justifyContent: 'center', alignItems: 'center',
            }, useAnimatedStyle(() => ({
              opacity: v.value,
              transform: [{ scale: interpolate(v.value, [0, 1], [0.4, 1]) }],
            }))]}>
              <Icon name="check" size={16} color={invertText} />
            </Animated.View>
          </View>
        </View>

        {/* Progress bar */}
        <View style={{ height: 4, borderRadius: 4, backgroundColor: cardBorder, overflow: 'hidden' }}>
          <View style={{
            width: `${Math.round(pct * 100)}%`,
            height: '100%',
            backgroundColor: done ? '#3B82F6' : ink,
            borderRadius: 4,
          }} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

function mlLabel(ml: number): string {
  if (ml >= 1000) return `${(ml / 1000).toFixed(1).replace('.0', '')}L`;
  return `${ml}ml`;
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function Home() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  // ─── User preferences (drives challenge, length, start date, custom habits) ─
  const prefs = useCachedPreferences();
  const { data: session } = authClient.useSession();

  // Real local time, captured once at mount.
  const now = useMemo(() => new Date(), []);

  // Fall back to sensible defaults while prefs are loading so the layout doesn't
  // jump. Once `prefs` resolves, real values flow through.
  const challengeStart = useMemo(() => {
    if (prefs?.challengeStartDate) {
      // Parse YYYY-MM-DD as local midnight (not UTC, to avoid TZ shifts)
      const [y, m, d] = prefs.challengeStartDate.split('-').map(Number);
      return new Date(y, (m ?? 1) - 1, d ?? 1);
    }
    return now;
  }, [prefs?.challengeStartDate, now]);

  const totalDays = prefs?.challengeLength ?? 75;

  // Build today's task list from the chosen challenge + any custom habits.
  const TASKS: TaskDef[] = useMemo(
    () => buildTasks(prefs?.challenge, prefs?.customHabits),
    [prefs?.challenge, prefs?.customHabits],
  );

  // Today's persisted log + toggle mutation.
  const todayDateStr = useMemo(() => localDateString(now), [now]);
  const todayLog = useCachedDay(todayDateStr);
  const todayMeals = useMealsForDay(todayDateStr);
  const waterLogs = useWaterForDay(todayDateStr);
  const waterGoal = prefs?.waterGoalMl ?? 2500;
  const waterTotal = useMemo(
    () => (waterLogs ?? []).reduce((s, e) => s + e.amountMl, 0),
    [waterLogs],
  );
  const todayNote = useNoteForDay(todayDateStr);
  const toggleTaskMutation = useToggleTask();

  const currentDay = Math.max(
    1,
    Math.min(dayDiff(now, challengeStart) + 1, totalDays),
  );
  const todayIdx = Math.floor((+now - +challengeStart) / 86_400_000);

  // Greeting name — prefer the prefs (set at onboarding) but fall back to session.
  const firstName = useMemo(() => {
    const n = (prefs?.name ?? session?.user?.name ?? '').trim();
    if (!n) return '';
    return n.split(/\s+/)[0];
  }, [prefs?.name, session?.user?.name]);

  // `done` is derived from the persisted log. Optimistic state is layered on
  // top so taps feel instant even while the mutation is in flight.
  const [optimistic, setOptimistic] = useState<{ id: string; checked: boolean } | null>(null);
  const serverDone = useMemo(
    () => new Set(todayLog ? Object.keys(todayLog.completions) : []),
    [todayLog],
  );
  const done = useMemo(() => {
    if (!optimistic) return serverDone;
    const n = new Set(serverDone);
    optimistic.checked ? n.add(optimistic.id) : n.delete(optimistic.id);
    return n;
  }, [serverDone, optimistic]);

  // Drop optimistic state once the server result reflects it.
  useEffect(() => {
    if (!optimistic) return;
    const reflected = serverDone.has(optimistic.id) === optimistic.checked;
    if (reflected) setOptimistic(null);
  }, [optimistic, serverDone]);

  const [selectedIdx, setSelectedIdx] = useState(todayIdx);
  const toggle = useCallback(
    (id: string) => {
      const willBeChecked = !done.has(id);
      setOptimistic({ id, checked: willBeChecked });
      toggleTaskMutation({
        date: todayDateStr,
        taskId: id,
        allTaskIds: TASKS.map(t => t.id),
        todayLocal: todayDateStr,
      }).catch(() => {
        // Rollback optimistic state on failure.
        setOptimistic(null);
      });
    },
    [done, todayDateStr, TASKS, toggleTaskMutation],
  );

  // Keep the day-strip selection synced to "today" once prefs load and we know
  // the real start date.
  useEffect(() => {
    setSelectedIdx(todayIdx);
  }, [todayIdx]);

  const { width: screenW } = useWindowDimensions();
  const containerW = Math.min(screenW, MaxContentWidth);
  const HPAD = 20;
  const CARD_INNER = containerW - HPAD * 2 - 32; // minus card padding *2

  const remaining = totalDays - currentDay;
  // Water done state is computed from water logs (not from daily_logs.completions)
  // so it's accurate even before any other task has been toggled today.
  const hasWaterTask = useMemo(() => TASKS.some(t => t.id === 'water'), [TASKS]);
  const waterDone = hasWaterTask && waterTotal >= waterGoal;
  const doneCount = useMemo(() => {
    let count = done.size;
    if (hasWaterTask) {
      // Replace whatever daily_logs says about water with the live total.
      if (waterDone && !done.has('water')) count++;
      if (!waterDone && done.has('water')) count--;
    }
    return count;
  }, [done, hasWaterTask, waterDone]);
  const pct = useMemo(
    () => {
      const taskTotal = TASKS.length || 1;
      return Math.round(((currentDay - 1 + doneCount / taskTotal) / totalDays) * 100);
    },
    [doneCount, currentDay, totalDays, TASKS.length],
  );

  const dateLine = now.toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const greeting = useMemo(() => {
    const h = now.getHours();
    if (h < 5) return 'Up late';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Good night';
  }, [now]);

  const greetingLine = firstName ? `${greeting}, ${firstName}` : greeting;

  return (
    <View style={{ flex: 1, backgroundColor: T.background, alignItems: 'center' }}>
      <SafeAreaView style={{ flex: 1, width: '100%', maxWidth: MaxContentWidth }} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: HPAD,
            paddingTop: 8,
            paddingBottom: 140,
          }}>

          {/* ═══ Header ═════════════════════════════════════════════ */}
          <Animated.View entering={FadeIn.duration(400)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text
                  numberOfLines={1}
                  ellipsizeMode='tail'
                  style={{
                    fontFamily: Font.bodyMed,
                    fontSize: 14,
                    color: T.textDim,
                    letterSpacing: -0.1,
                  }}>
                  {greetingLine}
                </Text>
                <Text style={{
                  fontFamily: Font.displayBlack,
                  fontSize: 38,
                  color: T.text,
                  letterSpacing: -1.4,
                  lineHeight: 42,
                }}>
                  Day {prefs === undefined ? '—' : currentDay}.
                </Text>
                <Text style={{
                  fontFamily: Font.bodyReg,
                  fontSize: 13,
                  color: T.textDim,
                  letterSpacing: -0.05,
                  marginTop: 2,
                }}>
                  {dateLine}
                </Text>
              </View>

              {/* Notifications pill */}
              <Pressable style={({ pressed }) => ({
                width: 46, height: 46, borderRadius: 46,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: T.cardBorder,
                backgroundColor: T.card,
                justifyContent: 'center', alignItems: 'center',
                opacity: pressed ? 0.6 : 1,
                marginTop: 6,
              })}>
                <Icon name="notifications" size={20} color={T.text} />
              </Pressable>
            </View>
          </Animated.View>

          {/* ═══ Day Strip (calendar, scrollable) ═════════════════════ */}
          <View style={{ marginTop: Spacing.six }}>
            <DayStrip
              todayDate={now}
              challengeStart={challengeStart}
              totalDays={totalDays}
              ink={T.text}
              invertBg={T.invertBg}
              invertText={T.invertText}
              cardBg={T.card}
              cardBorder={T.cardBorder}
              dim={T.textDim}
              edgePadding={HPAD}
              selectedIdx={selectedIdx}
              onSelect={(idx) => {
                if (idx === todayIdx) {
                  setSelectedIdx(idx); // already on home — just visual select
                  return;
                }
                if (idx > todayIdx) return; // future — disabled (also enforced inside DayStrip)
                // Past day → push to Day Detail
                const target = new Date(challengeStart);
                target.setDate(challengeStart.getDate() + idx);
                router.push(`/day/${localDateString(target)}`);
              }}
            />
          </View>

          {/* ═══ Hero Progress Card ══════════════════════════════════ */}
          <Animated.View
            entering={FadeInDown.delay(220).duration(500)}
            style={{
              marginTop: Spacing.five,
              backgroundColor: T.invertBg,
              borderRadius: Radius.xl,
              padding: 20,
              gap: 18,
            }}>
            {/* Top row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ gap: 4 }}>
                <Text style={{
                  fontFamily: Font.bodyMed,
                  fontSize: 11,
                  color: T.invertText,
                  opacity: 0.55,
                  letterSpacing: 1.6,
                }}>
                  75 HARD · CHALLENGE
                </Text>
                <Text style={{
                  fontFamily: Font.displayBold,
                  fontSize: 22,
                  color: T.invertText,
                  letterSpacing: -0.6,
                  marginTop: 2,
                }}>
                  Don't stop. Don't blink.
                </Text>
              </View>
              <View style={{
                backgroundColor: T.invertText,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: Radius.pill,
              }}>
                <Text style={{
                  fontFamily: Font.displayBold,
                  fontSize: 13,
                  color: T.invertBg,
                  letterSpacing: -0.2,
                }}>
                  {pct}%
                </Text>
              </View>
            </View>

            {/* 75-day dot journey */}
            <View style={{ paddingVertical: 4 }}>
              <JourneyDots
                current={currentDay}
                totalDays={totalDays}
                ink={T.invertText}
                cardBorder={`rgba(${isDark ? '10,10,10' : '250,250,250'}, 0.18)`}
                dim={T.invertText}
                width={CARD_INNER}
              />
            </View>

            {/* Bottom row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{
                  fontFamily: Font.bodyMed,
                  fontSize: 10,
                  color: T.invertText,
                  opacity: 0.5,
                  letterSpacing: 1.4,
                }}>
                  COMPLETED
                </Text>
                <Text style={{
                  fontFamily: Font.displaySemi,
                  fontSize: 17,
                  color: T.invertText,
                  marginTop: 4,
                  letterSpacing: -0.3,
                }}>
                  {currentDay - 1} <Text style={{ fontFamily: Font.bodyReg, fontSize: 13, color: T.invertText, opacity: 0.5 }}>days</Text>
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{
                  fontFamily: Font.bodyMed,
                  fontSize: 10,
                  color: T.invertText,
                  opacity: 0.5,
                  letterSpacing: 1.4,
                }}>
                  REMAINING
                </Text>
                <Text style={{
                  fontFamily: Font.displaySemi,
                  fontSize: 17,
                  color: T.invertText,
                  marginTop: 4,
                  letterSpacing: -0.3,
                }}>
                  {remaining} <Text style={{ fontFamily: Font.bodyReg, fontSize: 13, color: T.invertText, opacity: 0.5 }}>days</Text>
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* ═══ Today's Tasks ═══════════════════════════════════════ */}
          <Animated.View
            entering={FadeIn.delay(380).duration(400)}
            style={{ marginTop: Spacing.six }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: Spacing.four,
            }}>
              <Text style={{
                fontFamily: Font.displayBold,
                fontSize: 22,
                color: T.text,
                letterSpacing: -0.5,
              }}>
                Today's tasks
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Pressable
                  onPress={() => router.push(`/note/${todayDateStr}`)}
                  hitSlop={8}
                  style={({ pressed }) => ({
                    width: 30, height: 30, borderRadius: 30,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: todayNote?.note ? T.text : T.cardBorder,
                    backgroundColor: todayNote?.note ? T.invertBg : T.card,
                    justifyContent: 'center', alignItems: 'center',
                    opacity: pressed ? 0.6 : 1,
                  })}>
                  <Text style={{
                    fontFamily: Font.icon,
                    fontSize: 16,
                    lineHeight: 18,
                    color: todayNote?.note ? T.invertText : T.text,
                    includeFontPadding: false,
                  }}>
                    edit_note
                  </Text>
                </Pressable>
                <Text style={{
                  fontFamily: Font.bodySemi,
                  fontSize: 13,
                  color: T.textDim,
                  letterSpacing: -0.1,
                }}>
                  {doneCount}/{TASKS.length} done
                </Text>
              </View>
            </View>

            {TASKS.map((t, i) => {
              if (t.id === 'water') {
                return (
                  <WaterTaskCard
                    key={t.id}
                    task={t}
                    index={i}
                    waterTotal={waterTotal}
                    waterGoal={waterGoal}
                    done={waterDone}
                    date={todayDateStr}
                    ink={T.text}
                    dim={T.textDim}
                    cardBg={T.card}
                    cardBorder={T.cardBorder}
                    invertBg={T.invertBg}
                    invertText={T.invertText}
                  />
                );
              }
              return (
                <TaskCard
                  key={t.id}
                  task={t}
                  index={i}
                  done={done.has(t.id)}
                  onToggle={() => toggle(t.id)}
                  ink={T.text}
                  dim={T.textDim}
                  cardBg={T.card}
                  cardBorder={T.cardBorder}
                  invertBg={T.invertBg}
                  invertText={T.invertText}
                />
              );
            })}
          </Animated.View>

          {/* ═══ Today's Nutrition ══════════════════════════════════ */}
          {todayMeals && todayMeals.length > 0 && (() => {
            const totalCal = todayMeals.reduce((s, m) => s + m.calories, 0);
            const totalP   = todayMeals.reduce((s, m) => s + m.protein, 0);
            const totalC   = todayMeals.reduce((s, m) => s + m.carbs, 0);
            const totalF   = todayMeals.reduce((s, m) => s + m.fat, 0);
            return (
              <Animated.View
                entering={FadeInDown.delay(480).duration(420)}
                style={{ marginTop: Spacing.five }}>
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: Spacing.four,
                }}>
                  <Text style={{
                    fontFamily: Font.displayBold, fontSize: 22,
                    color: T.text, letterSpacing: -0.5,
                  }}>
                    Today's nutrition
                  </Text>
                  <Text style={{
                    fontFamily: Font.bodySemi, fontSize: 13,
                    color: T.textDim, letterSpacing: -0.1,
                  }}>
                    {todayMeals.length} {todayMeals.length === 1 ? 'meal' : 'meals'}
                  </Text>
                </View>
                <View style={{
                  backgroundColor: T.card,
                  borderRadius: Radius.lg,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: T.cardBorder,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                  {/* Calories */}
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Icon name='local_fire_department' size={16} color='#FB923C' />
                      <Text style={{
                        fontFamily: Font.displayBlack, fontSize: 28,
                        color: T.text, letterSpacing: -0.8,
                      }}>
                        {totalCal}
                      </Text>
                      <Text style={{
                        fontFamily: Font.bodyMed, fontSize: 12,
                        color: T.textDim, paddingTop: 6,
                      }}>
                        kcal
                      </Text>
                    </View>
                  </View>
                  {/* Macros */}
                  <View style={{ gap: 6, alignItems: 'flex-end' }}>
                    {([['P', totalP], ['C', totalC], ['F', totalF]] as [string, number][]).map(([label, val]) => (
                      <View key={label} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        <Text style={{ fontFamily: Font.bodyMed, fontSize: 12, color: T.textDim, width: 14 }}>{label}</Text>
                        <Text style={{ fontFamily: Font.bodySemi, fontSize: 13, color: T.text, minWidth: 36, textAlign: 'right' }}>
                          {val}g
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Meal-by-meal list */}
                <View style={{
                  marginTop: 10,
                  backgroundColor: T.card,
                  borderRadius: Radius.lg,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: T.cardBorder,
                  overflow: 'hidden',
                }}>
                  {todayMeals.map((meal, i) => (
                    <View
                      key={meal._id}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 13,
                        borderBottomWidth: i === todayMeals.length - 1 ? 0 : StyleSheet.hairlineWidth,
                        borderBottomColor: T.hairline,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                      }}>
                      <Text style={{
                        fontFamily: Font.icon, fontSize: 18, lineHeight: 20,
                        color: '#FB923C', includeFontPadding: false,
                      }}>
                        local_fire_department
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontFamily: Font.displaySemi, fontSize: 14,
                          color: T.text, letterSpacing: -0.2,
                        }}>
                          {meal.name}
                        </Text>
                        <Text style={{
                          fontFamily: Font.bodyReg, fontSize: 11.5,
                          color: T.textDim, marginTop: 1,
                        }}>
                          P {meal.protein}g · C {meal.carbs}g · F {meal.fat}g
                        </Text>
                      </View>
                      <Text style={{
                        fontFamily: Font.displayBold, fontSize: 14,
                        color: T.text, letterSpacing: -0.2,
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
