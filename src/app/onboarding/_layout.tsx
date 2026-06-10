import { Stack } from 'expo-router';

import { OnboardingProvider } from '@/lib/onboarding-store';

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name='welcome' />
        <Stack.Screen name='name' />
        <Stack.Screen name='challenge' />
        <Stack.Screen name='rules' />
        <Stack.Screen name='customize' />
        <Stack.Screen name='why' />
        <Stack.Screen name='failures' />
        <Stack.Screen name='serious' />
        <Stack.Screen name='personalizing' />
        <Stack.Screen name='transformation' />
        <Stack.Screen name='proof' />
        <Stack.Screen name='partner' />
        <Stack.Screen name='notifications' />
        <Stack.Screen name='account' />
        <Stack.Screen name='paywall' />
      </Stack>
    </OnboardingProvider>
  );
}
