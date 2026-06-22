import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { OnboardingFrame } from '@/components/onboarding-frame';
import { Colors, Font, Radius, type Theme } from '@/constants/theme';
import { getChallenge, type ChallengeTask } from '@/constants/challenges';
import { useOnboarding } from '@/lib/onboarding-store';

function RuleRow({
  index,
  task,
  isLast,
  T,
}: { index: number; task: ChallengeTask; isLast: boolean; T: Theme }) {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      gap: 14,
      borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
      borderBottomColor: T.hairline,
    }}>
      <View style={{
        width: 42, height: 42, borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth, borderColor: T.cardBorder,
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Text style={{
          fontFamily: Font.icon,
          fontSize: 22,
          color: T.text,
          lineHeight: 24,
        }}>
          {task.icon}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontFamily: Font.displaySemi,
          fontSize: 15,
          color: T.text,
          letterSpacing: -0.2,
        }}>
          {task.label}
        </Text>
        <Text style={{
          fontFamily: Font.bodyReg,
          fontSize: 12.5,
          color: T.textDim,
          marginTop: 2,
          letterSpacing: -0.05,
        }}>
          {task.meta}
        </Text>
      </View>
      <Text style={{
        fontFamily: Font.bodyMed,
        fontSize: 10,
        letterSpacing: 1.2,
        color: T.textSubtle,
      }}>
        {String(index + 1).padStart(2, '0')}
      </Text>
    </View>
  );
}

export default function RulesScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const { state } = useOnboarding();
  const challenge = getChallenge(state.challenge);

  if (!challenge) {
    // Shouldn't happen if user came through the proper flow
    return (
      <OnboardingFrame step={7} onContinue={() => router.replace('/onboarding/challenge')}>
        <Text style={{ color: T.text, fontFamily: Font.bodyMed }}>
          No challenge selected. Go back.
        </Text>
      </OnboardingFrame>
    );
  }

  const isCustom = challenge.id === 'custom';

  return (
    <OnboardingFrame
      step={7}
      onContinue={() => router.push('/onboarding/customize')}>
      <View style={{ flex: 1 }}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={{
            fontFamily: Font.bodyMed,
            fontSize: 11,
            letterSpacing: 2.4,
            color: T.textDim,
            marginBottom: 12,
          }}>
            THE RULES
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(440)}>
          <Text style={{
            fontFamily: Font.displayBlack,
            fontSize: 38,
            color: T.text,
            letterSpacing: -1.4,
            lineHeight: 42,
            marginBottom: 6,
          }}>
            {challenge.name}.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(440)}>
          <Text style={{
            fontFamily: Font.bodyReg,
            fontSize: 15,
            color: T.textDim,
            lineHeight: 22,
            marginBottom: 24,
          }}>
            {challenge.description}
          </Text>
        </Animated.View>

        {/* Task list */}
        {!isCustom && (
          <Animated.View
            entering={FadeInDown.delay(280).duration(480)}
            style={{
              backgroundColor: T.card,
              borderRadius: Radius.lg,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: T.cardBorder,
              paddingHorizontal: 16,
              paddingVertical: 6,
            }}>
            {challenge.tasks.map((task, i) => (
              <RuleRow
                key={task.id}
                index={i}
                task={task}
                isLast={i === challenge.tasks.length - 1}
                T={T}
              />
            ))}
          </Animated.View>
        )}

        {isCustom && (
          <Animated.View
            entering={FadeInDown.delay(280).duration(480)}
            style={{
              backgroundColor: T.card,
              borderRadius: Radius.lg,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: T.cardBorder,
              padding: 18,
            }}>
            <Text style={{
              fontFamily: Font.displaySemi,
              fontSize: 15,
              color: T.text,
              marginBottom: 8,
            }}>
              You&apos;ll define your own rules next.
            </Text>
            <Text style={{
              fontFamily: Font.bodyReg,
              fontSize: 13,
              color: T.textDim,
              lineHeight: 20,
            }}>
              Pick your duration and add the daily habits you want to commit to.
            </Text>
          </Animated.View>
        )}

        {/* Footer note */}
        <Animated.View entering={FadeInDown.delay(440).duration(440)} style={{ marginTop: 24 }}>
          <Text style={{
            fontFamily: Font.bodyReg,
            fontSize: 13,
            color: T.textSubtle,
            letterSpacing: -0.05,
            textAlign: 'center',
          }}>
            No skipping. No shortcuts.{'\n'}Miss a day and you start over.
          </Text>
        </Animated.View>
      </View>
    </OnboardingFrame>
  );
}
