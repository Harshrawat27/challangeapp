import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { OnboardingFrame } from '@/components/onboarding-frame';
import { Colors, Font, Radius, type Theme } from '@/constants/theme';
import { useOnboarding } from '@/lib/onboarding-store';

const FIRST_TIMER_ID = 'never_tried';

const OPTIONS = [
  { id: FIRST_TIMER_ID, label: "I haven't tried one before" },
  { id: 'workouts',     label: 'Skipped a workout' },
  { id: 'cheats',       label: 'Cheat meals' },
  { id: 'motivation',   label: 'Lost motivation' },
  { id: 'busy',         label: 'Got too busy' },
  { id: 'collapsed',    label: 'Everything fell apart' },
];

function Row({ label, selected, onPress, T }: {
  label: string; selected: boolean; onPress: () => void; T: Theme;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: selected ? T.invertBg : T.card,
        borderWidth: selected ? 0 : StyleSheet.hairlineWidth,
        borderColor: T.cardBorder,
        borderRadius: Radius.lg,
        paddingHorizontal: 16, paddingVertical: 14,
        gap: 12,
        opacity: pressed ? 0.78 : 1,
      })}>
      <View style={{
        width: 22, height: 22, borderRadius: 22,
        borderWidth: 1.5,
        borderColor: selected ? T.invertText : T.cardBorder,
        backgroundColor: selected ? T.invertText : 'transparent',
        justifyContent: 'center', alignItems: 'center',
      }}>
        {selected && (
          <Text style={{ fontFamily: Font.icon, fontSize: 14, color: T.invertBg, lineHeight: 16 }}>
            check
          </Text>
        )}
      </View>
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          fontFamily: Font.displaySemi,
          fontSize: 15,
          color: selected ? T.invertText : T.text,
          letterSpacing: -0.2,
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function FailuresScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const { state, update } = useOnboarding();
  const selected = state.pastFailures;
  const isFirstTimer = selected.includes(FIRST_TIMER_ID);

  const toggle = (id: string) => {
    if (id === FIRST_TIMER_ID) {
      // Exclusive — clear all others
      update('pastFailures', selected.includes(FIRST_TIMER_ID) ? [] : [FIRST_TIMER_ID]);
      return;
    }
    // Toggling any other clears the first-timer flag
    const without = selected.filter(s => s !== FIRST_TIMER_ID && s !== id);
    update('pastFailures', selected.includes(id) ? without : [...without, id]);
  };

  return (
    <OnboardingFrame
      step={4}
      onContinue={() => router.push('/onboarding/serious')}
      continueDisabled={selected.length === 0}>
      <View style={{ flex: 1 }}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={{
            fontFamily: Font.bodyMed, fontSize: 11, letterSpacing: 2.4, color: T.textDim,
            marginBottom: 12,
          }}>
            HONESTY
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(440)}>
          <Text style={{
            fontFamily: Font.displayBlack, fontSize: 36, color: T.text,
            letterSpacing: -1.2, lineHeight: 40, marginBottom: 8,
          }}>
            Why have past challenges fizzled?
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(440)}>
          <Text style={{
            fontFamily: Font.bodyReg, fontSize: 14, color: T.textDim, lineHeight: 20,
            marginBottom: 24,
          }}>
            Most people fail at one of these. We&apos;re going to make sure you don&apos;t.
          </Text>
        </Animated.View>

        <View style={{ gap: 10 }}>
          {OPTIONS.map((opt, i) => {
            const dimmed = isFirstTimer && opt.id !== FIRST_TIMER_ID;
            return (
              <Animated.View
                key={opt.id}
                entering={FadeInDown.delay(240 + i * 60).duration(420)}
                style={{ opacity: dimmed ? 0.35 : 1 }}>
                <Row
                  label={opt.label}
                  selected={selected.includes(opt.id)}
                  onPress={() => toggle(opt.id)}
                  T={T}
                />
              </Animated.View>
            );
          })}
        </View>
      </View>
    </OnboardingFrame>
  );
}
