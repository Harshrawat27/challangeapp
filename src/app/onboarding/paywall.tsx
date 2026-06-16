import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { OnboardingFrame } from '@/components/onboarding-frame';
import { Colors, Font, Radius, type Theme } from '@/constants/theme';
import { useOnboarding } from '@/lib/onboarding-store';
import { useSavePreferences, useClaimUsername } from '@/lib/convex-api';

type Plan = {
  id: 'yearly' | 'monthly';
  label: string;
  price: string;
  per: string;
  badge?: string;
  fineprint?: string;
};

const PLANS: Plan[] = [
  {
    id: 'yearly',
    label: 'Yearly',
    price: '$39.99',
    per: 'year',
    badge: 'SAVE 67%',
    fineprint: '3 days free, then $39.99/year',
  },
  {
    id: 'monthly',
    label: 'Monthly',
    price: '$9.99',
    per: 'month',
    fineprint: 'Billed monthly',
  },
];

function PlanCard({
  plan, selected, onPress, T,
}: { plan: Plan; selected: boolean; onPress: () => void; T: Theme }) {
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
            <Text style={{
              fontFamily: Font.displayBold,
              fontSize: 18,
              color: selected ? T.invertText : T.text,
              letterSpacing: -0.4,
            }}>
              {plan.label}
            </Text>
            {plan.badge && (
              <View style={{
                backgroundColor: selected ? 'rgba(255,255,255,0.18)' : T.text,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: Radius.pill,
              }}>
                <Text style={{
                  fontFamily: Font.bodyBold,
                  fontSize: 9.5,
                  color: selected ? T.invertText : T.invertText,
                  letterSpacing: 0.6,
                }}>
                  {plan.badge}
                </Text>
              </View>
            )}
          </View>
          {plan.fineprint && (
            <Text style={{
              fontFamily: Font.bodyReg,
              fontSize: 12.5,
              color: selected ? 'rgba(255,255,255,0.6)' : T.textDim,
              letterSpacing: -0.05,
            }}>
              {plan.fineprint}
            </Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{
            fontFamily: Font.displayBlack,
            fontSize: 22,
            color: selected ? T.invertText : T.text,
            letterSpacing: -0.7,
          }}>
            {plan.price}
          </Text>
          <Text style={{
            fontFamily: Font.bodyMed,
            fontSize: 11,
            color: selected ? 'rgba(255,255,255,0.55)' : T.textSubtle,
            letterSpacing: -0.05,
          }}>
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

  const [planId, setPlanId] = useState<Plan['id']>('yearly');
  const [saving, setSaving] = useState(false);

  const { state: onboardingState } = useOnboarding();
  const savePreferences = useSavePreferences();
  const claimUsername = useClaimUsername();

  const handleStartTrial = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // Claim username here — deferred from account.tsx so the Convex auth
      // token has time to sync after signUp before we call a mutation.
      if (onboardingState.username) {
        try {
          await claimUsername({
            username: onboardingState.username,
            displayName: onboardingState.username,
          });
        } catch {
          // Username was taken in the window between check and now.
          setSaving(false);
          router.replace('/onboarding/username');
          return;
        }
      }
      const todayLocal = new Date().toLocaleDateString('en-CA');
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
      });
      router.replace('/');
    } catch (e) {
      console.warn('[paywall] failed to persist onboarding:', e);
      router.replace('/');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingFrame
      step={16}
      onContinue={handleStartTrial}
      continueLabel={planId === 'yearly' ? 'Start free trial' : 'Subscribe'}
      continueLoading={saving}
      bottomAccessory={
        <Text style={{
          fontFamily: Font.bodyReg,
          fontSize: 11,
          color: T.textSubtle,
          textAlign: 'center',
          marginBottom: 12,
          letterSpacing: -0.05,
        }}>
          Cancel anytime in Settings. No charge during trial.
        </Text>
      }>
      <View style={{ flex: 1 }}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={{
            fontFamily: Font.bodyMed, fontSize: 11, letterSpacing: 2.4, color: T.textDim,
            marginBottom: 12,
          }}>
            STEP 15 — CHOOSE YOUR PLAN
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(440)}>
          <Text style={{
            fontFamily: Font.displayBlack, fontSize: 38, color: T.text,
            letterSpacing: -1.4, lineHeight: 42, marginBottom: 6,
          }}>
            Start the work.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(440)}>
          <Text style={{
            fontFamily: Font.bodyReg, fontSize: 14, color: T.textDim, lineHeight: 20,
            marginBottom: 24,
          }}>
            Less than a coffee a month. Show up every day.
          </Text>
        </Animated.View>

        {/* Plan cards */}
        <View style={{ gap: 10 }}>
          {PLANS.map((p, i) => (
            <Animated.View key={p.id} entering={FadeInDown.delay(240 + i * 90).duration(440)}>
              <PlanCard
                plan={p}
                selected={planId === p.id}
                onPress={() => setPlanId(p.id)}
                T={T}
              />
            </Animated.View>
          ))}
        </View>

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
          }}>
          <Text style={{
            fontFamily: Font.bodyMed,
            fontSize: 11,
            letterSpacing: 1.6,
            color: T.textSubtle,
            marginBottom: 4,
          }}>
            EVERYTHING INCLUDED
          </Text>
          {[
            'Track all 5 challenges',
            'Unlimited custom habits',
            'Progress photos & journal',
            'Friend accountability',
            'Daily reminders',
          ].map(line => (
            <View key={line} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{
                fontFamily: Font.icon, fontSize: 16, color: T.text, lineHeight: 18,
              }}>
                check_circle
              </Text>
              <Text style={{
                flex: 1,
                fontFamily: Font.bodyMed,
                fontSize: 14,
                color: T.text,
                letterSpacing: -0.1,
              }}>
                {line}
              </Text>
            </View>
          ))}
        </Animated.View>

        {/* Trust line */}
        <Animated.View entering={FadeIn.delay(620).duration(400)} style={{ marginTop: 20 }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 16,
            paddingVertical: 4,
          }}>
            <Pressable onPress={() => Linking.openURL('https://hardpact.com/terms')}>
              <Text style={{
                fontFamily: Font.bodyReg, fontSize: 11, color: T.textSubtle,
                textDecorationLine: 'underline',
              }}>
                Terms
              </Text>
            </Pressable>
            <Pressable onPress={() => Linking.openURL('https://hardpact.com/privacy')}>
              <Text style={{
                fontFamily: Font.bodyReg, fontSize: 11, color: T.textSubtle,
                textDecorationLine: 'underline',
              }}>
                Privacy
              </Text>
            </Pressable>
            <Pressable onPress={() => router.replace('/sign-in')}>
              <Text style={{
                fontFamily: Font.bodyReg, fontSize: 11, color: T.textSubtle,
                textDecorationLine: 'underline',
              }}>
                Restore purchase
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </OnboardingFrame>
  );
}
