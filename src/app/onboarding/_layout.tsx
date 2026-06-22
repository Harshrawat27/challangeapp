import { Stack } from 'expo-router';

// NOTE: OnboardingProvider is mounted at the ROOT (src/app/_layout.tsx) so its
// state survives auth state changes (e.g. session refresh after sign-up, which
// otherwise would remount this Stack and wipe every onboarding answer).

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name='welcome' />
      <Stack.Screen name='friends' />
      <Stack.Screen name='become' />
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
      <Stack.Screen name='water' />
      <Stack.Screen name='username' />
      <Stack.Screen name='account' />
      <Stack.Screen name='paywall' />
      <Stack.Screen name='sign-in' />
    </Stack>
  );
}
