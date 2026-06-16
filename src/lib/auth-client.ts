import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import { convexClient } from '@convex-dev/better-auth/client/plugins';
import * as SecureStore from 'expo-secure-store';

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_AUTH_URL!,
  plugins: [
    expoClient({
      scheme: 'hardpact',
      storagePrefix: 'hardpact',
      storage: SecureStore,
    }),
    convexClient(),
  ],
});
