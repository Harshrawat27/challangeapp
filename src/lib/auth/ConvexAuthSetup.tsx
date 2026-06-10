import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { convex } from '../convex';
import { authClient } from '../auth-client';

export function ConvexAuthSetup({ children }: { children: React.ReactNode }) {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      {children}
    </ConvexBetterAuthProvider>
  );
}
