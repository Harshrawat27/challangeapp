import { Pressable, Share, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { OnboardingFrame } from '@/components/onboarding-frame';
import { Colors, Font, type Theme } from '@/constants/theme';
import { useOnboarding } from '@/lib/onboarding-store';
import { getChallenge } from '@/constants/challenges';

function StackedAvatars({ T }: { T: Theme }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
      {[0, 1].map(i => (
        <View
          key={i}
          style={{
            width: 84,
            height: 84,
            borderRadius: 84,
            backgroundColor: T.card,
            borderWidth: 1.5,
            borderColor: T.cardBorder,
            marginLeft: i === 0 ? 0 : -28,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <Text style={{
            fontFamily: Font.icon,
            fontSize: 38,
            color: T.textSubtle,
            lineHeight: 42,
          }}>
            person
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function PartnerScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const { state, update } = useOnboarding();
  const challenge = getChallenge(state.challenge);

  const handleInvite = async () => {
    update('partnerInvited', true);
    try {
      await Share.share({
        message: `I'm doing ${challenge?.name ?? '75 Hard'} for ${state.challengeLength} days. Join me — we'll keep each other honest.`,
      });
    } catch {
      // user cancelled share — still proceed
    }
    router.push('/onboarding/notifications');
  };

  const handleSkip = () => {
    update('partnerInvited', false);
    router.push('/onboarding/notifications');
  };

  return (
    <OnboardingFrame
      step={12}
      onContinue={handleInvite}
      continueLabel='Invite a friend'
      bottomAccessory={
        <View style={{ alignItems: 'center', marginBottom: 14 }}>
          <Pressable
            onPress={handleSkip}
            hitSlop={10}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, paddingVertical: 4 })}>
            <Text style={{
              fontFamily: Font.bodyMed,
              fontSize: 13,
              color: T.textSubtle,
              letterSpacing: -0.05,
              textDecorationLine: 'underline',
            }}>
              I&apos;ll do it solo
            </Text>
          </Pressable>
        </View>
      }>
      <View style={{ flex: 1 }}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={{
            fontFamily: Font.bodyMed, fontSize: 11, letterSpacing: 2.4, color: T.textDim,
            marginBottom: 12,
          }}>
            STEP 11 — ACCOUNTABILITY
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
            Hard is easier together.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(440)}>
          <Text style={{
            fontFamily: Font.bodyReg, fontSize: 14, color: T.textDim, lineHeight: 20,
            marginBottom: 36,
          }}>
            Bring someone with you. You&apos;ll check in on each other every night.
          </Text>
        </Animated.View>

        {/* Hero stat */}
        <Animated.View
          entering={FadeInDown.delay(260).duration(520)}
          style={{ alignItems: 'center', marginVertical: 12, gap: 24 }}>

          <StackedAvatars T={T} />

          <View style={{ alignItems: 'center' }}>
            <Text style={{
              fontFamily: Font.displayBlack,
              fontSize: 64,
              color: T.text,
              letterSpacing: -3,
              lineHeight: 68,
            }}>
              30%
            </Text>
            <Text style={{
              fontFamily: Font.bodyMed,
              fontSize: 15,
              color: T.textDim,
              letterSpacing: -0.1,
              textAlign: 'center',
              lineHeight: 22,
              marginTop: 4,
              maxWidth: 280,
            }}>
              More likely to finish when you do it with a friend.
            </Text>
          </View>
        </Animated.View>
      </View>
    </OnboardingFrame>
  );
}
