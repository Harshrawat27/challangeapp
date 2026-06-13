import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { OnboardingFrame } from '@/components/onboarding-frame';
import { Colors, Font, Radius, type Theme } from '@/constants/theme';
import { useOnboarding } from '@/lib/onboarding-store';
import { useIsUsernameAvailable } from '@/lib/convex-api';

const USERNAME_REGEX = /^[a-z0-9._]{3,20}$/;
const SUGGEST_FROM_NAME = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);

// Tiny debounce so we don't fire a query on every keystroke.
function useDebounced<T>(value: T, ms = 400): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

type LocalState =
  | { kind: 'idle' }
  | { kind: 'too-short' }
  | { kind: 'invalid' }
  | { kind: 'checking' }
  | { kind: 'available' }
  | { kind: 'taken' };

function statusFor(input: string, server: { ok: boolean; reason?: string } | undefined): LocalState {
  const u = input.trim().toLowerCase();
  if (u.length === 0) return { kind: 'idle' };
  if (u.length < 3) return { kind: 'too-short' };
  if (!USERNAME_REGEX.test(u)) return { kind: 'invalid' };
  if (server === undefined) return { kind: 'checking' };
  if (server.ok) return { kind: 'available' };
  if (server.reason === 'taken') return { kind: 'taken' };
  return { kind: 'invalid' };
}

function StatusLine({ state, T }: { state: LocalState; T: Theme }) {
  if (state.kind === 'idle') {
    return (
      <Text style={{ fontFamily: Font.bodyReg, fontSize: 12, color: T.textSubtle, marginTop: 8 }}>
        Letters, numbers, dot, and underscore. 3 – 20 characters.
      </Text>
    );
  }
  if (state.kind === 'too-short') {
    return (
      <Text style={{ fontFamily: Font.bodyReg, fontSize: 12, color: T.textDim, marginTop: 8 }}>
        At least 3 characters.
      </Text>
    );
  }
  if (state.kind === 'invalid') {
    return (
      <Text style={{ fontFamily: Font.bodyReg, fontSize: 12, color: '#DC2626', marginTop: 8 }}>
        Only lowercase letters, numbers, dot, and underscore.
      </Text>
    );
  }
  if (state.kind === 'checking') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <ActivityIndicator size='small' color={T.textDim} />
        <Text style={{ fontFamily: Font.bodyReg, fontSize: 12, color: T.textDim }}>
          Checking…
        </Text>
      </View>
    );
  }
  if (state.kind === 'taken') {
    return (
      <Text style={{ fontFamily: Font.bodyReg, fontSize: 12, color: '#DC2626', marginTop: 8 }}>
        That username is taken. Try another.
      </Text>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
      <Text style={{ fontFamily: Font.icon, fontSize: 14, color: '#16A34A', lineHeight: 16 }}>
        check_circle
      </Text>
      <Text style={{ fontFamily: Font.bodyMed, fontSize: 12.5, color: '#16A34A' }}>
        Available
      </Text>
    </View>
  );
}

export default function UsernameScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];
  const { state, update } = useOnboarding();

  // Auto-suggest from name on first mount.
  const initial = useMemo(() => state.username || SUGGEST_FROM_NAME(state.name), [state.name, state.username]);
  const [text, setText] = useState(initial);

  const sanitized = text.toLowerCase().replace(/[^a-z0-9._]/g, '');
  const debounced = useDebounced(sanitized, 350);
  const server = useIsUsernameAvailable(debounced);
  const status = statusFor(sanitized, server);

  const canContinue = status.kind === 'available';

  const handleContinue = () => {
    update('username', sanitized);
    router.push('/onboarding/account');
  };

  return (
    <OnboardingFrame
      step={14}
      onContinue={handleContinue}
      continueDisabled={!canContinue}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={{
            fontFamily: Font.bodyMed,
            fontSize: 11,
            letterSpacing: 2.4,
            color: T.textDim,
            marginBottom: 12,
          }}>
            STEP 13 — YOUR HANDLE
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(440)}>
          <Text style={{
            fontFamily: Font.displayBlack,
            fontSize: 38,
            color: T.text,
            letterSpacing: -1.4,
            lineHeight: 42,
            marginBottom: 10,
          }}>
            Claim your username.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(440)}>
          <Text style={{
            fontFamily: Font.bodyReg,
            fontSize: 14,
            color: T.textDim,
            lineHeight: 20,
            marginBottom: 28,
          }}>
            This is how friends will find you. Pick wisely — it sticks.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(320).duration(440)}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: T.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor:
              status.kind === 'available' ? '#16A34A'
              : status.kind === 'taken' || status.kind === 'invalid' ? '#DC2626'
              : T.cardBorder,
            borderRadius: Radius.lg,
            paddingHorizontal: 16,
            height: 60,
          }}>
            <Text style={{
              fontFamily: Font.displaySemi,
              fontSize: 22,
              color: T.textSubtle,
              letterSpacing: -0.4,
            }}>
              @
            </Text>
            <TextInput
              value={text}
              onChangeText={setText}
              autoFocus
              placeholder='your_handle'
              placeholderTextColor={T.textSubtle}
              autoCapitalize='none'
              autoCorrect={false}
              autoComplete='username-new'
              maxLength={20}
              style={{
                flex: 1,
                fontSize: 22,
                fontFamily: Font.displaySemi,
                color: T.text,
                letterSpacing: -0.4,
                marginLeft: 4,
              }}
            />
          </View>
          <StatusLine state={status} T={T} />
        </Animated.View>
      </View>
    </OnboardingFrame>
  );
}
