import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { OnboardingFrame } from '@/components/onboarding-frame';
import { Colors, Font, Radius, type Theme } from '@/constants/theme';
import { useOnboarding } from '@/lib/onboarding-store';

const OPTIONS = [
  { id: 'discipline',   label: 'Build discipline',  icon: 'fitness_center' },
  { id: 'weight',       label: 'Lose weight',       icon: 'monitor_weight' },
  { id: 'toughness',    label: 'Mental toughness',  icon: 'psychology' },
  { id: 'restart',      label: 'Restart my life',   icon: 'restart_alt' },
  { id: 'identity',     label: 'Build identity',    icon: 'verified_user' },
  { id: 'quit',         label: 'Quit something',    icon: 'block' },
];

function Chip({ label, icon, selected, onPress, T }: {
  label: string; icon: string; selected: boolean; onPress: () => void; T: Theme;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexBasis: '48%',
        backgroundColor: selected ? T.invertBg : T.card,
        borderWidth: selected ? 0 : StyleSheet.hairlineWidth,
        borderColor: T.cardBorder,
        borderRadius: Radius.lg,
        paddingHorizontal: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        opacity: pressed ? 0.78 : 1,
      })}>
      <Text style={{
        fontFamily: Font.icon,
        fontSize: 20,
        color: selected ? T.invertText : T.text,
        lineHeight: 22,
      }}>
        {icon}
      </Text>
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          fontFamily: Font.displaySemi,
          fontSize: 14,
          color: selected ? T.invertText : T.text,
          letterSpacing: -0.2,
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function WhyScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const { state, update } = useOnboarding();
  const selected = state.whyMotivations;

  const toggle = (id: string) => {
    update('whyMotivations',
      selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id],
    );
  };

  return (
    <OnboardingFrame
      step={6}
      onContinue={() => router.push('/onboarding/failures')}
      continueDisabled={selected.length === 0}>
      <View style={{ flex: 1 }}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={{
            fontFamily: Font.bodyMed, fontSize: 11, letterSpacing: 2.4, color: T.textDim,
            marginBottom: 12,
          }}>
            STEP 05 — YOUR WHY
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(440)}>
          <Text style={{
            fontFamily: Font.displayBlack, fontSize: 36, color: T.text,
            letterSpacing: -1.2, lineHeight: 40, marginBottom: 8,
          }}>
            What pulled you here?
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(440)}>
          <Text style={{
            fontFamily: Font.bodyReg, fontSize: 14, color: T.textDim, lineHeight: 20,
            marginBottom: 24,
          }}>
            Pick one or more. You&apos;ll thank yourself for being honest on Day 40.
          </Text>
        </Animated.View>

        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 10,
          justifyContent: 'space-between',
        }}>
          {OPTIONS.map((opt, i) => (
            <Animated.View
              key={opt.id}
              entering={FadeInDown.delay(240 + i * 60).duration(440)}
              style={{ flexBasis: '48%' }}>
              <Chip
                label={opt.label}
                icon={opt.icon}
                selected={selected.includes(opt.id)}
                onPress={() => toggle(opt.id)}
                T={T}
              />
            </Animated.View>
          ))}
        </View>
      </View>
    </OnboardingFrame>
  );
}
