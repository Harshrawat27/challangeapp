import { router } from 'expo-router';
import { Pressable, Text, View, useColorScheme } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Font, MaxContentWidth, Radius } from '@/constants/theme';

export default function Welcome() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  return (
    <View
      style={{ flex: 1, backgroundColor: T.background, alignItems: 'center' }}
    >
      <SafeAreaView
        style={{ flex: 1, width: '100%', maxWidth: MaxContentWidth }}
        edges={['top', 'bottom']}
      >
        {/* Hero */}
        <View
          style={{ flex: 1, paddingHorizontal: 28, justifyContent: 'center' }}
        >
          <Animated.View entering={FadeIn.duration(500)}>
            <Text
              style={{
                fontFamily: Font.bodyMed,
                fontSize: 11,
                letterSpacing: 4,
                color: T.textDim,
              }}
            >
              75 / HARD
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(620)}>
            <Text
              style={{
                fontFamily: Font.displayBlack,
                fontSize: 52,
                color: T.text,
                letterSpacing: -2,
                lineHeight: 56,
                marginTop: 18,
              }}
            >
              75 days that change everything.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(280).duration(560)}>
            <Text
              style={{
                fontFamily: Font.bodyReg,
                fontSize: 16,
                color: T.textDim,
                lineHeight: 24,
                marginTop: 20,
                letterSpacing: -0.1,
              }}
            >
              Pick a challenge. Lock in. We make sure you don&apos;t quit.
            </Text>
          </Animated.View>
        </View>

        {/* CTA */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 12 }}>
          <Animated.View entering={FadeInDown.delay(440).duration(440)}>
            <Pressable
              onPress={() => router.push('/onboarding/name')}
              style={({ pressed }) => ({
                height: 54,
                borderRadius: Radius.pill,
                backgroundColor: T.invertBg,
                justifyContent: 'center',
                alignItems: 'center',
                opacity: pressed ? 0.78 : 1,
              })}
            >
              <Text
                style={{
                  fontFamily: Font.displaySemi,
                  fontSize: 16,
                  color: T.invertText,
                  letterSpacing: -0.2,
                }}
              >
                Begin
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/onboarding/sign-in')}
              style={({ pressed }) => ({
                alignItems: 'center',
                marginTop: 18,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  fontFamily: Font.bodyReg,
                  fontSize: 13,
                  color: T.textDim,
                }}
              >
                Already have an account?{' '}
                <Text style={{ fontFamily: Font.bodySemi, color: T.text }}>
                  Sign in
                </Text>
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}
