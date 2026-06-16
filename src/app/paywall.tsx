import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';

import { Colors, Font, Radius, type Theme } from '@/constants/theme';
import { RC_ENTITLEMENT } from '@/lib/purchases';

type PlanUI = { pkg: PurchasesPackage; label: string; price: string; per: string; badge?: string; fineprint?: string };

function PlanCard({ plan, selected, onPress, T }: { plan: PlanUI; selected: boolean; onPress: () => void; T: Theme }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: selected ? T.invertBg : T.card,
        borderRadius: Radius.lg,
        borderWidth: selected ? 0 : StyleSheet.hairlineWidth,
        borderColor: T.cardBorder,
        padding: 16,
        opacity: pressed ? 0.85 : 1,
      })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontFamily: Font.displayBold, fontSize: 18, color: selected ? T.invertText : T.text, letterSpacing: -0.4 }}>
              {plan.label}
            </Text>
            {plan.badge && (
              <View style={{ backgroundColor: selected ? 'rgba(255,255,255,0.18)' : T.text, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill }}>
                <Text style={{ fontFamily: Font.bodyBold, fontSize: 9.5, color: T.invertText, letterSpacing: 0.6 }}>{plan.badge}</Text>
              </View>
            )}
          </View>
          {plan.fineprint && (
            <Text style={{ fontFamily: Font.bodyReg, fontSize: 12.5, color: selected ? 'rgba(255,255,255,0.6)' : T.textDim, letterSpacing: -0.05 }}>
              {plan.fineprint}
            </Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: Font.displayBlack, fontSize: 22, color: selected ? T.invertText : T.text, letterSpacing: -0.7 }}>{plan.price}</Text>
          <Text style={{ fontFamily: Font.bodyMed, fontSize: 11, color: selected ? 'rgba(255,255,255,0.55)' : T.textSubtle }}>per {plan.per}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function PaywallScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const [plans, setPlans] = useState<PlanUI[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available packages from RevenueCat on mount.
  useState(() => {
    Purchases.getOfferings()
      .then(offerings => {
        const pkgs = offerings.current?.availablePackages ?? [];
        const ui: PlanUI[] = pkgs.map(pkg => {
          const id = pkg.product.identifier.toLowerCase();
          const price = pkg.product.priceString;
          if (id.includes('yearly') || id.includes('annual')) {
            return { pkg, label: 'Yearly', price, per: 'year', badge: 'BEST VALUE', fineprint: `${price}/year` };
          }
          if (id.includes('monthly')) {
            return { pkg, label: 'Monthly', price, per: 'month', fineprint: `Billed monthly` };
          }
          return { pkg, label: 'Weekly', price, per: 'week', fineprint: 'Billed weekly' };
        });
        // Yearly first
        ui.sort((a, b) => (a.label === 'Yearly' ? -1 : b.label === 'Yearly' ? 1 : 0));
        setPlans(ui);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  });

  const handlePurchase = async () => {
    const plan = plans[selectedIdx];
    if (!plan || purchasing) return;
    setError(null);
    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(plan.pkg);
      if (customerInfo.entitlements.active[RC_ENTITLEMENT]) {
        router.back();
      }
    } catch (e: unknown) {
      const err = e as { userCancelled?: boolean; message?: string };
      if (!err.userCancelled) {
        setError(err.message ?? 'Purchase failed. Please try again.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    try {
      const info = await Purchases.restorePurchases();
      if (info.entitlements.active[RC_ENTITLEMENT]) {
        router.back();
      } else {
        setError('No active subscription found.');
      }
    } catch {
      setError('Restore failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.background }} edges={['top', 'bottom']}>
      {/* Close button */}
      <Pressable
        onPress={() => router.back()}
        hitSlop={16}
        style={{ position: 'absolute', top: 56, right: 20, zIndex: 10 }}>
        <Text style={{ fontFamily: Font.icon, fontSize: 22, color: T.textDim, lineHeight: 24, includeFontPadding: false }}>
          close
        </Text>
      </Pressable>

      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 48 }}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={{ fontFamily: Font.bodyMed, fontSize: 11, letterSpacing: 2.4, color: T.textDim, marginBottom: 12 }}>
            HARDPACT PRO
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(440)}>
          <Text style={{ fontFamily: Font.displayBlack, fontSize: 38, color: T.text, letterSpacing: -1.4, lineHeight: 42, marginBottom: 6 }}>
            Unlock everything.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(440)}>
          <Text style={{ fontFamily: Font.bodyReg, fontSize: 14, color: T.textDim, lineHeight: 20, marginBottom: 28 }}>
            One subscription. Every feature. No limits.
          </Text>
        </Animated.View>

        {/* Features */}
        <Animated.View
          entering={FadeInDown.delay(220).duration(440)}
          style={{ backgroundColor: T.card, borderWidth: StyleSheet.hairlineWidth, borderColor: T.cardBorder, borderRadius: Radius.lg, padding: 18, gap: 10, marginBottom: 24 }}>
          {['All challenge types', 'Unlimited custom habits', 'AI meal scanner', 'Progress photos & journal', 'Friend accountability', 'Daily reminders'].map(line => (
            <View key={line} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontFamily: Font.icon, fontSize: 16, color: T.text, lineHeight: 18 }}>check_circle</Text>
              <Text style={{ flex: 1, fontFamily: Font.bodyMed, fontSize: 14, color: T.text, letterSpacing: -0.1 }}>{line}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Plan selector */}
        {loading ? (
          <ActivityIndicator color={T.text} style={{ marginBottom: 20 }} />
        ) : (
          <Animated.View entering={FadeInDown.delay(300).duration(440)} style={{ gap: 10, marginBottom: 20 }}>
            {plans.map((p, i) => (
              <PlanCard key={i} plan={p} selected={selectedIdx === i} onPress={() => setSelectedIdx(i)} T={T} />
            ))}
          </Animated.View>
        )}

        {error && (
          <Text style={{ fontFamily: Font.bodyMed, fontSize: 13, color: '#DC2626', textAlign: 'center', marginBottom: 12 }}>
            {error}
          </Text>
        )}

        {/* CTA */}
        <Pressable
          onPress={handlePurchase}
          disabled={purchasing || loading || plans.length === 0}
          style={({ pressed }) => ({
            backgroundColor: T.invertBg, borderRadius: Radius.pill, height: 52,
            justifyContent: 'center', alignItems: 'center',
            opacity: pressed || purchasing ? 0.7 : 1, marginBottom: 12,
          })}>
          {purchasing
            ? <ActivityIndicator color={T.invertText} />
            : <Text style={{ fontFamily: Font.displayBold, fontSize: 16, color: T.invertText, letterSpacing: -0.3 }}>
                Subscribe now
              </Text>}
        </Pressable>

        {/* Links */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20 }}>
          <Pressable onPress={handleRestore}>
            <Text style={{ fontFamily: Font.bodyReg, fontSize: 12, color: T.textSubtle, textDecorationLine: 'underline' }}>Restore purchase</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL('https://hardpact.com/terms')}>
            <Text style={{ fontFamily: Font.bodyReg, fontSize: 12, color: T.textSubtle, textDecorationLine: 'underline' }}>Terms</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL('https://hardpact.com/privacy')}>
            <Text style={{ fontFamily: Font.bodyReg, fontSize: 12, color: T.textSubtle, textDecorationLine: 'underline' }}>Privacy</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
