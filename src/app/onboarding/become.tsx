import { Colors, Font, Radius } from '@/constants/theme';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Pressable, Text, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BecomeScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: T.background }}>
      {/* Image — full width, nothing cropped */}
      <Animated.View entering={FadeIn.duration(500)} style={{ flex: 1, paddingTop: insets.top }}>
        <Image
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          source={require('@/assets/app-images/3rd-screen.png')}
          style={{ flex: 1, width: '100%' }}
          contentFit='contain'
        />
      </Animated.View>

      {/* Heading + button — centered below image */}
      <View style={{
        paddingHorizontal: 24,
        paddingBottom: Math.max(insets.bottom, 16) + 4,
        paddingTop: 12,
        alignItems: 'center',
      }}>
        <Animated.View
          entering={FadeInDown.delay(200).duration(500)}
          style={{ alignItems: 'center', marginBottom: 28 }}
        >
          <Text style={{
            fontFamily: Font.displayMed,
            fontSize: 46,
            color: T.textDim,
            letterSpacing: -2,
            lineHeight: 50,
            textAlign: 'center',
          }}>
            Become
          </Text>
          <Text style={{
            fontFamily: Font.displayBlack,
            fontSize: 46,
            color: T.text,
            letterSpacing: -2,
            lineHeight: 50,
            textAlign: 'center',
          }}>
            &ldquo;that person&rdquo;
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(360).duration(400)} style={{ width: '100%' }}>
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
            <Text style={{
              fontFamily: Font.displaySemi,
              fontSize: 16,
              color: T.invertText,
              letterSpacing: -0.2,
            }}>
              Continue
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}
