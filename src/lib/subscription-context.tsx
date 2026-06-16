import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Purchases, { type CustomerInfo } from 'react-native-purchases';

import {
  getSubscriptionStatus,
  isSubscriptionActive,
  type SubscriptionStatus,
} from './purchases';
import { useSyncSubscriptionStatus } from './convex-api';

type ContextValue = {
  isSubscribed: boolean;
  status: SubscriptionStatus | null;
  customerInfo: CustomerInfo | null;
  isLoading: boolean;
};

const SubscriptionContext = createContext<ContextValue>({
  isSubscribed: false,
  status: null,
  customerInfo: null,
  isLoading: true,
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const syncStatus = useSyncSubscriptionStatus();

  // Track last-synced status to avoid unnecessary Convex mutations.
  const lastSyncedStatus = useRef<SubscriptionStatus | 'none' | null>(null);

  // Fetch on mount.
  useEffect(() => {
    Purchases.getCustomerInfo()
      .then(setCustomerInfo)
      .catch(() => {})
      .finally(() => setIsLoading(false));

    const remove = Purchases.addCustomerInfoUpdateListener(setCustomerInfo);
    return remove;
  }, []);

  // Mirror to Convex whenever the RevenueCat status changes.
  useEffect(() => {
    if (!customerInfo) return;

    const newStatus = getSubscriptionStatus(customerInfo);
    // Determine what to write: active status or 'expired' if entitlement gone.
    const toSync: SubscriptionStatus | null = newStatus ?? (
      lastSyncedStatus.current && lastSyncedStatus.current !== 'none'
        ? 'expired'
        : null
    );

    if (!toSync) return;
    if (toSync === lastSyncedStatus.current) return;

    lastSyncedStatus.current = toSync;
    syncStatus({ status: toSync }).catch(() => {});
  }, [customerInfo, syncStatus]);

  const status = customerInfo ? getSubscriptionStatus(customerInfo) : null;
  const isSubscribed = customerInfo ? isSubscriptionActive(customerInfo) : false;

  return (
    <SubscriptionContext.Provider value={{ isSubscribed, status, customerInfo, isLoading }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
