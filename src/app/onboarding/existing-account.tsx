import { router } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Font, Radius } from '@/constants/theme';
import { authClient } from '@/lib/auth-client';
import { clearOnboardingDraft } from '@/lib/onboarding-store';

// How long to show the "you already have an account" message before handing the
// user back to their existing app data.
const REDIRECT_MS = 3000;

export default function ExistingAccountScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];
  const { data: session } = authClient.useSession();
  const email = session?.user?.email ?? '';

  useEffect(() => {
    // This account already has preferences in the DB — drop the fresh onboarding
    // draft so it can't overwrite anything, then send the user home. The home
    // screen gates the locked/unpaid state internally, so no paywall detour here.
    clearOnboardingDraft();
    const t = setTimeout(() => router.replace('/'), REDIRECT_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: T.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View
          style={{
            flex: 1,
            paddingHorizontal: 28,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Animated.View
            entering={FadeIn.duration(400)}
            style={{
              width: 64,
              height: 64,
              borderRadius: 64,
              backgroundColor: T.card,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: T.cardBorder,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 28,
            }}
          >
            <Text
              style={{
                fontFamily: Font.icon,
                fontSize: 30,
                color: T.text,
                includeFontPadding: false,
              }}
            >
              check_circle
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(440)}>
            <Text
              style={{
                fontFamily: Font.displayBlack,
                fontSize: 30,
                color: T.text,
                letterSpacing: -1.2,
                lineHeight: 34,
                textAlign: 'center',
                marginBottom: 14,
              }}
            >
              You already have{'\n'}an account
            </Text>
          </Animated.View>

          {!!email && (
            <Animated.View
              entering={FadeInDown.delay(140).duration(440)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: Radius.pill,
                backgroundColor: T.card,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: T.cardBorder,
                marginBottom: 16,
              }}
            >
              <Text style={{ fontFamily: Font.bodySemi, fontSize: 13, color: T.text }}>
                {email}
              </Text>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(200).duration(440)}>
            <Text
              style={{
                fontFamily: Font.bodyReg,
                fontSize: 14,
                color: T.textDim,
                lineHeight: 20,
                textAlign: 'center',
              }}
            >
              We've signed you back in. You can change your challenge anytime from
              the app.
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeIn.delay(500).duration(400)}
            style={{ marginTop: 32 }}
          >
            <ActivityIndicator color={T.textDim} />
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}
