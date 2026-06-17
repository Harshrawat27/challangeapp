import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
} from 'react-native-purchases';

// The entitlement name you create in the RevenueCat dashboard.
export const RC_ENTITLEMENT = 'HardPact Pro';

export type SubscriptionStatus = 'weekly' | 'monthly' | 'yearly' | 'expired';

// Call once at app startup (before any navigation renders).
export function configurePurchases() {
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  const apiKey =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_RC_IOS_KEY!
      : process.env.EXPO_PUBLIC_RC_ANDROID_KEY!;
  Purchases.configure({ apiKey });
}

// Call after sign-in so RevenueCat links purchases to this user.
export async function loginPurchases(userId: string) {
  try {
    await Purchases.logIn(userId);
  } catch (e) {
    console.warn('[RC] logIn failed:', e);
  }
}

// Call on sign-out so the next user starts fresh.
export async function logoutPurchases() {
  try {
    const info = await Purchases.getCustomerInfo();
    if (!info.originalAppUserId.startsWith('$RCAnonymousID')) {
      await Purchases.logOut();
    }
  } catch (e) {
    console.warn('[RC] logOut failed:', e);
  }
}

export function isSubscriptionActive(info: CustomerInfo): boolean {
  return !!info.entitlements.active[RC_ENTITLEMENT];
}

// Maps the active product identifier to a status string we mirror in Convex.
export function getSubscriptionStatus(
  info: CustomerInfo
): SubscriptionStatus | null {
  const entitlement = info.entitlements.active[RC_ENTITLEMENT];
  if (!entitlement) return null;
  const id = entitlement.productIdentifier.toLowerCase();
  if (id.includes('weekly')) return 'weekly';
  if (id.includes('monthly')) return 'monthly';
  if (id.includes('yearly') || id.includes('annual')) return 'yearly';
  return 'monthly';
}
