import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Appearance,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

import { authClient } from '@/lib/auth-client';
import { clearPrefsCache, useCachedPreferences, useChallengeHistory, useMyUsername, usePatchPrefs } from '@/lib/convex-api';
import { useSubscription } from '@/lib/subscription-context';
import { getChallenge } from '@/constants/challenges';
import { localDateString } from '@/lib/tasks';
import { Colors, Font, MaxContentWidth, Radius, type Theme } from '@/constants/theme';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitial(name?: string | null, email?: string | null) {
  const source = (name || email || '?').trim();
  return source.charAt(0).toUpperCase();
}

// ─── Section ────────────────────────────────────────────────────────────────

function SectionLabel({ children, T }: { children: string; T: Theme }) {
  return (
    <Text style={{
      fontFamily: Font.bodyMed,
      fontSize: 11,
      letterSpacing: 1.8,
      color: T.textSubtle,
      marginLeft: 4,
      marginBottom: 8,
      marginTop: 28,
    }}>
      {children.toUpperCase()}
    </Text>
  );
}

function Card({ children, T }: { children: React.ReactNode; T: Theme }) {
  return (
    <View style={{
      backgroundColor: T.card,
      borderRadius: Radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: T.cardBorder,
      overflow: 'hidden',
    }}>
      {children}
    </View>
  );
}

function Row({
  label,
  value,
  onPress,
  chevron,
  destructive,
  loading,
  isLast,
  T,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  loading?: boolean;
  isLast?: boolean;
  T: Theme;
}) {
  const labelColor = destructive ? '#DC2626' : T.text;
  const interactive = !!onPress;

  const content = (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
      borderBottomColor: T.hairline,
    }}>
      <Text style={{
        flex: 1,
        fontFamily: interactive ? Font.bodySemi : Font.bodyMed,
        fontSize: 15,
        color: labelColor,
        letterSpacing: -0.1,
      }}>
        {label}
      </Text>
      {loading ? (
        <ActivityIndicator size='small' color={T.text} />
      ) : value ? (
        <Text
          numberOfLines={1}
          style={{
            maxWidth: 220,
            fontFamily: Font.bodyReg,
            fontSize: 14,
            color: T.textDim,
            letterSpacing: -0.05,
          }}>
          {value}
        </Text>
      ) : null}
      {chevron && (
        <Text style={{
          fontFamily: Font.icon,
          fontSize: 18,
          color: T.textSubtle,
          marginLeft: 8,
        }}>
          chevron_right
        </Text>
      )}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => ({
        opacity: pressed && !loading ? 0.55 : 1,
        backgroundColor: pressed ? T.hairline : 'transparent',
      })}>
      {content}
    </Pressable>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

const APP_VERSION = (Constants.expoConfig?.version as string | undefined) ?? '1.0.0';

export default function ProfileScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  const { isSubscribed } = useSubscription();
  // Redirects unsubscribed users to the paywall instead of running the action.
  const gated = (fn: () => void) => () => isSubscribed ? fn() : router.push('/paywall');

  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [themePref, setThemePref] = useState<'system' | 'light' | 'dark'>(() => {
    const stored = SecureStore.getItem('theme_preference');
    return (stored as 'system' | 'light' | 'dark' | null) ?? 'system';
  });

  const handleThemeChange = useCallback((pref: 'system' | 'light' | 'dark') => {
    setThemePref(pref);
    if (pref === 'system') {
      Appearance.setColorScheme(null);
      SecureStore.deleteItemAsync('theme_preference');
    } else {
      Appearance.setColorScheme(pref);
      SecureStore.setItemAsync('theme_preference', pref);
    }
  }, []);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign out?',
      'You can sign back in anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              clearPrefsCache();
              await authClient.signOut();
            } finally {
              setSigningOut(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
  }, []);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account and all challenge data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await authClient.deleteUser();
              // Session is invalidated; root _layout redirects.
            } catch (e) {
              Alert.alert('Could not delete account', 'Please try again.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
  }, []);

  const openUrl = useCallback((url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Could not open link', url);
    });
  }, []);

  // ── Challenge & water ──────────────────────────────────────────────────────
  const prefs = useCachedPreferences();
  const patchPrefs = usePatchPrefs();
  const history = useChallengeHistory();
  const username = useMyUsername();
  const initial = useMemo(
    () => getInitial(prefs?.name, user?.email),
    [prefs?.name, user?.email],
  );

  const challengeStatus = useMemo(() => {
    if (!prefs) return null;
    const ch = getChallenge(prefs.challenge as never);
    const today = localDateString();
    const daysPassed = prefs.challengeStartDate
      ? Math.floor((new Date(today).getTime() - new Date(prefs.challengeStartDate).getTime()) / 86400000)
      : 0;
    const currentDay = Math.max(1, Math.min(daysPassed + 1, prefs.challengeLength));
    const isComplete = daysPassed >= prefs.challengeLength;
    return { name: ch?.name ?? prefs.challenge, currentDay, total: prefs.challengeLength, isComplete };
  }, [prefs]);

  const WATER_STEP = 250;
  const WATER_MIN = 500;
  const WATER_MAX = 6000;
  const serverGoal = prefs?.waterGoalMl ?? 2500;
  const [waterGoal, setWaterGoal] = useState(serverGoal);
  const [waterSaving, setWaterSaving] = useState(false);
  const [waterSaved, setWaterSaved] = useState(false);
  const waterChanged = waterGoal !== serverGoal;

  const adjustWater = (delta: number) =>
    setWaterGoal(g => Math.max(WATER_MIN, Math.min(WATER_MAX, g + delta)));

  const handleSaveWater = async () => {
    if (waterSaving) return;
    setWaterSaving(true);
    try {
      await patchPrefs({ waterGoalMl: waterGoal });
      setWaterSaved(true);
      setTimeout(() => setWaterSaved(false), 1500);
    } catch {
      Alert.alert('Error', 'Could not save. Please try again.');
    } finally {
      setWaterSaving(false);
    }
  };

  const mlLabel = (ml: number) =>
    ml >= 1000 ? `${(ml / 1000).toFixed(1).replace('.0', '')}L` : `${ml}ml`;

  return (
    <View style={{ flex: 1, backgroundColor: T.background, alignItems: 'center' }}>
      <SafeAreaView style={{ flex: 1, width: '100%', maxWidth: MaxContentWidth }} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 140 }}>

          {/* ═══ Page header ═════════════════════════════════════════ */}
          <Animated.View entering={FadeIn.duration(400)}>
            <Text style={{
              fontFamily: Font.bodyMed,
              fontSize: 11,
              letterSpacing: 3,
              color: T.textDim,
              marginTop: 12,
            }}>
              75 / HARD
            </Text>
            <Text style={{
              fontFamily: Font.displayBlack,
              fontSize: 38,
              color: T.text,
              letterSpacing: -1.4,
              lineHeight: 42,
              marginTop: 6,
            }}>
              Profile.
            </Text>
          </Animated.View>

          {/* ═══ User card ═══════════════════════════════════════════ */}
          <Animated.View entering={FadeInDown.delay(120).duration(420)} style={{ marginTop: 28 }}>
            <Card T={T}>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 }}>
                <View style={{
                  width: 56, height: 56, borderRadius: 56,
                  backgroundColor: T.invertBg,
                  justifyContent: 'center', alignItems: 'center',
                }}>
                  {(isPending || prefs === undefined) ? (
                    <ActivityIndicator size='small' color={T.invertText} />
                  ) : (
                    <Text style={{
                      fontFamily: Font.displayBold,
                      fontSize: 22,
                      color: T.invertText,
                      letterSpacing: -0.5,
                    }}>
                      {initial}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: Font.displaySemi,
                      fontSize: 17,
                      color: T.text,
                      letterSpacing: -0.3,
                    }}>
                    {prefs?.name || (prefs === undefined ? 'Loading…' : '—')}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: Font.bodyReg,
                      fontSize: 13,
                      color: T.textDim,
                      marginTop: 2,
                      letterSpacing: -0.05,
                    }}>
                    {username?.username ? `@${username.username}` : ' '}
                  </Text>
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* ═══ Appearance ══════════════════════════════════════════ */}
          <Animated.View entering={FadeInDown.delay(200).duration(420)}>
            <SectionLabel T={T}>Appearance</SectionLabel>
            <Card T={T}>
              <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['system', 'light', 'dark'] as const).map(opt => {
                    const selected = themePref === opt;
                    const icons = { system: 'brightness_auto', light: 'light_mode', dark: 'dark_mode' };
                    return (
                      <Pressable
                        key={opt}
                        onPress={() => handleThemeChange(opt)}
                        style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}>
                        <View style={{
                          paddingVertical: 10,
                          borderRadius: Radius.md,
                          backgroundColor: selected ? T.invertBg : T.background,
                          borderWidth: selected ? 0 : StyleSheet.hairlineWidth,
                          borderColor: T.cardBorder,
                          alignItems: 'center',
                          gap: 4,
                        }}>
                          <Text style={{
                            fontFamily: Font.icon,
                            fontSize: 20,
                            lineHeight: 22,
                            color: selected ? T.invertText : T.textDim,
                            includeFontPadding: false,
                          }}>
                            {icons[opt]}
                          </Text>
                          <Text style={{
                            fontFamily: Font.bodySemi,
                            fontSize: 12,
                            color: selected ? T.invertText : T.textDim,
                            letterSpacing: -0.1,
                          }}>
                            {opt.charAt(0).toUpperCase() + opt.slice(1)}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* ═══ Challenge ═══════════════════════════════════════════ */}
          <Animated.View entering={FadeInDown.delay(240).duration(420)}>
            <SectionLabel T={T}>{`Challenge${!isSubscribed ? '  🔒' : ''}`}</SectionLabel>
            <Card T={T}>
              {challengeStatus && (
                <View style={{
                  paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: T.hairline,
                }}>
                  <Text style={{
                    fontFamily: Font.displaySemi, fontSize: 15,
                    color: T.text, letterSpacing: -0.2,
                  }}>
                    {challengeStatus.name}
                  </Text>
                  <Text style={{
                    fontFamily: Font.bodyReg, fontSize: 13,
                    color: challengeStatus.isComplete ? '#22C55E' : T.textDim,
                    marginTop: 2,
                  }}>
                    {challengeStatus.isComplete
                      ? `Completed · ${challengeStatus.total} days`
                      : `Day ${challengeStatus.currentDay} of ${challengeStatus.total}`}
                  </Text>
                </View>
              )}
              <Row
                label='Change challenge'
                chevron
                onPress={gated(() => router.push('/change-challenge'))}
                T={T}
              />
              <Row
                label='Challenge history'
                value={history?.length ? `${history.length} run${history.length === 1 ? '' : 's'}` : undefined}
                chevron
                onPress={gated(() => router.push('/challenge-history'))}
                isLast
                T={T}
              />
            </Card>
          </Animated.View>

          {/* ═══ Hydration ═══════════════════════════════════════════ */}
          <Animated.View entering={FadeInDown.delay(260).duration(420)}>
            <SectionLabel T={T}>{`Hydration${!isSubscribed ? '  🔒' : ''}`}</SectionLabel>
            <Card T={T}>
              <View style={{ padding: 16, gap: 12 }}>
                <Text style={{
                  fontFamily: Font.bodySemi, fontSize: 14,
                  color: T.text, letterSpacing: -0.1,
                }}>
                  Daily water goal
                </Text>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: T.background,
                  borderRadius: Radius.md,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: T.cardBorder,
                  overflow: 'hidden',
                }}>
                  <Pressable
                    onPress={gated(() => adjustWater(-WATER_STEP))}
                    style={({ pressed }) => ({
                      width: 52, height: 52,
                      justifyContent: 'center', alignItems: 'center',
                      opacity: pressed ? 0.5 : 1,
                    })}>
                    <Text style={{ fontFamily: Font.displayBold, fontSize: 22, color: T.text }}>−</Text>
                  </Pressable>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{
                      fontFamily: Font.displayBlack, fontSize: 24,
                      color: T.text, letterSpacing: -0.8,
                    }}>
                      {mlLabel(waterGoal)}
                    </Text>
                    <Text style={{ fontFamily: Font.bodyReg, fontSize: 10, color: T.textDim }}>
                      per day
                    </Text>
                  </View>
                  <Pressable
                    onPress={gated(() => adjustWater(WATER_STEP))}
                    style={({ pressed }) => ({
                      width: 52, height: 52,
                      justifyContent: 'center', alignItems: 'center',
                      opacity: pressed ? 0.5 : 1,
                    })}>
                    <Text style={{ fontFamily: Font.displayBold, fontSize: 22, color: T.text }}>+</Text>
                  </Pressable>
                </View>
                {(waterChanged || waterSaved) && (
                  <Pressable
                    onPress={gated(handleSaveWater)}
                    disabled={waterSaving || waterSaved}
                    style={({ pressed }) => ({
                      backgroundColor: waterSaved ? '#22C55E' : T.invertBg,
                      borderRadius: Radius.md,
                      paddingVertical: 12,
                      alignItems: 'center',
                      opacity: pressed || waterSaving ? 0.6 : 1,
                    })}>
                    <Text style={{
                      fontFamily: Font.displayBold, fontSize: 14,
                      color: T.invertText, letterSpacing: -0.2,
                    }}>
                      {waterSaved ? 'Saved!' : waterSaving ? 'Saving…' : 'Save changes'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </Card>
          </Animated.View>

          {/* ═══ About ═══════════════════════════════════════════════ */}
          <Animated.View entering={FadeInDown.delay(280).duration(420)}>
            <SectionLabel T={T}>About</SectionLabel>
            <Card T={T}>
              <Row label='Version' value={APP_VERSION} T={T} />
              <Row
                label='Privacy Policy'
                chevron
                onPress={() => openUrl('https://hardpact.com/privacy')}
                T={T}
              />
              <Row
                label='Terms of Service'
                chevron
                onPress={() => openUrl('https://hardpact.com/terms')}
                T={T}
              />
              <Row
                label='Support'
                value='hello@hardpact.com'
                isLast
                onPress={() => openUrl('mailto:hello@hardpact.com')}
                T={T}
              />
            </Card>
          </Animated.View>

          {/* ═══ Sign out ═══════════════════════════════════════════ */}
          <Animated.View entering={FadeInDown.delay(360).duration(420)} style={{ marginTop: 28 }}>
            <Card T={T}>
              <Row
                label='Sign out'
                onPress={handleSignOut}
                loading={signingOut}
                isLast
                T={T}
              />
            </Card>
          </Animated.View>

          {/* ═══ Danger zone ════════════════════════════════════════ */}
          <Animated.View entering={FadeInDown.delay(420).duration(420)} style={{ marginTop: 16 }}>
            <Card T={T}>
              <Row
                label='Delete account'
                destructive
                onPress={handleDeleteAccount}
                loading={deleting}
                isLast
                T={T}
              />
            </Card>
          </Animated.View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
