import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as AppleAuthentication from 'expo-apple-authentication';

import { OnboardingFrame } from '@/components/onboarding-frame';
import { authClient } from '@/lib/auth-client';
import { Colors, Font, Radius, type Theme } from '@/constants/theme';
import { useOnboarding } from '@/lib/onboarding-store';

function Field({
  label, T, ...rest
}: { label: string; T: Theme } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{
        fontFamily: Font.bodyMed,
        fontSize: 10.5,
        letterSpacing: 1.6,
        color: T.textDim,
        marginBottom: 6,
        marginLeft: 2,
      }}>
        {label.toUpperCase()}
      </Text>
      <TextInput
        placeholderTextColor={T.textSubtle}
        {...rest}
        style={{
          backgroundColor: T.card,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: T.cardBorder,
          borderRadius: Radius.md,
          height: 52,
          paddingHorizontal: 16,
          fontSize: 15,
          fontFamily: Font.bodyMed,
          color: T.text,
        }}
      />
    </View>
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
          <Text style={{
            fontFamily: Font.icon,
            fontSize: 20,
            lineHeight: 22,
            color: isApple ? textColor : '#4285F4',
            includeFontPadding: false,
          }}>
            {isApple ? 'apple' : 'g_mobiledata'}
          </Text>
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && session) {
      router.replace('/onboarding/paywall');
    }
  }, [session, isPending]);

  const busy = loading || !!socialLoading;
  const canSubmit = email.trim().length > 3 && password.length >= 8 && !busy;

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

  const handleSubmit = async () => {
    setError(null);
    if (!canSubmit) return;
    setLoading(true);
    const { error: err } = await authClient.signUp.email({
      name: state.name,
      email: email.trim().toLowerCase(),
      password,
    });
    if (err) {
      setLoading(false);
      setError(err.message ?? 'Could not create account.');
      return;
    }
    setLoading(false);
    router.push('/onboarding/paywall');
  };

  return (
    <OnboardingFrame
      step={15}
      onContinue={handleSubmit}
      continueDisabled={!canSubmit}
      continueLoading={loading}
      continueLabel='Save progress'>
      <View style={{ flex: 1 }}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={{
            fontFamily: Font.bodyMed, fontSize: 11, letterSpacing: 2.4, color: T.textDim,
            marginBottom: 12,
          }}>
            STEP 14 — LOCK IT IN
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
            marginBottom: 28,
          }}>
            Save your progress so you can never lose a day.
          </Text>
        </Animated.View>

        {/* Social buttons */}
        <Animated.View entering={FadeInDown.delay(220).duration(440)} style={{ gap: 10, marginBottom: 20 }}>
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

        {/* Divider */}
        <Animated.View entering={FadeInDown.delay(280).duration(440)} style={{
          flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20,
        }}>
          <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: T.cardBorder }} />
          <Text style={{ fontFamily: Font.bodyReg, fontSize: 12, color: T.textSubtle }}>
            or sign up with email
          </Text>
          <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: T.cardBorder }} />
        </Animated.View>

        {/* Email / password */}
        <Animated.View entering={FadeInDown.delay(340).duration(440)}>
          <Field
            T={T}
            label='Email'
            value={email}
            onChangeText={setEmail}
            placeholder='you@email.com'
            keyboardType='email-address'
            autoCapitalize='none'
            autoComplete='email'
            autoCorrect={false}
          />
          <Field
            T={T}
            label='Password'
            value={password}
            onChangeText={setPassword}
            placeholder='At least 8 characters'
            secureTextEntry
            autoComplete='new-password'
          />

          {error && (
            <View style={{
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: 'rgba(220,38,38,0.3)',
              backgroundColor: 'rgba(220,38,38,0.08)',
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: Radius.md,
              marginTop: 6,
            }}>
              <Text style={{ fontFamily: Font.bodyMed, fontSize: 13, color: '#DC2626' }}>
                {error}
              </Text>
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeIn.delay(440).duration(400)} style={{ marginTop: 20 }}>
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
