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
import { OnboardingProvider, useOnboarding } from '@/lib/onboarding-store';
import { useCachedPreferences } from '@/lib/convex-api';
import { SubscriptionProvider } from '@/lib/subscription-context';
import { configurePurchases, loginPurchases, logoutPurchases } from '@/lib/purchases';
import { Colors } from '@/constants/theme';

function isUnauthedRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/onboarding') ||
    pathname === '/sign-in' ||
    pathname === '/sign-up'
  );
}

type RouteResolution =
  | { kind: 'loading' }                 // still resolving — show the loader, decide nothing
  | { kind: 'ready' }                   // current screen is the correct destination
  | { kind: 'redirect'; to: string };   // wrong screen — loader until we've navigated to `to`

/**
 * Single source of truth for "where does this user belong right now?" Used by BOTH
 * the redirect effect and the render gate, so they can never disagree. (The old
 * wrong-screen flash came from the render gate opening before the redirect landed:
 * the correct screen only renders once `pathname` already matches the destination.)
 */
function resolveRoute(
  signedIn: boolean,
  prefs: object | null | undefined,
  pathname: string,
  hasOnboardingProgress: boolean,
): RouteResolution {
  const onUnauthed = isUnauthedRoute(pathname);

  // Not signed in → belongs on an unauthed screen.
  if (!signedIn) {
    return onUnauthed ? { kind: 'ready' } : { kind: 'redirect', to: '/onboarding/welcome' };
  }

  // Signed in but prefs not resolved yet (Convex auth not applied, or query loading).
  if (prefs === undefined) return { kind: 'loading' };

  const onSignInScreen = pathname === '/onboarding/sign-in' || pathname === '/sign-in';

  // No prefs row → belongs in onboarding. Stay put only on a genuine onboarding
  // screen (so a user mid-onboarding isn't yanked away); the sign-in screen should
  // proceed into onboarding once signed in.
  if (prefs === null) {
    const inOnboarding = pathname.startsWith('/onboarding') && !onSignInScreen;
    if (inOnboarding) return { kind: 'ready' };
    // Signed in, no DB row yet, and off the onboarding stack (e.g. the account
    // screen just authed and the app resumed on home, or an OAuth return reset
    // the nav). If the user has already filled in onboarding answers, send them
    // to the paywall to finish — NOT back to welcome, which would restart the
    // whole flow. The paywall persists a draft of their answers on mount.
    return {
      kind: 'redirect',
      to: hasOnboardingProgress ? '/onboarding/paywall' : '/onboarding/welcome',
    };
  }

  // Has a prefs row (draft OR complete) → the user "owns" the app; the home screen
  // gates the locked/unpaid state internally. The paywall is a point of no return:
  // once here the draft-save creates a prefs row, and we must NOT pull them off it —
  // they buy or close the app. Every other unauthed screen → send them home.
  if (pathname === '/onboarding/paywall') return { kind: 'ready' };
  if (onUnauthed) return { kind: 'redirect', to: '/' };
  return { kind: 'ready' };
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const bg = colorScheme === 'dark' ? Colors.dark.background : Colors.light.background;

  const { data: session, isPending } = authClient.useSession();
  const prefs = useCachedPreferences();
  const pathname = usePathname();
  const { state: onboarding } = useOnboarding();
  // A name is captured early in onboarding and required to reach the account
  // step, so it's a reliable "onboarding in progress" signal for routing a
  // freshly-signed-in, prefs-less user to the paywall instead of welcome.
  const hasOnboardingProgress = !!onboarding.name;

  // Tracks whether the session has ever resolved. Once it has, we never tear
  // down the Stack again — even if `isPending` flips back to true during a
  // refresh after sign-up. Tearing it down would unmount every Provider inside
  // (including OnboardingProvider when it was nested) and wipe form state.
  const hasResolved = useRef(false);
  if (!isPending) hasResolved.current = true;

  // Keep RevenueCat user in sync with auth state.
  useEffect(() => {
    if (isPending) return;
    if (session?.user?.id) {
      loginPurchases(session.user.id);
    } else {
      logoutPurchases();
    }
  }, [session?.user?.id, isPending]);

  const route = resolveRoute(!!session, prefs, pathname, hasOnboardingProgress);
  const redirectTo = route.kind === 'redirect' ? route.to : null;

  useEffect(() => {
    // Don't route during a session refresh — hold the current screen instead of
    // tearing the Stack down. `redirectTo` fully captures the decision.
    if (isPending) return;
    if (redirectTo) router.replace(redirectTo);
  }, [isPending, redirectTo]);

  // Full-screen loader ONLY while the session or prefs are still resolving. In this
  // state no redirect is pending (redirectTo is null), so the navigator isn't needed
  // and it's safe to not mount the Stack. Crucially we do NOT unmount the Stack to
  // show a loader while a redirect is in flight — router.replace() needs the
  // navigator mounted, and unmounting it mid-redirect loses the navigation and loops.
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
        <Stack.Screen name='paywall' options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name='reminders' />
        <Stack.Screen name='change-challenge' />
        <Stack.Screen name='challenge-history' />
        <Stack.Screen name='camera' options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name='scan' options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name='photo-viewer' options={{ presentation: 'fullScreenModal' }} />
      </Stack>

      {/* Redirect in flight: cover the (briefly wrong) current screen with a loader
          OVERLAY. The Stack underneath stays mounted so router.replace() works and
          navigation isn't lost — the user just sees loader → correct screen. */}
      {route.kind === 'redirect' && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: bg,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ActivityIndicator color={colorScheme === 'dark' ? '#FAFAFA' : '#0A0A0A'} />
        </View>
      )}
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
    configurePurchases();
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
      {/* SubscriptionProvider needs Convex context (for syncSubscriptionStatus)
          so it lives inside ConvexAuthSetup. */}
      <SubscriptionProvider>
        <OnboardingProvider>
          <RootLayoutNav />
        </OnboardingProvider>
      </SubscriptionProvider>
    </ConvexAuthSetup>
  );
}
