import { Pressable, Text, View, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { OnboardingFrame } from '@/components/onboarding-frame';
import { Colors, Font, type Theme } from '@/constants/theme';
import { useOnboarding } from '@/lib/onboarding-store';

function levelCopy(n: number, length: number): { headline: string; sub: string } {
  if (n <= 3) return {
    headline: 'Be honest with yourself.',
    sub: `Casual won't survive ${length} days. Crank it up.`,
  };
  if (n <= 6) return {
    headline: 'You\'re warming up.',
    sub: 'Good — but you\'ll need more than this when motivation dies.',
  };
  if (n <= 8) return {
    headline: 'Now we\'re talking.',
    sub: 'This is the energy that finishes challenges.',
  };
  return {
    headline: 'All in.',
    sub: 'Lock the door behind you. Let\'s go.',
  };
}

function Pill({ index, selected, onPress, T }: {
  index: number; selected: boolean; onPress: () => void; T: Theme;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        height: 56,
        borderRadius: 8,
        backgroundColor: selected ? T.invertBg : T.card,
        borderWidth: selected ? 0 : 1,
        borderColor: T.cardBorder,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: pressed ? 0.75 : 1,
      })}>
      <Text style={{
        fontFamily: Font.displayBold,
        fontSize: 14,
        color: selected ? T.invertText : T.textDim,
        letterSpacing: -0.2,
      }}>
        {index}
      </Text>
    </Pressable>
  );
}

export default function SeriousScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const { state, update } = useOnboarding();
  const value = state.seriousness;
  const copy = levelCopy(value, state.challengeLength);

  return (
    <OnboardingFrame
      step={5}
      onContinue={() => router.push('/onboarding/personalizing')}>
      <View style={{ flex: 1 }}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={{
            fontFamily: Font.bodyMed, fontSize: 11, letterSpacing: 2.4, color: T.textDim,
            marginBottom: 12,
          }}>
            COMMITMENT
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(440)}>
          <Text style={{
            fontFamily: Font.displayBlack, fontSize: 36, color: T.text,
            letterSpacing: -1.2, lineHeight: 40, marginBottom: 8,
          }}>
            How serious are you?
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(440)}>
          <Text style={{
            fontFamily: Font.bodyReg, fontSize: 14, color: T.textDim, lineHeight: 20,
            marginBottom: 36,
          }}>
            1 means curious. 10 means there is no plan B.
          </Text>
        </Animated.View>

        {/* Pill slider */}
        <Animated.View entering={FadeInDown.delay(280).duration(460)}
          style={{ flexDirection: 'row', gap: 6, marginBottom: 36 }}>
          {Array.from({ length: 10 }).map((_, i) => {
            const n = i + 1;
            return (
              <Pill
                key={n}
                index={n}
                selected={value === n}
                onPress={() => update('seriousness', n)}
                T={T}
              />
            );
          })}
        </Animated.View>

        {/* Live copy */}
        <Animated.View entering={FadeIn.delay(380).duration(400)} key={`copy-${value}`}>
          <Text style={{
            fontFamily: Font.displayBold,
            fontSize: 24,
            color: T.text,
            letterSpacing: -0.6,
            marginBottom: 8,
            textAlign: 'center',
          }}>
            {copy.headline}
          </Text>
          <Text style={{
            fontFamily: Font.bodyReg,
            fontSize: 14,
            color: T.textDim,
            lineHeight: 20,
            textAlign: 'center',
            letterSpacing: -0.1,
            maxWidth: 320,
            alignSelf: 'center',
          }}>
            {copy.sub}
          </Text>
        </Animated.View>
      </View>
    </OnboardingFrame>
  );
}
