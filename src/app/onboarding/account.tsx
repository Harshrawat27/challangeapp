import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

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

export default function AccountScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const { state } = useOnboarding();
  const { data: session, isPending } = authClient.useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google/Apple users already have a session by the time they reach this screen.
  // Skip email signup and go straight to saving preferences in paywall.
  useEffect(() => {
    if (!isPending && session) {
      router.replace('/onboarding/paywall');
    }
  }, [session, isPending]);

  const canSubmit = email.trim().length > 3 && password.length >= 8 && !loading;

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
    // Username is claimed in paywall.tsx once the Convex auth token has synced.
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

        <Animated.View entering={FadeInDown.delay(260).duration(440)}>
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
            Hi {state.name.split(/\s+/)[0]} 👋 — we&apos;ll save your name and challenge to your account.
          </Text>
        </Animated.View>
      </View>
    </OnboardingFrame>
  );
}
