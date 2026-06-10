import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { OnboardingFrame } from '@/components/onboarding-frame';
import { Colors, Font, Radius, type Theme } from '@/constants/theme';
import { useOnboarding } from '@/lib/onboarding-store';
import { CHALLENGES, type Challenge } from '@/constants/challenges';

function DifficultyDots({ level, T }: { level: number; T: Theme }) {
  if (level === 0) {
    return (
      <Text style={{
        fontFamily: Font.bodyMed,
        fontSize: 10,
        letterSpacing: 1.4,
        color: T.textSubtle,
      }}>
        VARIES
      </Text>
    );
  }
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: 5,
            backgroundColor: i < level ? T.text : T.hairline,
          }}
        />
      ))}
    </View>
  );
}

function ChallengeCard({
  challenge,
  selected,
  onPress,
  T,
  isDark,
}: {
  challenge: Challenge;
  selected: boolean;
  onPress: () => void;
  T: Theme;
  isDark: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: selected ? T.invertBg : T.card,
        borderRadius: Radius.lg,
        borderWidth: selected ? 0 : StyleSheet.hairlineWidth,
        borderColor: T.cardBorder,
        padding: 18,
        gap: 6,
        opacity: pressed ? 0.78 : 1,
      })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{
          fontFamily: Font.displayBold,
          fontSize: 20,
          color: selected ? T.invertText : T.text,
          letterSpacing: -0.5,
        }}>
          {challenge.name}
        </Text>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: selected ? 'rgba(255,255,255,0.12)' : T.hairline,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: Radius.pill,
        }}>
          <Text style={{
            fontFamily: Font.bodyMed,
            fontSize: 11,
            letterSpacing: 0.3,
            color: selected ? T.invertText : T.textDim,
          }}>
            {challenge.defaultDuration} DAYS
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <DifficultyDots
          level={challenge.difficulty}
          T={selected ? {
            ...T,
            text: T.invertText,
            hairline: 'rgba(255,255,255,0.18)',
            textSubtle: 'rgba(255,255,255,0.45)',
          } : T}
        />
        <Text style={{
          fontFamily: Font.bodyReg,
          fontSize: 13,
          color: selected ? 'rgba(255,255,255,0.65)' : T.textDim,
          letterSpacing: -0.05,
        }}>
          {challenge.summary}
        </Text>
      </View>
    </Pressable>
  );
}

export default function ChallengeScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const { state, update } = useOnboarding();
  const selected = state.challenge;

  const handleSelect = (id: typeof CHALLENGES[number]['id']) => {
    update('challenge', id);
    const c = CHALLENGES.find(x => x.id === id);
    if (c) update('challengeLength', c.defaultDuration);
  };

  const handleContinue = () => {
    if (selected) router.push('/onboarding/rules');
  };

  return (
    <OnboardingFrame
      step={3}
      onContinue={handleContinue}
      continueDisabled={!selected}>
      <View style={{ flex: 1 }}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={{
            fontFamily: Font.bodyMed,
            fontSize: 11,
            letterSpacing: 2.4,
            color: T.textDim,
            marginBottom: 12,
          }}>
            STEP 02 — YOUR CHALLENGE
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(440)}>
          <Text style={{
            fontFamily: Font.displayBlack,
            fontSize: 36,
            color: T.text,
            letterSpacing: -1.2,
            lineHeight: 40,
            marginBottom: 8,
          }}>
            Pick your challenge.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(440)}>
          <Text style={{
            fontFamily: Font.bodyReg,
            fontSize: 14,
            color: T.textDim,
            lineHeight: 20,
            marginBottom: 24,
          }}>
            You can adjust the length and add habits in the next step.
          </Text>
        </Animated.View>

        <View style={{ gap: 12, paddingBottom: 12 }}>
          {CHALLENGES.map((c, i) => (
            <Animated.View key={c.id} entering={FadeInDown.delay(260 + i * 80).duration(420)}>
              <ChallengeCard
                challenge={c}
                selected={selected === c.id}
                onPress={() => handleSelect(c.id)}
                T={T}
                isDark={isDark}
              />
            </Animated.View>
          ))}
        </View>
      </View>
    </OnboardingFrame>
  );
}
