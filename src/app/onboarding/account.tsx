import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as AppleAuthentication from 'expo-apple-authentication';
import Svg, { Path } from 'react-native-svg';

import { OnboardingFrame } from '@/components/onboarding-frame';
import { authClient } from '@/lib/auth-client';
import { Colors, Font, Radius, type Theme } from '@/constants/theme';
import { useOnboarding } from '@/lib/onboarding-store';

function GoogleG({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </Svg>
  );
}

function SocialButton({
  provider, loading, disabled, onPress, T, isDark,
}: {
  provider: 'google' | 'apple';
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
  T: Theme;
  isDark?: boolean;
}) {
  const isApple = provider === 'apple';
  const bgColor = isApple ? (isDark ? '#FFFFFF' : '#000000') : T.card;
  const textColor = isApple ? (isDark ? '#000000' : '#FFFFFF') : T.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        height: 52,
        borderRadius: Radius.pill,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: bgColor,
        borderWidth: isApple ? 0 : StyleSheet.hairlineWidth,
        borderColor: T.cardBorder,
        opacity: pressed || disabled ? 0.65 : 1,
      })}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {isApple ? (
            <Text style={{
              fontFamily: Font.icon,
              fontSize: 20,
              lineHeight: 22,
              color: textColor,
              includeFontPadding: false,
            }}>
              apple
            </Text>
          ) : (
            <GoogleG size={20} />
          )}
          <Text style={{
            fontFamily: Font.displaySemi,
            fontSize: 15,
            color: textColor,
            letterSpacing: -0.2,
          }}>
            Continue with {isApple ? 'Apple' : 'Google'}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export default function AccountScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const { state } = useOnboarding();
  const { data: session, isPending } = authClient.useSession();
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && session) {
      router.replace('/onboarding/paywall');
    }
  }, [session, isPending]);

  const busy = !!socialLoading;

  const handleGoogle = async () => {
    setError(null);
    setSocialLoading('google');
    try {
      await authClient.signIn.social({ provider: 'google', callbackURL: '/onboarding/paywall' });
    } catch {
      setError('Could not sign in with Google. Please try again.');
    } finally {
      setSocialLoading(null);
    }
  };

  const handleApple = async () => {
    setError(null);
    setSocialLoading('apple');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('No identity token');
      await authClient.signIn.social({
        provider: 'apple',
        idToken: { token: credential.identityToken },
      } as never);
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return;
      setError('Apple sign-in failed. Please try again.');
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <OnboardingFrame step={15}>
      <View style={{ flex: 1 }}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={{
            fontFamily: Font.bodyMed, fontSize: 11, letterSpacing: 2.4, color: T.textDim,
            marginBottom: 12,
          }}>
            LOCK IT IN
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(440)}>
          <Text style={{
            fontFamily: Font.displayBlack, fontSize: 38, color: T.text,
            letterSpacing: -1.4, lineHeight: 42, marginBottom: 8,
          }}>
            Lock in your start, {state.name.split(/\s+/)[0]}.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(440)}>
          <Text style={{
            fontFamily: Font.bodyReg, fontSize: 14, color: T.textDim, lineHeight: 20,
            marginBottom: 36,
          }}>
            Save your progress so you can never lose a day.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220).duration(440)} style={{ gap: 10 }}>
          <SocialButton
            provider='google'
            loading={socialLoading === 'google'}
            disabled={busy}
            onPress={handleGoogle}
            T={T}
          />
          {Platform.OS === 'ios' ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={isDark
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={100}
              style={{ height: 52 }}
              onPress={handleApple}
            />
          ) : (
            <SocialButton
              provider='apple'
              loading={socialLoading === 'apple'}
              disabled={busy}
              onPress={handleApple}
              T={T}
              isDark={isDark}
            />
          )}
        </Animated.View>

        {error && (
          <Animated.View entering={FadeIn.duration(200)} style={{ marginTop: 16 }}>
            <Text style={{ fontFamily: Font.bodyMed, fontSize: 13, color: '#DC2626', textAlign: 'center' }}>
              {error}
            </Text>
          </Animated.View>
        )}

        <Animated.View entering={FadeIn.delay(440).duration(400)} style={{ marginTop: 24 }}>
          <Text style={{
            fontFamily: Font.bodyReg,
            fontSize: 12,
            color: T.textSubtle,
            lineHeight: 18,
            textAlign: 'center',
            letterSpacing: -0.05,
          }}>
            Hi {state.name.split(/\s+/)[0]} — we'll save your name and challenge to your account.
          </Text>
        </Animated.View>
      </View>
    </OnboardingFrame>
  );
}
