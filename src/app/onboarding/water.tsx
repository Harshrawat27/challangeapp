import { useState } from 'react';
import { Pressable, Text, TextInput, View, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { OnboardingFrame } from '@/components/onboarding-frame';
import { useOnboarding } from '@/lib/onboarding-store';
import { Colors, Font, Radius } from '@/constants/theme';

function mlToDisplay(ml: number): string {
  if (ml >= 1000) return `${(ml / 1000).toFixed(1).replace('.0', '')}L`;
  return `${ml}ml`;
}

function calcGoalMl(kg: number): number {
  return Math.round((kg * 35) / 50) * 50; // round to nearest 50ml
}

export default function WaterGoalScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];
  const { state, update } = useOnboarding();

  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [weightInput, setWeightInput] = useState(
    state.weightKg ? String(Math.round(unit === 'kg' ? state.weightKg : state.weightKg * 2.205)) : '',
  );
  const [goalMl, setGoalMl] = useState(state.waterGoalMl);

  const onWeightChange = (val: string) => {
    setWeightInput(val);
    const n = parseFloat(val);
    if (!isNaN(n) && n > 0) {
      const kg = unit === 'kg' ? n : n / 2.205;
      setGoalMl(calcGoalMl(kg));
    }
  };

  const switchUnit = (u: 'kg' | 'lbs') => {
    if (u === unit) return;
    const n = parseFloat(weightInput);
    if (!isNaN(n) && n > 0) {
      const converted = u === 'lbs' ? Math.round(n * 2.205) : Math.round(n / 2.205);
      setWeightInput(String(converted));
    }
    setUnit(u);
  };

  const adjustGoal = (delta: number) => {
    setGoalMl(prev => Math.max(500, Math.min(6000, prev + delta)));
  };

  const handleContinue = () => {
    const n = parseFloat(weightInput);
    const kg = (!isNaN(n) && n > 0) ? (unit === 'kg' ? n : n / 2.205) : null;
    update('weightKg', kg);
    update('waterGoalMl', goalMl);
    router.push('/onboarding/username');
  };

  return (
    <OnboardingFrame step={14} onContinue={handleContinue}>
      <View style={{ flex: 1 }}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={{
            fontFamily: Font.bodyMed, fontSize: 11, letterSpacing: 2.4, color: T.textDim,
            marginBottom: 12,
          }}>
            STEP 13 — HYDRATION
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(440)}>
          <Text style={{
            fontFamily: Font.displayBlack, fontSize: 36, color: T.text,
            letterSpacing: -1.2, lineHeight: 40, marginBottom: 8,
          }}>
            Stay hydrated.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(440)}>
          <Text style={{
            fontFamily: Font.bodyReg, fontSize: 14, color: T.textDim, lineHeight: 20,
            marginBottom: 32,
          }}>
            Enter your weight and we'll calculate your daily water goal. You can always adjust it.
          </Text>
        </Animated.View>

        {/* Weight input */}
        <Animated.View entering={FadeInDown.delay(240).duration(420)}>
          <Text style={{
            fontFamily: Font.bodyMed, fontSize: 11, letterSpacing: 1.8,
            color: T.textDim, marginBottom: 10,
          }}>
            YOUR WEIGHT
          </Text>

          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TextInput
              value={weightInput}
              onChangeText={onWeightChange}
              keyboardType='decimal-pad'
              placeholder='70'
              placeholderTextColor={T.textDim}
              style={{
                flex: 1,
                backgroundColor: T.card,
                borderRadius: Radius.lg,
                borderWidth: 1,
                borderColor: T.cardBorder,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontFamily: Font.displayBold,
                fontSize: 24,
                color: T.text,
                letterSpacing: -0.5,
              }}
            />

            {/* Unit toggle */}
            <View style={{
              flexDirection: 'row',
              backgroundColor: T.card,
              borderRadius: Radius.lg,
              borderWidth: 1,
              borderColor: T.cardBorder,
              overflow: 'hidden',
            }}>
              {(['kg', 'lbs'] as const).map(u => (
                <Pressable
                  key={u}
                  onPress={() => switchUnit(u)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    backgroundColor: unit === u ? T.invertBg : 'transparent',
                  }}>
                  <Text style={{
                    fontFamily: Font.displaySemi,
                    fontSize: 14,
                    color: unit === u ? T.invertText : T.textDim,
                    letterSpacing: -0.2,
                  }}>
                    {u}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Water goal */}
        <Animated.View entering={FadeInDown.delay(320).duration(420)} style={{ marginTop: 28 }}>
          <Text style={{
            fontFamily: Font.bodyMed, fontSize: 11, letterSpacing: 1.8,
            color: T.textDim, marginBottom: 10,
          }}>
            DAILY WATER GOAL
          </Text>

          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: T.card,
            borderRadius: Radius.lg,
            borderWidth: 1,
            borderColor: T.cardBorder,
            overflow: 'hidden',
          }}>
            <Pressable
              onPress={() => adjustGoal(-250)}
              style={({ pressed }) => ({
                width: 52, height: 56,
                justifyContent: 'center', alignItems: 'center',
                opacity: pressed ? 0.5 : 1,
              })}>
              <Text style={{ fontFamily: Font.displayBold, fontSize: 22, color: T.text }}>−</Text>
            </Pressable>

            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{
                fontFamily: Font.displayBlack,
                fontSize: 28,
                color: T.text,
                letterSpacing: -0.8,
              }}>
                {mlToDisplay(goalMl)}
              </Text>
              <Text style={{
                fontFamily: Font.bodyReg, fontSize: 11,
                color: T.textDim, marginTop: 2,
              }}>
                per day · ±250ml steps
              </Text>
            </View>

            <Pressable
              onPress={() => adjustGoal(250)}
              style={({ pressed }) => ({
                width: 52, height: 56,
                justifyContent: 'center', alignItems: 'center',
                opacity: pressed ? 0.5 : 1,
              })}>
              <Text style={{ fontFamily: Font.displayBold, fontSize: 22, color: T.text }}>+</Text>
            </Pressable>
          </View>

          <Text style={{
            fontFamily: Font.bodyReg, fontSize: 12,
            color: T.textDim, marginTop: 8, marginLeft: 2,
            letterSpacing: -0.05,
          }}>
            Based on weight × 35ml/kg · You can edit this anytime
          </Text>
        </Animated.View>
      </View>
    </OnboardingFrame>
  );
}
