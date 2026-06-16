import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { authClient } from '@/lib/auth-client';
import { Colors, Font, Radius, type Theme } from '@/constants/theme';

export default function SignInScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error: err } = await authClient.signIn.email({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (err) {
      setError(err.message ?? 'Invalid email or password.');
      return;
    }
    router.replace('/');
  };

  const onSocial = async (provider: 'google' | 'apple') => {
    setError(null);
    setSocialLoading(provider);
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: '/',
      });
    } catch {
      setError('Could not sign in. Please try again.');
    } finally {
      setSocialLoading(null);
    }
  };

  const busy = loading || !!socialLoading;

  return (
    <View style={{ flex: 1, backgroundColor: T.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            keyboardShouldPersistTaps='handled'
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 16 }}>
            <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1, justifyContent: 'center', maxWidth: 420, alignSelf: 'stretch' }}>

              <Animated.View entering={FadeInDown.duration(420)} style={{ marginBottom: 36 }}>
                <Text style={{
                  fontFamily: Font.bodyMed,
                  fontSize: 11,
                  letterSpacing: 3,
                  color: T.textDim,
                  marginBottom: 10,
                }}>
                  75 / HARD
                </Text>
                <Text style={{
                  fontFamily: Font.displayBlack,
                  fontSize: 40,
                  color: T.text,
                  letterSpacing: -1.5,
                  lineHeight: 44,
                  marginBottom: 8,
                }}>
                  Welcome back.
                </Text>
                <Text style={{
                  fontFamily: Font.bodyReg,
                  fontSize: 14,
                  color: T.textDim,
                  lineHeight: 20,
                }}>
                  Pick up where you left off.
                </Text>
              </Animated.View>

              {/* ── Social buttons ─────────────────────────────────── */}
              <Animated.View entering={FadeInDown.delay(80).duration(420)} style={{ gap: 10, marginBottom: 20 }}>
                <SocialButton
                  provider='google'
                  loading={socialLoading === 'google'}
                  disabled={busy}
                  onPress={() => onSocial('google')}
                  T={T}
                />
                <SocialButton
                  provider='apple'
                  loading={socialLoading === 'apple'}
                  disabled={busy}
                  onPress={() => onSocial('apple')}
                  T={T}
                  isDark={isDark}
                />
              </Animated.View>

              {/* ── Divider ────────────────────────────────────────── */}
              <Animated.View entering={FadeInDown.delay(120).duration(420)} style={{
                flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20,
              }}>
                <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: T.cardBorder }} />
                <Text style={{ fontFamily: Font.bodyReg, fontSize: 12, color: T.textSubtle }}>
                  or continue with email
                </Text>
                <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: T.cardBorder }} />
              </Animated.View>

              {/* ── Email / password form ──────────────────────────── */}
              <Animated.View entering={FadeInDown.delay(160).duration(420)} style={{ gap: 14 }}>
                <Field
                  label='Email'
                  value={email}
                  onChangeText={setEmail}
                  placeholder='you@email.com'
                  keyboardType='email-address'
                  autoCapitalize='none'
                  autoComplete='email'
                  T={T}
                />
                <Field
                  label='Password'
                  value={password}
                  onChangeText={setPassword}
                  placeholder='Your password'
                  secureTextEntry
                  autoComplete='current-password'
                  T={T}
                />

                {error && (
                  <View style={{
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: 'rgba(220,38,38,0.3)',
                    backgroundColor: 'rgba(220,38,38,0.08)',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: Radius.md,
                  }}>
                    <Text style={{ fontFamily: Font.bodyMed, fontSize: 13, color: '#DC2626' }}>
                      {error}
                    </Text>
                  </View>
                )}

                <Pressable
                  onPress={onSubmit}
                  disabled={busy}
                  style={({ pressed }) => ({
                    backgroundColor: T.invertBg,
                    height: 52,
                    borderRadius: Radius.pill,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: 6,
                    opacity: pressed || busy ? 0.75 : 1,
                  })}>
                  {loading ? (
                    <ActivityIndicator color={T.invertText} />
                  ) : (
                    <Text style={{
                      fontFamily: Font.displaySemi,
                      fontSize: 16,
                      color: T.invertText,
                      letterSpacing: -0.2,
                    }}>
                      Sign in
                    </Text>
                  )}
                </Pressable>
              </Animated.View>

              <Animated.View entering={FadeIn.delay(320).duration(360)} style={{ marginTop: 28, alignItems: 'center' }}>
                <Text style={{ fontFamily: Font.bodyReg, fontSize: 13, color: T.textDim }}>
                  New here?{' '}
                  <Link href='/sign-up' replace style={{
                    fontFamily: Font.bodySemi,
                    color: T.text,
                  }}>
                    Create an account
                  </Link>
                </Text>
              </Animated.View>

            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function SocialButton({
  provider,
  loading,
  disabled,
  onPress,
  T,
  isDark,
}: {
  provider: 'google' | 'apple';
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
  T: Theme;
  isDark?: boolean;
}) {
  const isApple = provider === 'apple';

  const bgColor = isApple
    ? (isDark ? '#FFFFFF' : '#000000')
    : T.card;

  const textColor = isApple
    ? (isDark ? '#000000' : '#FFFFFF')
    : T.text;

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

function Field({
  label, T, ...rest
}: { label: string; T: Theme } & React.ComponentProps<typeof TextInput>) {
  return (
    <View>
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
