import { useEffect, useState } from 'react';
import { Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Font, MaxContentWidth } from '@/constants/theme';

const LINES = [
  'Reviewing your goals…',
  'Matching challenge difficulty…',
  'Checking your commitment level…',
  'Almost there…',
];

const TOTAL_DURATION = 3200;
const STEP_DURATION = TOTAL_DURATION / LINES.length;

export default function PersonalizingScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const [lineIdx, setLineIdx] = useState(0);
  const progress = useSharedValue(0);

  // Animate progress bar
  useEffect(() => {
    progress.value = withTiming(1, {
      duration: TOTAL_DURATION,
      easing: Easing.out(Easing.quad),
    });
  }, [progress]);

  // Rotate copy lines
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    LINES.forEach((_, i) => {
      if (i === 0) return;
      timers.push(setTimeout(() => setLineIdx(i), STEP_DURATION * i));
    });
    // Navigate when done
    timers.push(setTimeout(() => {
      router.replace('/onboarding/challenge');
    }, TOTAL_DURATION + 200));
    return () => { timers.forEach(clearTimeout); };
  }, []);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: T.background, alignItems: 'center' }}>
      <SafeAreaView style={{ flex: 1, width: '100%', maxWidth: MaxContentWidth }} edges={['top', 'bottom']}>
        <View style={{ flex: 1, paddingHorizontal: 28, justifyContent: 'center', alignItems: 'center' }}>

          <Animated.View entering={FadeIn.duration(400)}>
            <Text style={{
              fontFamily: Font.bodyMed,
              fontSize: 11,
              letterSpacing: 3,
              color: T.textDim,
              textAlign: 'center',
              marginBottom: 24,
            }}>
              ONE MOMENT
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(500)}>
            <Text style={{
              fontFamily: Font.displayBlack,
              fontSize: 42,
              color: T.text,
              letterSpacing: -1.6,
              lineHeight: 46,
              textAlign: 'center',
              marginBottom: 40,
            }}>
              Finding your perfect challenge.
            </Text>
          </Animated.View>

          {/* Progress bar */}
          <Animated.View
            entering={FadeIn.delay(200).duration(400)}
            style={{
              width: '70%',
              height: 4,
              borderRadius: 4,
              backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)',
              overflow: 'hidden',
              marginBottom: 28,
            }}>
            <Animated.View
              style={[
                { height: '100%', backgroundColor: T.text, borderRadius: 4 },
                progressStyle,
              ]}
            />
          </Animated.View>

          {/* Rotating copy */}
          <View style={{ height: 28, justifyContent: 'center', alignItems: 'center' }}>
            <Animated.Text
              key={lineIdx}
              entering={FadeIn.duration(220)}
              exiting={FadeOut.duration(180)}
              style={{
                fontFamily: Font.bodyMed,
                fontSize: 15,
                color: T.textDim,
                letterSpacing: -0.1,
              }}>
              {LINES[lineIdx]}
            </Animated.Text>
          </View>

        </View>
      </SafeAreaView>
    </View>
  );
}
