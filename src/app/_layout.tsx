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

import { authClient } from '@/lib/auth-client';
import { ConvexAuthSetup } from '@/lib/auth/ConvexAuthSetup';
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
  const pathname = usePathname();
  const hasRouted = useRef(false);

  useEffect(() => {
    if (isPending) return;

    const onUnauthed = isUnauthedRoute(pathname);

    if (!session) {
      // Not signed in: bounce to onboarding unless already on an unauthed screen
      if (!onUnauthed) {
        router.replace('/onboarding/welcome');
      }
      hasRouted.current = true;
      return;
    }

    // Signed in: if currently on /sign-in or /sign-up, go home.
    // Stay on /onboarding/* so post-signup users can finish the paywall step.
    if (onUnauthed && !pathname.startsWith('/onboarding')) {
      router.replace('/');
    }
    hasRouted.current = true;
  }, [session, isPending, pathname]);

  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colorScheme === 'dark' ? '#FAFAFA' : '#0A0A0A'} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: bg } }}>
        <Stack.Screen name='(tabs)' />
        <Stack.Screen name='onboarding' />
        <Stack.Screen name='sign-up' />
        <Stack.Screen name='sign-in' />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
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
      <RootLayoutNav />
    </ConvexAuthSetup>
  );
}
