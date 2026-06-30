import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { OnboardingFrame } from '@/components/onboarding-frame';
import { Colors, Font, Radius, type Theme } from '@/constants/theme';
import {
  useCachedPreferences,
  useClaimUsername,
  useMarkOnboardingComplete,
  useMyUsername,
  useSavePreferences,
  useSyncSubscriptionStatus,
} from '@/lib/convex-api';
import { clearOnboardingDraft, useOnboarding } from '@/lib/onboarding-store';
import { RC_ENTITLEMENT, getSubscriptionStatus } from '@/lib/purchases';

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { state: onboardingState } = useOnboarding();
  const prefs = useCachedPreferences();
  const myUsername = useMyUsername();
  const savePreferences = useSavePreferences();
  const markOnboardingComplete = useMarkOnboardingComplete();
  const claimUsername = useClaimUsername();
  const syncStatus = useSyncSubscriptionStatus();

  // Save a draft to the DB the first time paywall mounts with real onboarding data
  // but no prefs row yet. This lets the user close the app here and return directly
  // to the paywall without losing their data.
  const draftAttempted = useRef(false);
  useEffect(() => {
    if (prefs === undefined) return; // still loading
    if (prefs !== null) return;      // draft or completed row already in DB
    if (draftAttempted.current) return;
    if (!onboardingState.name) return; // nothing collected yet (e.g., empty state after app kill)

    draftAttempted.current = true;
    const todayLocal = new Date().toLocaleDateString('en-CA');

    const saveDraft = async () => {
      try {
        // Claim username so it's reserved even if the user closes before paying.
        if (onboardingState.username) {
          await claimUsername({
            username: onboardingState.username,
            displayName: onboardingState.username,
          });
        }
        await savePreferences({
          name: onboardingState.name,
          challenge: onboardingState.challenge ?? '75-hard',
          challengeLength: onboardingState.challengeLength,
          challengeStartDate: todayLocal,
          customHabits: onboardingState.customHabits,
          whyMotivations: onboardingState.whyMotivations,
          pastFailures: onboardingState.pastFailures,
          seriousness: onboardingState.seriousness,
          partnerInvited: onboardingState.partnerInvited,
          reminderTimes: onboardingState.reminderTimes,
          weightKg: onboardingState.weightKg ?? undefined,
          waterGoalMl: onboardingState.waterGoalMl,
          onboardingCompleted: false,
        });
      } catch {
        // Silent — handleStartTrial will retry the full save on purchase if needed.
        draftAttempted.current = false;
      }
    };

    saveDraft();
  }, [prefs]); // re-check whenever prefs loads

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

  const handleStartTrial = async () => {
    if (saving || !selectedPlan) return;
    setSaving(true);
    setError(null);
    try {
      const { customerInfo } = await Purchases.purchasePackage(selectedPlan.pkg);
      if (!customerInfo.entitlements.active[RC_ENTITLEMENT]) {
        setError('Purchase could not be verified. Please try again.');
        return;
      }

      const status = getSubscriptionStatus(customerInfo);
      if (status) syncStatus({ status, source: 'direct' }).catch(() => {});

      const todayLocal = new Date().toLocaleDateString('en-CA');

      if (prefs !== null) {
        // Draft already in DB (saved on mount or on a previous app session).
        // Username may or may not be claimed — only claim if still needed.
        if (onboardingState.username && myUsername === null) {
          try {
            await claimUsername({
              username: onboardingState.username,
              displayName: onboardingState.username,
            });
          } catch {
            setSaving(false);
            router.replace('/onboarding/username');
            return;
          }
        }
        await markOnboardingComplete({ challengeStartDate: todayLocal });
      } else {
        // Draft save didn't complete — do the full save now.
        if (onboardingState.username) {
          try {
            await claimUsername({
              username: onboardingState.username,
              displayName: onboardingState.username,
            });
          } catch {
            setSaving(false);
            router.replace('/onboarding/username');
            return;
          }
        }
        await savePreferences({
          name: onboardingState.name,
          challenge: onboardingState.challenge ?? '75-hard',
          challengeLength: onboardingState.challengeLength,
          challengeStartDate: todayLocal,
          customHabits: onboardingState.customHabits,
          whyMotivations: onboardingState.whyMotivations,
          pastFailures: onboardingState.pastFailures,
          seriousness: onboardingState.seriousness,
          partnerInvited: onboardingState.partnerInvited,
          reminderTimes: onboardingState.reminderTimes,
          weightKg: onboardingState.weightKg ?? undefined,
          waterGoalMl: onboardingState.waterGoalMl,
          onboardingCompleted: true,
        });
      }

      clearOnboardingDraft();
      router.replace('/');
    } catch (e: unknown) {
      const err = e as { userCancelled?: boolean; message?: string };
      if (!err.userCancelled) {
        setError(err.message ?? 'Purchase failed. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async () => {
    setSaving(true);
    setError(null);
    try {
      const before = await Purchases.getCustomerInfo();
      const info = await Purchases.restorePurchases();
      if (info.entitlements.active[RC_ENTITLEMENT]) {
        const status = getSubscriptionStatus(info);
        const source =
          info.originalAppUserId === before.originalAppUserId
            ? 'restored'
            : 'transferred';
        if (status) syncStatus({ status, source }).catch(() => {});

        const todayLocal = new Date().toLocaleDateString('en-CA');

        if (prefs !== null && prefs.onboardingCompleted === false) {
          // Draft exists — mark it complete with today's start date.
          await markOnboardingComplete({ challengeStartDate: todayLocal });
        } else if (prefs === null && onboardingState.name) {
          // No draft but we have in-memory data — save and complete.
          if (onboardingState.username && myUsername === null) {
            await claimUsername({
              username: onboardingState.username,
              displayName: onboardingState.username,
            }).catch(() => {});
          }
          await savePreferences({
            name: onboardingState.name,
            challenge: onboardingState.challenge ?? '75-hard',
            challengeLength: onboardingState.challengeLength,
            challengeStartDate: todayLocal,
            customHabits: onboardingState.customHabits,
            whyMotivations: onboardingState.whyMotivations,
            pastFailures: onboardingState.pastFailures,
            seriousness: onboardingState.seriousness,
            partnerInvited: onboardingState.partnerInvited,
            reminderTimes: onboardingState.reminderTimes,
            weightKg: onboardingState.weightKg ?? undefined,
            waterGoalMl: onboardingState.waterGoalMl,
            onboardingCompleted: true,
          });
        }
        // If prefs already complete (returning subscriber restoring on existing account),
        // nothing to update — just go home.

        clearOnboardingDraft();
        router.replace('/');
      } else {
        setError('No active subscription found.');
      }
    } catch {
      setError('Restore failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const continueLabel = selectedPlan
    ? `Pay ${selectedPlan.price}`
    : 'Subscribe';

  return (
    <OnboardingFrame
      step={16}
      onContinue={handleStartTrial}
      continueLabel={continueLabel}
      continueLoading={saving}
      continueDisabled={loadingPlans || plans.length === 0}
      bottomAccessory={
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
      }
    >
      <View style={{ flex: 1 }}>
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
            CHOOSE YOUR PLAN
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

        {/* Trust line */}
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
      </View>
    </OnboardingFrame>
  );
}
