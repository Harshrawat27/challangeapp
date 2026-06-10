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
import { useMyPreferences } from '@/lib/convex-api';
import { getChallenge, type ChallengeId, type ChallengeTask } from '@/constants/challenges';
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

// ─── Day strip — calendar dates, horizontally scrollable ────────────────────

function DayStrip({
  todayDate,
  challengeStart,
  totalDays,
  ink,
  invertBg,
  invertText,
  cardBg,
  cardBorder,
  dim,
  edgePadding,
  selectedIdx,
  onSelect,
}: {
  todayDate: Date;
  challengeStart: Date;
  totalDays: number;
  ink: string;
  invertBg: string;
  invertText: string;
  cardBg: string;
  cardBorder: string;
  dim: string;
  edgePadding: number;
  selectedIdx: number;
  onSelect: (idx: number) => void;
}) {
  const PILL = 50;
  const GAP = 10;
  const SLOT = PILL + GAP;

  const todayIndex = Math.max(0, Math.min(
    totalDays - 1,
    Math.floor((+todayDate - +challengeStart) / 86_400_000),
  ));

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    // place today as ~3rd visible pill from left
    const offset = Math.max(0, (todayIndex - 2) * SLOT);
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: offset, animated: false });
    }, 0);
    return () => clearTimeout(t);
  }, [todayIndex]);

  const days = useMemo(
    () => Array.from({ length: totalDays }).map((_, i) => {
      const d = new Date(challengeStart);
      d.setDate(challengeStart.getDate() + i);
      return d;
    }),
    [challengeStart, totalDays],
  );

  return (
    <View style={{ marginHorizontal: -edgePadding }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        contentContainerStyle={{
          paddingHorizontal: edgePadding,
          gap: GAP,
          alignItems: 'flex-start',
          paddingVertical: 4,
        }}>
        {days.map((d, i) => {
          const isToday = i === todayIndex;
          const isSelected = i === selectedIdx;
          const isPast = i < todayIndex;
          const isFuture = i > todayIndex;
          const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
          const dayNum = d.getDate();

          // Visual: selected pill always filled; today gets ring if not selected
          const filled = isSelected;
          const showTodayRing = isToday && !isSelected;

          return (
            <Pressable
              key={i}
              onPress={() => onSelect(i)}
              disabled={isFuture}
              style={({ pressed }) => ({
                width: PILL,
                alignItems: 'center',
                gap: 6,
                opacity: pressed && !isFuture ? 0.6 : 1,
              })}>
              <Text style={{
                fontFamily: Font.bodyMed,
                fontSize: 10.5,
                color: isSelected ? ink : (isFuture ? dim : ink),
                letterSpacing: 0.3,
                opacity: isFuture ? 0.5 : 0.75,
              }}>
                {weekday.toUpperCase()}
              </Text>
              <View style={{
                width: PILL,
                height: PILL,
                borderRadius: PILL / 2,
                backgroundColor: filled ? invertBg : cardBg,
                borderWidth: showTodayRing ? 1.5 : StyleSheet.hairlineWidth,
                borderColor: showTodayRing ? invertBg : cardBorder,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Text style={{
                  fontFamily: filled ? Font.displayBold : Font.displaySemi,
                  fontSize: 17,
                  color: filled ? invertText : ink,
                  letterSpacing: -0.4,
                  opacity: isFuture ? 0.45 : 1,
                }}>
                  {dayNum}
                </Text>
              </View>
              {/* underline indicator for past completed days */}
              <View style={{
                width: 5, height: 5, borderRadius: 5,
                backgroundColor: isPast ? ink : 'transparent',
                opacity: 0.85,
              }} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

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

  const handle = useCallback(() => {
    v.value = withTiming(done ? 0 : 1, { duration: 220, easing: Easing.out(Easing.cubic) });
    onToggle();
  }, [done, onToggle, v]);

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
          <Text style={{
            fontFamily: Font.displaySemi,
            fontSize: 16,
            color: ink,
            letterSpacing: -0.2,
          }}>
            {task.label}
          </Text>
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

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function Home() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  // ─── User preferences (drives challenge, length, start date, custom habits) ─
  const prefs = useMyPreferences();
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
  const TASKS: TaskDef[] = useMemo(() => {
    const ch = getChallenge((prefs?.challenge as ChallengeId | undefined) ?? null);
    const base = ch?.tasks ?? [];
    const custom: ChallengeTask[] = (prefs?.customHabits ?? []).map((label, i) => ({
      id: `custom-${i}-${label}`,
      icon: 'task_alt',
      label,
      meta: 'Custom',
    }));
    return [...base, ...custom];
  }, [prefs?.challenge, prefs?.customHabits]);

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

  const [done, setDone] = useState<Set<string>>(new Set());
  const [selectedIdx, setSelectedIdx] = useState(todayIdx);
  const toggle = useCallback((id: string) => {
    setDone(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

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
  const doneCount = done.size;
  const pct = useMemo(
    () => {
      const taskTotal = TASKS.length || 1; // avoid /0 while prefs loading
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
                  Day {currentDay}.
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

              {/* Streak/notif pill */}
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
              onSelect={setSelectedIdx}
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
              alignItems: 'baseline',
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
              <Text style={{
                fontFamily: Font.bodySemi,
                fontSize: 13,
                color: T.textDim,
                letterSpacing: -0.1,
              }}>
                {doneCount}/{TASKS.length} done
              </Text>
            </View>

            {TASKS.map((t, i) => (
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
            ))}
          </Animated.View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
