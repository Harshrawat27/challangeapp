import '@/global.css';

import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, View, useColorScheme } from 'react-native';
import {
  useFonts,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { MaterialSymbols_400Regular } from '@expo-google-fonts/material-symbols';

import { Appearance } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { authClient } from '@/lib/auth-client';
import { ConvexAuthSetup } from '@/lib/auth/ConvexAuthSetup';
import { OnboardingProvider } from '@/lib/onboarding-store';
import { useCachedPreferences } from '@/lib/convex-api';
import { Colors } from '@/constants/theme';

function isUnauthedRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/onboarding') ||
    pathname === '/sign-in' ||
    pathname === '/sign-up'
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const bg = colorScheme === 'dark' ? Colors.dark.background : Colors.light.background;

  const { data: session, isPending } = authClient.useSession();
  const prefs = useCachedPreferences();
  const pathname = usePathname();
  const hasRouted = useRef(false);

  // Tracks whether the session has ever resolved. Once it has, we never tear
  // down the Stack again — even if `isPending` flips back to true during a
  // refresh after sign-up. Tearing it down would unmount every Provider inside
  // (including OnboardingProvider when it was nested) and wipe form state.
  const hasResolved = useRef(false);
  if (!isPending) hasResolved.current = true;

  useEffect(() => {
    if (isPending) return;

    const onUnauthed = isUnauthedRoute(pathname);

    if (!session) {
      // Not signed in → bounce to onboarding unless already on an unauthed screen
      if (!onUnauthed) router.replace('/onboarding/welcome');
      hasRouted.current = true;
      return;
    }

    // Signed in — wait for prefs to resolve before making routing decisions.
    // undefined = still loading; null = no onboarding row; object = complete.
    if (prefs === undefined) return;

    // Signed in but onboarding never completed (Google/Apple new users,
    // or users who signed up then closed before finishing).
    if (prefs === null && !pathname.startsWith('/onboarding')) {
      router.replace('/onboarding/welcome');
      hasRouted.current = true;
      return;
    }

    // Signed in with prefs: redirect away from /sign-in or /sign-up only.
    // Stay on /onboarding/* so mid-onboarding users can finish.
    if (onUnauthed && !pathname.startsWith('/onboarding')) {
      router.replace('/');
    }
    hasRouted.current = true;
  }, [session, isPending, pathname, prefs]);

  // Block render until session resolves AND (if signed in) prefs resolves too.
  // The prefs check prevents a flash of the home screen before we can redirect
  // a new Google/Apple user to onboarding.
  if (!hasResolved.current || (session && prefs === undefined)) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colorScheme === 'dark' ? '#FAFAFA' : '#0A0A0A'} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: bg } }}>
        <Stack.Screen name='(tabs)' />
        <Stack.Screen name='onboarding' />
        <Stack.Screen name='sign-up' />
        <Stack.Screen name='sign-in' />
        <Stack.Screen name='day/[date]' />
        <Stack.Screen name='friend/[userId]' />
        <Stack.Screen name='note/[date]' options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name='water-log' options={{ presentation: 'formSheet' }} />
        <Stack.Screen name='settings' />
        <Stack.Screen name='change-challenge' />
        <Stack.Screen name='challenge-history' />
        <Stack.Screen name='camera' options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name='scan' options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name='photo-viewer' options={{ presentation: 'fullScreenModal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const stored = SecureStore.getItem('theme_preference');
    if (stored === 'light' || stored === 'dark') {
      Appearance.setColorScheme(stored);
    }
  }, []);

  const [loaded] = useFonts({
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    MaterialSymbols_400Regular,
  });

  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: colorScheme === 'dark' ? '#000' : '#FAFAFA' }} />;
  }

  return (
    <ConvexAuthSetup>
      {/* OnboardingProvider lives ABOVE RootLayoutNav so it survives any
          mount/unmount cycle triggered by auth state changes. */}
      <OnboardingProvider>
        <RootLayoutNav />
      </OnboardingProvider>
    </ConvexAuthSetup>
  );
}
