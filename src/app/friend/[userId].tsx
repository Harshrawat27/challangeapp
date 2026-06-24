import { useMemo } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { useFriendDetail, useRemoveFriend, type DailyLog } from '@/lib/convex-api';
import { buildTasks, localDateString } from '@/lib/tasks';
import { getChallenge, type ChallengeId } from '@/constants/challenges';
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

// ─── Heatmap ─────────────────────────────────────────────────────────────────

const SHADE_OPACITIES = [0.0, 0.14, 0.28, 0.45, 0.62, 0.80, 1.0];
function shadeColor(ratio: number, isDark: boolean): string {
  if (ratio <= 0) return 'transparent';
  const step = Math.min(6, Math.max(1, Math.round(ratio * 6)));
  return isDark
    ? `rgba(250,250,250,${SHADE_OPACITIES[step]})`
    : `rgba(10,10,10,${SHADE_OPACITIES[step]})`;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function computeStats(logs: DailyLog[], challengeStart: Date, today: Date) {
  const byDate = new Map(logs.map(l => [l.date, l]));
  const pastDays = Math.max(0, Math.floor((+today - +challengeStart) / MS_PER_DAY));

  let done = 0;
  let expected = 0;
  let streak = 0;

  const isTaskDone = (log: DailyLog, taskId: string): boolean => {
    const required = log.taskCounts?.[taskId] ?? 1;
    const taps = log.completions[taskId];
    return Array.isArray(taps) ? taps.length >= required : false;
  };

  for (let i = 0; i < pastDays; i++) {
    const d = addDays(challengeStart, i);
    const log = byDate.get(localDateString(d));
    if (log) {
      done += log.allTaskIds.filter(id => isTaskDone(log, id)).length;
      expected += log.allTaskIds.length;
    }
  }

  for (let i = pastDays - 1; i >= 0; i--) {
    const d = addDays(challengeStart, i);
    const log = byDate.get(localDateString(d));
    if (
      log &&
      log.allTaskIds.length > 0 &&
      log.allTaskIds.every(id => isTaskDone(log, id))
    ) {
      streak++;
    } else {
      break;
    }
  }

  return {
    streak,
    pct: expected === 0 ? 0 : Math.round((done / expected) * 100),
    pastDays,
  };
}

// ─── Stat tile ───────────────────────────────────────────────────────────────

function StatTile({ label, value, T }: { label: string; value: string; T: Theme }) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: T.card,
      borderRadius: Radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: T.cardBorder,
      padding: 14,
      gap: 4,
    }}>
      <Text style={{ fontFamily: Font.bodyMed, fontSize: 10, letterSpacing: 1.6, color: T.textSubtle }}>
        {label}
      </Text>
      <Text style={{ fontFamily: Font.displayBlack, fontSize: 26, color: T.text, letterSpacing: -0.8, lineHeight: 30 }}>
        {value}
      </Text>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function FriendDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayStr = localDateString(today);

  const detail = useFriendDetail(userId as string, todayStr);
  const removeFriend = useRemoveFriend();

  const handleRemove = () => {
    const name = detail?.displayName ?? 'this person';
    Alert.alert(
      `Remove ${name}?`,
      'They will no longer see your progress and vice-versa.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFriend({ friendUserId: userId as string });
              router.back();
            } catch (e: any) {
              Alert.alert('Could not remove', e?.message ?? '');
            }
          },
        },
      ],
    );
  };

  const tasks = useMemo(
    () => buildTasks(detail?.challenge, detail?.customHabits),
    [detail?.challenge, detail?.customHabits],
  );

  const challengeStart = useMemo(() => {
    if (detail?.challengeStartDate) return parseDate(detail.challengeStartDate);
    return today;
  }, [detail?.challengeStartDate, today]);

  const challengeLength = detail?.challengeLength ?? 75;

  const stats = useMemo(
    () => computeStats(detail?.logs ?? [], challengeStart, today),
    [detail?.logs, challengeStart, today],
  );

  const currentDay = Math.max(
    1,
    Math.min(
      Math.floor((+today - +challengeStart) / MS_PER_DAY) + 1,
      challengeLength,
    ),
  );

  const challengeName = getChallenge((detail?.challenge as ChallengeId | null) ?? null)?.name ?? '—';

  // Heatmap geometry — subtract card's inner padding from available width
  const HPAD = 20;
  const CARD_INNER_PAD = 16;
  const availableW = Math.min(screenW, MaxContentWidth) - HPAD * 2 - CARD_INNER_PAD * 2;
  const HEATMAP_COLS = 15;
  const HEATMAP_GAP = 4;
  const cellSize = Math.floor((availableW - HEATMAP_GAP * (HEATMAP_COLS - 1)) / HEATMAP_COLS);

  const logByDate = useMemo(() => {
    const m = new Map<string, DailyLog>();
    for (const l of detail?.logs ?? []) m.set(l.date, l);
    return m;
  }, [detail?.logs]);

  const todayLog = logByDate.get(todayStr);

  if (detail === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: T.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={T.text} />
      </View>
    );
  }

  if (detail === null) {
    return (
      <View style={{ flex: 1, backgroundColor: T.background, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 16 }}>
        <Text style={{ fontFamily: Font.displaySemi, fontSize: 18, color: T.text, textAlign: 'center' }}>
          Not friends
        </Text>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
          <Text style={{ fontFamily: Font.bodyMed, fontSize: 15, color: T.textDim }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const initial = (detail.displayName || detail.username || '?').charAt(0).toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: T.background, alignItems: 'center' }}>
      <ScrollView
        style={{ width: '100%' }}
        contentContainerStyle={{
          paddingHorizontal: HPAD,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 100,
          maxWidth: MaxContentWidth,
          alignSelf: 'center',
          width: '100%',
        }}
        showsVerticalScrollIndicator={false}>

        {/* Nav row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
            <Text style={{ fontFamily: Font.icon, fontSize: 26, color: T.text, lineHeight: 28, includeFontPadding: false }}>
              arrow_back_ios
            </Text>
          </Pressable>
          <Pressable
            onPress={handleRemove}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
            <Text style={{ fontFamily: Font.bodySemi, fontSize: 14, color: '#EF4444' }}>
              Remove
            </Text>
          </Pressable>
        </View>

        {/* Profile header */}
        <Animated.View entering={FadeIn.duration(300)} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <View style={{
            width: 68, height: 68, borderRadius: 68,
            backgroundColor: T.invertBg,
            justifyContent: 'center', alignItems: 'center',
            overflow: 'hidden',
          }}>
            {detail.profilePictureUrl ? (
              <Image
                source={{ uri: detail.profilePictureUrl }}
                style={{ width: 68, height: 68 }}
                contentFit='cover'
              />
            ) : (
              <Text style={{ fontFamily: Font.displayBold, fontSize: 26, color: T.invertText, letterSpacing: -0.6 }}>
                {initial}
              </Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: Font.displayBlack, fontSize: 24, color: T.text, letterSpacing: -0.6, lineHeight: 28 }}>
              {detail.displayName || detail.username || 'Friend'}
            </Text>
            {detail.username && (
              <Text style={{ fontFamily: Font.bodyReg, fontSize: 13, color: T.textDim, marginTop: 2 }}>
                @{detail.username}
              </Text>
            )}
            <Text style={{ fontFamily: Font.bodyMed, fontSize: 12, color: T.textDim, marginTop: 4 }}>
              {challengeName}  ·  Day {currentDay}/{challengeLength}
            </Text>
          </View>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(80).duration(380)} style={{ flexDirection: 'row', gap: 10, marginBottom: 32 }}>
          <StatTile label='STREAK' value={`${stats.streak}d`} T={T} />
          <StatTile label='ON TRACK' value={`${stats.pct}%`} T={T} />
          <StatTile label='DAY' value={`${currentDay}`} T={T} />
        </Animated.View>

        {/* Heatmap */}
        <Animated.View entering={FadeInDown.delay(160).duration(400)} style={{ marginBottom: 32 }}>
          <Text style={{ fontFamily: Font.bodyMed, fontSize: 11, letterSpacing: 1.8, color: T.textSubtle, marginBottom: 8 }}>
            HEATMAP
          </Text>
          <View style={{
            backgroundColor: T.card,
            borderRadius: Radius.lg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: T.cardBorder,
            padding: CARD_INNER_PAD,
          }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: HEATMAP_GAP }}>
              {Array.from({ length: challengeLength }).map((_, i) => {
                const cellDate = addDays(challengeStart, i);
                const cellDateStr = localDateString(cellDate);
                const log = logByDate.get(cellDateStr);
                const isToday = +cellDate === +today;
                const isFuture = +cellDate > +today;
                const completedCount = log
                  ? log.allTaskIds.filter(id => {
                      const required = log.taskCounts?.[id] ?? 1;
                      const taps = log.completions[id];
                      return Array.isArray(taps) && taps.length >= required;
                    }).length
                  : 0;
                const exp = log?.allTaskIds.length ?? tasks.length;
                const ratio = exp > 0 ? completedCount / exp : 0;

                return (
                  <View
                    key={i}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      borderRadius: 3,
                      backgroundColor: isFuture ? 'transparent' : shadeColor(ratio, isDark),
                      borderWidth: (ratio === 0 || isFuture) ? StyleSheet.hairlineWidth : 0,
                      borderColor: isToday ? T.text : T.cardBorder,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
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
                  </View>
                );
              })}
            </View>
            {/* Legend */}
            <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: Font.bodyMed, fontSize: 10, letterSpacing: 1.4, color: T.textSubtle }}>
                LESS
              </Text>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {[0, 1, 2, 3, 4, 5, 6].map(step => (
                  <View
                    key={step}
                    style={{
                      width: 12, height: 12, borderRadius: 2,
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
              <Text style={{ fontFamily: Font.bodyMed, fontSize: 10, letterSpacing: 1.4, color: T.textSubtle }}>
                MORE
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Today's habits */}
        <Animated.View entering={FadeInDown.delay(240).duration(400)}>
          <Text style={{ fontFamily: Font.bodyMed, fontSize: 11, letterSpacing: 1.8, color: T.textSubtle, marginBottom: 8 }}>
            TODAY'S HABITS
          </Text>
          <View style={{
            backgroundColor: T.card,
            borderRadius: Radius.lg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: T.cardBorder,
            paddingHorizontal: 16,
            paddingVertical: 4,
          }}>
            {tasks.length === 0 ? (
              <View style={{ paddingVertical: 16 }}>
                <Text style={{ fontFamily: Font.bodyReg, fontSize: 13, color: T.textDim }}>
                  No challenge selected.
                </Text>
              </View>
            ) : tasks.map((task, i) => {
              const required = todayLog?.taskCounts?.[task.id] ?? 1;
              const taps = todayLog?.completions[task.id];
              const done = Array.isArray(taps) && taps.length >= required;
              const isLast = i === tasks.length - 1;
              return (
                <View
                  key={task.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    paddingVertical: 14,
                    borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: T.hairline,
                  }}>
                  <View style={{
                    width: 38, height: 38, borderRadius: 10,
                    backgroundColor: done ? T.invertBg : 'transparent',
                    borderWidth: done ? 0 : StyleSheet.hairlineWidth,
                    borderColor: T.cardBorder,
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    <Text style={{
                      fontFamily: Font.icon, fontSize: 18, lineHeight: 20,
                      color: done ? T.invertText : T.textDim,
                      includeFontPadding: false,
                    }}>
                      {task.icon}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontFamily: Font.displaySemi,
                      fontSize: 14,
                      color: done ? T.text : T.textDim,
                      letterSpacing: -0.2,
                    }}>
                      {task.label}
                    </Text>
                    <Text style={{ fontFamily: Font.bodyReg, fontSize: 11, color: T.textSubtle, marginTop: 1 }}>
                      {task.meta}
                    </Text>
                  </View>
                  <Text style={{
                    fontFamily: Font.icon, fontSize: 20, lineHeight: 22,
                    color: done ? T.text : T.hairline,
                    includeFontPadding: false,
                  }}>
                    {done ? 'check_circle' : 'radio_button_unchecked'}
                  </Text>
                </View>
              );
            })}
          </View>
        </Animated.View>

      </ScrollView>
    </View>
  );
}
