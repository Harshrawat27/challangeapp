import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Font, Radius, type Theme } from '@/constants/theme';
import { RC_ENTITLEMENT } from '@/lib/purchases';

type Plan = {
  pkg: PurchasesPackage;
  label: string;
  price: string;
  per: string;
  badge?: string;
  fineprint?: string;
};

function mapPackages(pkgs: PurchasesPackage[]): Plan[] {
  const ui: Plan[] = pkgs.map((pkg) => {
    const id = pkg.product.identifier.toLowerCase();
    const price = pkg.product.priceString;
    if (id.includes('yearly') || id.includes('annual')) {
      const hasTrial = !!pkg.product.introPrice;
      return {
        pkg,
        label: 'Yearly',
        price,
        per: 'year',
        badge: 'SAVE 67%',
        fineprint: hasTrial
          ? `3 days free, then ${price}/year`
          : `${price}/year`,
      };
    }
    if (id.includes('weekly')) {
      return {
        pkg,
        label: 'Weekly',
        price,
        per: 'week',
        fineprint: 'Billed weekly',
      };
    }
    return {
      pkg,
      label: 'Monthly',
      price,
      per: 'month',
      fineprint: 'Billed monthly',
    };
  });
  ui.sort((a, b) => (a.label === 'Yearly' ? -1 : b.label === 'Yearly' ? 1 : 0));
  return ui;
}

function PlanCard({
  plan,
  selected,
  onPress,
  T,
}: {
  plan: Plan;
  selected: boolean;
  onPress: () => void;
  T: Theme;
}) {
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
      })}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text
              style={{
                fontFamily: Font.displayBold,
                fontSize: 18,
                color: selected ? T.invertText : T.text,
                letterSpacing: -0.4,
              }}
            >
              {plan.label}
            </Text>
            {plan.badge && (
              <View
                style={{
                  backgroundColor: selected ? 'rgba(255,255,255,0.18)' : T.text,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: Radius.pill,
                }}
              >
                <Text
                  style={{
                    fontFamily: Font.bodyBold,
                    fontSize: 9.5,
                    color: T.invertText,
                    letterSpacing: 0.6,
                  }}
                >
                  {plan.badge}
                </Text>
              </View>
            )}
          </View>
          {plan.fineprint && (
            <Text
              style={{
                fontFamily: Font.bodyReg,
                fontSize: 12.5,
                color: selected ? 'rgba(255,255,255,0.6)' : T.textDim,
                letterSpacing: -0.05,
              }}
            >
              {plan.fineprint}
            </Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={{
              fontFamily: Font.displayBlack,
              fontSize: 22,
              color: selected ? T.invertText : T.text,
              letterSpacing: -0.7,
            }}
          >
            {plan.price}
          </Text>
          <Text
            style={{
              fontFamily: Font.bodyMed,
              fontSize: 11,
              color: selected ? 'rgba(255,255,255,0.55)' : T.textSubtle,
              letterSpacing: -0.05,
            }}
          >
            per {plan.per}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function PaywallScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Purchases.getOfferings()
      .then((offerings) => {
        const pkgs = offerings.current?.availablePackages ?? [];
        setPlans(mapPackages(pkgs));
      })
      .catch(() => {})
      .finally(() => setLoadingPlans(false));
  }, []);

  const selectedPlan = plans[selectedIdx];

  const handlePurchase = async () => {
    if (!selectedPlan || purchasing) return;
    setError(null);
    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(
        selectedPlan.pkg
      );
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
    setError(null);
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

  const continueLabel = selectedPlan ? `Pay ${selectedPlan.price}` : 'Subscribe';

  return (
    <View style={{ flex: 1, backgroundColor: T.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 24,
          }}
        >
          <Animated.View entering={FadeIn.duration(400)}>
            <Text
              style={{
                fontFamily: Font.bodyMed,
                fontSize: 11,
                letterSpacing: 2.4,
                color: T.textDim,
                marginBottom: 12,
              }}
            >
              HARDPACT PRO
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(440)}>
            <Text
              style={{
                fontFamily: Font.displayBlack,
                fontSize: 38,
                color: T.text,
                letterSpacing: -1.4,
                lineHeight: 42,
                marginBottom: 6,
              }}
            >
              Start the work.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).duration(440)}>
            <Text
              style={{
                fontFamily: Font.bodyReg,
                fontSize: 14,
                color: T.textDim,
                lineHeight: 20,
                marginBottom: 24,
              }}
            >
              Less than a coffee a month. Show up every day.
            </Text>
          </Animated.View>

          {/* Plan cards */}
          {loadingPlans ? (
            <ActivityIndicator color={T.text} style={{ marginBottom: 20 }} />
          ) : (
            <View style={{ gap: 10 }}>
              {plans.map((p, i) => (
                <Animated.View
                  key={p.pkg.identifier}
                  entering={FadeInDown.delay(240 + i * 90).duration(440)}
                >
                  <PlanCard
                    plan={p}
                    selected={selectedIdx === i}
                    onPress={() => setSelectedIdx(i)}
                    T={T}
                  />
                </Animated.View>
              ))}
            </View>
          )}

          {error && (
            <Text
              style={{
                fontFamily: Font.bodyMed,
                fontSize: 13,
                color: '#DC2626',
                textAlign: 'center',
                marginTop: 12,
              }}
            >
              {error}
            </Text>
          )}

          {/* What's included */}
          <Animated.View
            entering={FadeInDown.delay(440).duration(440)}
            style={{
              marginTop: 24,
              backgroundColor: T.card,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: T.cardBorder,
              borderRadius: Radius.lg,
              padding: 18,
              gap: 10,
            }}
          >
            <Text
              style={{
                fontFamily: Font.bodyMed,
                fontSize: 11,
                letterSpacing: 1.6,
                color: T.textSubtle,
                marginBottom: 4,
              }}
            >
              EVERYTHING INCLUDED
            </Text>
            {[
              'Track all 5 challenges',
              'Unlimited custom habits',
              'AI meal scanner',
              'Progress photos & journal',
              'Friend accountability',
              'Daily reminders',
            ].map((line) => (
              <View
                key={line}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
              >
                <Text
                  style={{
                    fontFamily: Font.icon,
                    fontSize: 16,
                    color: T.text,
                    lineHeight: 18,
                  }}
                >
                  check_circle
                </Text>
                <Text
                  style={{
                    flex: 1,
                    fontFamily: Font.bodyMed,
                    fontSize: 14,
                    color: T.text,
                    letterSpacing: -0.1,
                  }}
                >
                  {line}
                </Text>
              </View>
            ))}
          </Animated.View>

          {/* Trust links */}
          <Animated.View
            entering={FadeIn.delay(620).duration(400)}
            style={{ marginTop: 20 }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 16,
                paddingVertical: 4,
              }}
            >
              <Pressable
                onPress={() => Linking.openURL('https://hardpact.com/terms')}
              >
                <Text
                  style={{
                    fontFamily: Font.bodyReg,
                    fontSize: 11,
                    color: T.textSubtle,
                    textDecorationLine: 'underline',
                  }}
                >
                  Terms
                </Text>
              </Pressable>
              <Pressable
                onPress={() => Linking.openURL('https://hardpact.com/privacy')}
              >
                <Text
                  style={{
                    fontFamily: Font.bodyReg,
                    fontSize: 11,
                    color: T.textSubtle,
                    textDecorationLine: 'underline',
                  }}
                >
                  Privacy
                </Text>
              </Pressable>
              <Pressable onPress={handleRestore}>
                <Text
                  style={{
                    fontFamily: Font.bodyReg,
                    fontSize: 11,
                    color: T.textSubtle,
                    textDecorationLine: 'underline',
                  }}
                >
                  Restore purchase
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Bottom CTA */}
        <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16 }}>
          <Text
            style={{
              fontFamily: Font.bodyReg,
              fontSize: 11,
              color: T.textSubtle,
              textAlign: 'center',
              marginBottom: 12,
              letterSpacing: -0.05,
            }}
          >
            Cancel anytime in Settings.
          </Text>
          <Pressable
            onPress={handlePurchase}
            disabled={purchasing || loadingPlans || plans.length === 0}
            style={({ pressed }) => ({
              height: 54,
              borderRadius: Radius.pill,
              backgroundColor: T.invertBg,
              justifyContent: 'center',
              alignItems: 'center',
              opacity:
                purchasing || loadingPlans || plans.length === 0
                  ? 0.35
                  : pressed
                    ? 0.78
                    : 1,
            })}
          >
            {purchasing ? (
              <ActivityIndicator color={T.invertText} />
            ) : (
              <Text
                style={{
                  fontFamily: Font.displaySemi,
                  fontSize: 16,
                  color: T.invertText,
                  letterSpacing: -0.2,
                }}
              >
                {continueLabel}
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
