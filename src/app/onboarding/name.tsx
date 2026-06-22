import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { OnboardingFrame } from '@/components/onboarding-frame';
import { Colors, Font, Radius } from '@/constants/theme';
import { useOnboarding } from '@/lib/onboarding-store';

export default function NameScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const { state, update } = useOnboarding();
  const [name, setName] = useState(state.name);

  const trimmed = name.trim();
  const canContinue = trimmed.length >= 2;

  const handleContinue = () => {
    update('name', trimmed);
    router.push('/onboarding/why');
  };

  return (
    <OnboardingFrame
      step={2}
      onContinue={handleContinue}
      continueDisabled={!canContinue}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={{
            fontFamily: Font.bodyMed,
            fontSize: 11,
            letterSpacing: 2.4,
            color: T.textDim,
            marginBottom: 12,
          }}>
            IDENTITY
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(440)}>
          <Text style={{
            fontFamily: Font.displayBlack,
            fontSize: 38,
            color: T.text,
            letterSpacing: -1.4,
            lineHeight: 42,
            marginBottom: 10,
          }}>
            What should we call you?
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(440)}>
          <Text style={{
            fontFamily: Font.bodyReg,
            fontSize: 14,
            color: T.textDim,
            lineHeight: 20,
            marginBottom: 36,
          }}>
            We&apos;ll greet you by name every morning of the challenge.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(320).duration(440)}>
          <TextInput
            value={name}
            onChangeText={setName}
            autoFocus
            placeholder='Your name'
            placeholderTextColor={T.textSubtle}
            autoCapitalize='words'
            autoComplete='name'
            returnKeyType='done'
            onSubmitEditing={canContinue ? handleContinue : undefined}
            style={{
              backgroundColor: T.card,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: T.cardBorder,
              borderRadius: Radius.lg,
              paddingHorizontal: 18,
              height: 60,
              fontSize: 22,
              fontFamily: Font.displaySemi,
              color: T.text,
              letterSpacing: -0.4,
            }}
          />
        </Animated.View>
      </View>
    </OnboardingFrame>
  );
}
