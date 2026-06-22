import { Text, View, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { OnboardingFrame } from '@/components/onboarding-frame';
import { Colors, Font, Radius, type Theme } from '@/constants/theme';
import { useOnboarding } from '@/lib/onboarding-store';
import type { ChallengeId } from '@/constants/challenges';

type Stat = { value: string; label: string };

function computeStats(challenge: ChallengeId | null, length: number, customHabits: string[]): Stat[] {
  const days = length;
  switch (challenge) {
    case '75-hard':
      return [
        { value: `${days * 2}`,             label: 'workouts'        },
        { value: `${days * 10}`,            label: 'pages read'      },
        { value: `${days}`,                 label: 'gallons of water' },
        { value: `${days}`,                 label: 'progress photos' },
      ];
    case '75-medium':
      return [
        { value: `${days}`,                 label: 'workouts'        },
        { value: `${days * 10}`,            label: 'pages read'      },
        { value: `${days}`,                 label: 'gallons of water' },
        { value: `${days}`,                 label: 'progress photos' },
      ];
    case '75-soft':
      return [
        { value: `${days * 30}m`,           label: 'movement'        },
        { value: `${days * 3}L`,            label: 'water consumed'  },
        { value: `${days * 10}`,            label: 'pages or audio'  },
        { value: `${days}`,                 label: 'reflections'     },
      ];
    case 'monk-mode':
      return [
        { value: `${days * 2}`,             label: 'deep work blocks' },
        { value: `${days}`,                 label: 'journal entries'  },
        { value: `${days}`,                 label: 'sober days'       },
        { value: `${days * 7}h+`,           label: 'restful sleep'    },
      ];
    case 'custom':
    default:
      return [
        { value: `${days}`,                 label: 'days of practice' },
        { value: `${customHabits.length || 0}`, label: 'daily habits' },
      ];
  }
}

function StatRow({ stat, T, isLast }: { stat: Stat; T: Theme; isLast: boolean }) {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      paddingVertical: 16,
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: T.hairline,
    }}>
      <Text style={{
        fontFamily: Font.displayBlack,
        fontSize: 38,
        color: T.text,
        letterSpacing: -1.5,
        lineHeight: 42,
      }}>
        {stat.value}
      </Text>
      <Text style={{
        fontFamily: Font.bodyMed,
        fontSize: 13,
        color: T.textDim,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
      }}>
        {stat.label}
      </Text>
    </View>
  );
}

export default function TransformationScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const { state } = useOnboarding();
  const firstName = state.name.split(/\s+/)[0] || 'you';
  const stats = computeStats(state.challenge, state.challengeLength, state.customHabits);

  return (
    <OnboardingFrame
      step={9}
      onContinue={() => router.push('/onboarding/proof')}>
      <View style={{ flex: 1 }}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={{
            fontFamily: Font.bodyMed, fontSize: 11, letterSpacing: 2.4, color: T.textDim,
            marginBottom: 12,
          }}>
            YOUR PROJECTION
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(440)}>
          <Text style={{
            fontFamily: Font.displayBlack, fontSize: 38, color: T.text,
            letterSpacing: -1.4, lineHeight: 42, marginBottom: 10,
          }}>
            {firstName}, in {state.challengeLength} days you&apos;ll have done…
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(220).duration(560)}
          style={{
            backgroundColor: T.card,
            borderRadius: Radius.lg,
            borderWidth: 1,
            borderColor: T.cardBorder,
            paddingHorizontal: 20,
            paddingVertical: 6,
            marginTop: 24,
          }}>
          {stats.map((s, i) => (
            <Animated.View
              key={s.label}
              entering={FadeInDown.delay(360 + i * 80).duration(440)}>
              <StatRow stat={s} T={T} isLast={i === stats.length - 1} />
            </Animated.View>
          ))}
        </Animated.View>

        {/* Footer */}
        <Animated.View entering={FadeIn.delay(720).duration(440)} style={{ marginTop: 24 }}>
          <Text style={{
            fontFamily: Font.bodyReg,
            fontSize: 13.5,
            color: T.textSubtle,
            lineHeight: 19,
            textAlign: 'center',
            letterSpacing: -0.05,
          }}>
            This isn&apos;t a promise. It&apos;s a calendar.{'\n'}You either do the work, or you don&apos;t.
          </Text>
        </Animated.View>
      </View>
    </OnboardingFrame>
  );
}
