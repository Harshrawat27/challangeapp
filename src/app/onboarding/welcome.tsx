import { Colors, Font, Radius, type Theme } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { authClient } from '@/lib/auth-client';
import { clearPrefsCache } from '@/lib/convex-api';
import { clearOnboardingDraft } from '@/lib/onboarding-store';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Constants ───────────────────────────────────────────────────────────────

const IMG_W = 110;
const IMG_H = 148;
const IMG_GAP = 8;
const ROW_GAP = 30;
const BADGE_H = 28; // estimated pill height (7px paddingV × 2 + ~14px text)
const SET_W = (IMG_W + IMG_GAP) * 4;

// ─── Images ──────────────────────────────────────────────────────────────────

const ROW1 = [
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/assets/app-images/onboarding-first-page/image-8.png'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/assets/app-images/onboarding-first-page/image-10.png'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/assets/app-images/onboarding-first-page/image-11.png'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/assets/app-images/onboarding-first-page/image-9.png'),
];
const ROW2 = [
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/assets/app-images/onboarding-first-page/image-12.png'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/assets/app-images/onboarding-first-page/image-13.png'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/assets/app-images/onboarding-first-page/image-14.png'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/assets/app-images/onboarding-first-page/image-15.png'),
];
const ROW3 = [
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/assets/app-images/onboarding-first-page/image-16.png'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/assets/app-images/onboarding-first-page/image-17.png'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/assets/app-images/onboarding-first-page/image-18.png'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/assets/app-images/onboarding-first-page/image-19.png'),
];

// ─── MarqueeRow ──────────────────────────────────────────────────────────────

function MarqueeRow({
  images,
  reverse = false,
  duration = 20000,
}: {
  images: number[];
  reverse?: boolean;
  duration?: number;
}) {
  // reverse rows start at -SET_W and animate to 0; left rows start at 0 and go to -SET_W
  const x = useSharedValue(reverse ? -SET_W : 0);

  useEffect(() => {
    x.value = withRepeat(
      withTiming(reverse ? 0 : -SET_W, { duration, easing: Easing.linear }),
      -1,
      false
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <View style={{ height: IMG_H, overflow: 'hidden' }}>
      <Animated.View style={[{ flexDirection: 'row' }, animStyle]}>
        {[...images, ...images].map((src, i) => (
          <Image
            key={i}
            source={src}
            style={{
              width: IMG_W,
              height: IMG_H,
              borderRadius: 14,
              marginRight: IMG_GAP,
            }}
            contentFit='cover'
          />
        ))}
      </Animated.View>
    </View>
  );
}

// ─── StatChip (overlaid on top edge of each row) ────────────────────────────

function StatChip({ n, label, T }: { n: string; label: string; T: Theme }) {
  return (
    <Animated.View
      entering={FadeIn.delay(400).duration(500)}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        transform: [{ translateY: -(BADGE_H / 2) }],
        zIndex: 10,
      }}
      pointerEvents='none'
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: Radius.pill,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: T.cardBorder,
          backgroundColor: T.card,
        }}
      >
        <View
          style={{
            width: 5,
            height: 5,
            borderRadius: 3,
            backgroundColor: T.text,
            opacity: 0.45,
          }}
        />
        <Text
          style={{
            fontFamily: Font.bodyBold,
            fontSize: 12,
            color: T.text,
            letterSpacing: -0.1,
          }}
        >
          {n}
        </Text>
        <Text
          style={{ fontFamily: Font.bodyReg, fontSize: 12, color: T.textDim }}
        >
          joined · {label}
        </Text>
      </View>
    </Animated.View>
  );
}
// ─── Screen ──────────────────────────────────────────────────────────────────

export default function Welcome() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const { data: session } = authClient.useSession();
  const [signingOut, setSigningOut] = useState(false);

  const IMAGES_H = Math.round(screenH * 0.62);

  const handleSignIn = async () => {
    if (session) {
      setSigningOut(true);
      clearPrefsCache();
      clearOnboardingDraft();
      await authClient.signOut().catch(() => {});
      setSigningOut(false);
    }
    router.push('/onboarding/sign-in');
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.background }}>
      {/* ─── Scrolling image strips ─── */}
      <View
        style={{
          height: IMAGES_H,
          paddingTop: insets.top + BADGE_H / 2 + 30,
          justifyContent: 'center',
          gap: ROW_GAP,
        }}
      >
        <View style={{ position: 'relative' }}>
          <MarqueeRow images={ROW1} duration={20000} />
          <StatChip n='2.4k' label='75 Hard' T={T} />
        </View>
        <View style={{ position: 'relative' }}>
          <MarqueeRow images={ROW2} reverse duration={16000} />
          <StatChip n='1.1k' label='Monk Mode' T={T} />
        </View>
        <View style={{ position: 'relative', marginBottom: -4 }}>
          <MarqueeRow images={ROW3} duration={22000} />
          <StatChip n='890' label='75 Soft' T={T} />
          {/* Gradient sits directly on the last row, fades bottom into background */}
          <LinearGradient
            colors={['transparent', T.background]}
            pointerEvents='none'
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: IMG_H * 0.7,
            }}
          />
        </View>
      </View>

      {/* ─── CTA content ─── */}
      <View
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingBottom: Math.max(insets.bottom, 16) + 4,
          justifyContent: 'flex-end',
        }}
      >
        {/* Headline */}
        <Animated.View entering={FadeInDown.delay(160).duration(500)} style={{ marginBottom: 28 }}>
          <Text
            style={{
              fontFamily: Font.displayMed,
              fontSize: 46,
              color: T.textDim,
              letterSpacing: -2,
              lineHeight: 50,
            }}
          >
            Choose your
          </Text>
          <Text
            style={{
              fontFamily: Font.displayBlack,
              fontSize: 46,
              color: T.text,
              letterSpacing: -2,
              lineHeight: 50,
            }}
          >
            challenge.
          </Text>
        </Animated.View>

        {/* Primary CTA */}
        <Animated.View entering={FadeInDown.delay(280).duration(400)}>
          <Pressable
            onPress={() => router.push('/onboarding/friends')}
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
              Get started
            </Text>
          </Pressable>
        </Animated.View>

        {/* Sign in link */}
        <Animated.View entering={FadeInDown.delay(380).duration(400)}>
          <Pressable
            onPress={handleSignIn}
            disabled={signingOut}
            style={({ pressed }) => ({
              alignItems: 'center',
              marginTop: 16,
              opacity: pressed || signingOut ? 0.6 : 1,
            })}
          >
            {signingOut ? (
              <ActivityIndicator size='small' color={T.textDim} />
            ) : (
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
            )}
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}
