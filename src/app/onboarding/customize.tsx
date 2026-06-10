import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';

import { OnboardingFrame } from '@/components/onboarding-frame';
import { Colors, Font, MaxContentWidth, Radius, type Theme } from '@/constants/theme';
import { useOnboarding } from '@/lib/onboarding-store';
import { getChallenge } from '@/constants/challenges';

const MIN_DAYS = 7;
const MAX_DAYS = 180;

// ─── Length Slider — ruler-style ────────────────────────────────────────────

function formatDate(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function LengthSlider({
  value,
  onChange,
  T,
  isDark,
}: {
  value: number;
  onChange: (v: number) => void;
  T: Theme;
  isDark: boolean;
}) {
  const { width: windowW } = useWindowDimensions();
  const containerW = Math.min(windowW, MaxContentWidth) - 48; // matches horizontal padding
  const TICK_W = 2;
  const TICK_GAP = 6;
  const SLOT = TICK_W + TICK_GAP;
  const range = MAX_DAYS - MIN_DAYS + 1;
  const padding = (containerW - TICK_W) / 2;

  const scrollRef = useRef<ScrollView>(null);
  const lastReported = useRef(value);

  // Initial scroll position
  useEffect(() => {
    const offset = (value - MIN_DAYS) * SLOT;
    scrollRef.current?.scrollTo({ x: offset, animated: false });
    // intentionally empty dep array — only on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = e.nativeEvent.contentOffset.x;
      const day = Math.round(offset / SLOT) + MIN_DAYS;
      const clamped = Math.max(MIN_DAYS, Math.min(MAX_DAYS, day));
      if (clamped !== lastReported.current) {
        lastReported.current = clamped;
        onChange(clamped);
      }
    },
    [onChange, SLOT],
  );

  // Compute start + end dates
  const today = useMemo(() => new Date(), []);
  const endDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(today.getDate() + value - 1);
    return d;
  }, [today, value]);

  return (
    <View style={{ alignItems: 'center', width: '100%' }}>
      {/* Value pill */}
      <View style={{
        backgroundColor: T.card,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: Radius.pill,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: T.cardBorder,
        marginBottom: 18,
        shadowColor: '#000',
        shadowOpacity: isDark ? 0.4 : 0.06,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
      }}>
        <Text style={{
          fontFamily: Font.displayBold,
          fontSize: 19,
          color: T.text,
          letterSpacing: -0.4,
        }}>
          {value} days
        </Text>
      </View>

      {/* Slider area */}
      <View style={{ width: containerW, height: 56, position: 'relative' }}>
        {/* Center indicator (the selected tick) */}
        <View
          pointerEvents='none'
          style={{
            position: 'absolute',
            left: padding,
            top: 0,
            width: TICK_W + 1,
            height: 56,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2,
          }}>
          <View style={{
            width: 3,
            height: 48,
            backgroundColor: T.text,
            borderRadius: 2,
          }} />
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={SLOT}
          decelerationRate='fast'
          onScroll={handleScroll}
          scrollEventThrottle={32}
          contentContainerStyle={{
            paddingHorizontal: padding,
            alignItems: 'center',
            height: 56,
          }}>
          {Array.from({ length: range }).map((_, i) => {
            const day = i + MIN_DAYS;
            const isTen = day % 10 === 0;
            const isFive = day % 5 === 0 && !isTen;
            const h = isTen ? 36 : isFive ? 26 : 18;
            const opacity = isTen ? 0.62 : isFive ? 0.42 : 0.24;
            return (
              <View
                key={i}
                style={{
                  width: TICK_W,
                  marginRight: TICK_GAP,
                  height: 48,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                <View style={{
                  width: TICK_W,
                  height: h,
                  backgroundColor: T.text,
                  opacity,
                  borderRadius: 1,
                }} />
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Date range */}
      <Text style={{
        marginTop: 16,
        fontFamily: Font.bodyMed,
        fontSize: 14,
        color: T.textDim,
        letterSpacing: -0.05,
      }}>
        {formatDate(today)}  →  {formatDate(endDate)}
      </Text>
    </View>
  );
}

// ─── Custom Habit Row ───────────────────────────────────────────────────────

function HabitRow({
  text,
  onRemove,
  T,
}: { text: string; onRemove: () => void; T: Theme }) {
  return (
    <Animated.View
      layout={Layout.springify().damping(18)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: T.card,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: T.cardBorder,
        borderRadius: Radius.md,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 12,
      }}>
      <View style={{
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: T.hairline,
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Text style={{ fontFamily: Font.icon, fontSize: 18, color: T.text, lineHeight: 20 }}>
          task_alt
        </Text>
      </View>
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          fontFamily: Font.bodyMed,
          fontSize: 14,
          color: T.text,
          letterSpacing: -0.1,
        }}>
        {text}
      </Text>
      <Pressable
        onPress={onRemove}
        hitSlop={10}
        style={({ pressed }) => ({
          opacity: pressed ? 0.4 : 1,
          padding: 4,
        })}>
        <Text style={{ fontFamily: Font.icon, fontSize: 18, color: T.textDim, lineHeight: 20 }}>
          close
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function CustomizeScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const { state, update } = useOnboarding();
  const challenge = getChallenge(state.challenge);

  const [habitInput, setHabitInput] = useState('');

  const addHabit = useCallback(() => {
    const text = habitInput.trim();
    if (!text) return;
    if (state.customHabits.includes(text)) {
      setHabitInput('');
      return;
    }
    update('customHabits', [...state.customHabits, text]);
    setHabitInput('');
  }, [habitInput, state.customHabits, update]);

  const removeHabit = useCallback((text: string) => {
    update('customHabits', state.customHabits.filter(h => h !== text));
  }, [state.customHabits, update]);

  return (
    <OnboardingFrame
      step={5}
      onContinue={() => router.push('/onboarding/why')}
      continueLabel='Continue'>
      <View style={{ flex: 1 }}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={{
            fontFamily: Font.bodyMed,
            fontSize: 11,
            letterSpacing: 2.4,
            color: T.textDim,
            marginBottom: 12,
          }}>
            STEP 04 — CUSTOMIZE
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(440)}>
          <Text style={{
            fontFamily: Font.displayBlack,
            fontSize: 36,
            color: T.text,
            letterSpacing: -1.2,
            lineHeight: 40,
            marginBottom: 6,
          }}>
            Set your length.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(440)}>
          <Text style={{
            fontFamily: Font.bodyReg,
            fontSize: 14,
            color: T.textDim,
            lineHeight: 20,
            marginBottom: 32,
          }}>
            {challenge?.name === '75 Hard'
              ? 'The original is 75 days. Most stick with that.'
              : 'Pick a duration. Shorter to ease in, longer for the deep work.'}
          </Text>
        </Animated.View>

        {/* Length slider */}
        <Animated.View entering={FadeInDown.delay(260).duration(480)} style={{ marginBottom: 40 }}>
          <LengthSlider
            value={state.challengeLength}
            onChange={(v) => update('challengeLength', v)}
            T={T}
            isDark={isDark}
          />
        </Animated.View>

        {/* Divider */}
        <View style={{
          height: StyleSheet.hairlineWidth,
          backgroundColor: T.hairline,
          marginBottom: 28,
        }} />

        {/* Custom habits */}
        <Animated.View entering={FadeInDown.delay(380).duration(440)}>
          <Text style={{
            fontFamily: Font.displayBold,
            fontSize: 22,
            color: T.text,
            letterSpacing: -0.6,
            marginBottom: 6,
          }}>
            Add habits (optional).
          </Text>
          <Text style={{
            fontFamily: Font.bodyReg,
            fontSize: 13.5,
            color: T.textDim,
            lineHeight: 19,
            marginBottom: 16,
            letterSpacing: -0.05,
          }}>
            Stack things you want to commit to daily — cold shower, meditation, anything.
          </Text>
        </Animated.View>

        {/* Input row */}
        <Animated.View
          entering={FadeInDown.delay(460).duration(440)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginBottom: 14,
          }}>
          <View style={{
            flex: 1,
            backgroundColor: T.card,
            borderRadius: Radius.md,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: T.cardBorder,
            paddingHorizontal: 14,
            height: 50,
            justifyContent: 'center',
          }}>
            <TextInput
              value={habitInput}
              onChangeText={setHabitInput}
              onSubmitEditing={addHabit}
              placeholder='e.g. Cold shower in the morning'
              placeholderTextColor={T.textSubtle}
              returnKeyType='done'
              style={{
                fontFamily: Font.bodyMed,
                fontSize: 14,
                color: T.text,
                letterSpacing: -0.1,
              }}
            />
          </View>
          <Pressable
            onPress={addHabit}
            disabled={!habitInput.trim()}
            style={({ pressed }) => ({
              width: 50,
              height: 50,
              borderRadius: 50,
              backgroundColor: T.invertBg,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: !habitInput.trim() ? 0.35 : (pressed ? 0.78 : 1),
            })}>
            <Text style={{ fontFamily: Font.icon, fontSize: 22, color: T.invertText, lineHeight: 24 }}>
              add
            </Text>
          </Pressable>
        </Animated.View>

        {/* Habit list */}
        <View style={{ gap: 10, marginTop: 4 }}>
          {state.customHabits.map((h) => (
            <HabitRow
              key={h}
              text={h}
              onRemove={() => removeHabit(h)}
              T={T}
            />
          ))}
        </View>

        {state.customHabits.length === 0 && (
          <Text style={{
            fontFamily: Font.bodyReg,
            fontSize: 12.5,
            color: T.textSubtle,
            textAlign: 'center',
            marginTop: 8,
          }}>
            No extras yet. You can add some now or skip this step.
          </Text>
        )}
      </View>
    </OnboardingFrame>
  );
}
