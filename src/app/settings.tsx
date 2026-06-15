import { useState } from 'react';
import { Alert, Appearance, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

import { authClient } from '@/lib/auth-client';
import { useCachedPreferences, useMyUsername, usePatchPrefs } from '@/lib/convex-api';
import { Colors, Font, Radius } from '@/constants/theme';
import { getChallenge } from '@/constants/challenges';
import { localDateString } from '@/lib/tasks';

const STEP = 250;
const MIN_GOAL = 500;
const MAX_GOAL = 6000;

function mlLabel(ml: number): string {
  if (ml >= 1000) return `${(ml / 1000).toFixed(1).replace('.0', '')}L`;
  return `${ml}ml`;
}

type ThemeChoice = 'system' | 'light' | 'dark';

function SectionLabel({ children, T }: { children: string; T: typeof Colors.light }) {
  return (
    <Text style={{
      fontFamily: Font.bodyMed,
      fontSize: 11,
      letterSpacing: 1.8,
      color: T.textDim,
      marginBottom: 10,
      marginLeft: 2,
    }}>
      {children.toUpperCase()}
    </Text>
  );
}

export default function SettingsScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const prefs = useCachedPreferences();
  const username = useMyUsername();
  const patchPrefs = usePatchPrefs();

  // Water goal local state — initialised from prefs, falls back to 2500.
  const serverGoal = prefs?.waterGoalMl ?? 2500;
  const [goalMl, setGoalMl] = useState(serverGoal);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const goalChanged = goalMl !== serverGoal;

  const adjustGoal = (delta: number) => {
    setGoalMl(g => Math.max(MIN_GOAL, Math.min(MAX_GOAL, g + delta)));
  };

  const handleSaveGoal = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await patchPrefs({ waterGoalMl: goalMl });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      Alert.alert('Error', 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Theme
  const storedTheme = SecureStore.getItem('theme_preference');
  const [theme, setTheme] = useState<ThemeChoice>(
    storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'system',
  );

  const applyTheme = (choice: ThemeChoice) => {
    setTheme(choice);
    if (choice === 'system') {
      SecureStore.deleteItemAsync('theme_preference').catch(() => {});
      Appearance.setColorScheme(null);
    } else {
      SecureStore.setItem('theme_preference', choice);
      Appearance.setColorScheme(choice);
    }
  };

  // Sign out
  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => authClient.signOut(),
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => ({
              width: 36, height: 36, borderRadius: 36,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: T.cardBorder,
              backgroundColor: T.card,
              justifyContent: 'center', alignItems: 'center',
              opacity: pressed ? 0.55 : 1,
            })}>
            <Text style={{
              fontFamily: Font.icon, fontSize: 18, lineHeight: 18,
              color: T.text, includeFontPadding: false, textAlignVertical: 'center',
            }}>
              arrow_back
            </Text>
          </Pressable>
          <Text style={{
            flex: 1, textAlign: 'center',
            fontFamily: Font.displayBold, fontSize: 17,
            color: T.text, letterSpacing: -0.3,
          }}>
            Settings
          </Text>
          {/* Spacer to balance the back button */}
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 60 }}>

          {/* ── Profile card ──────────────────────────────────────────── */}
          <View style={{
            backgroundColor: T.card,
            borderRadius: Radius.xl,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: T.cardBorder,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            marginBottom: 32,
          }}>
            {/* Avatar initial */}
            <View style={{
              width: 52, height: 52, borderRadius: 52,
              backgroundColor: T.invertBg,
              justifyContent: 'center', alignItems: 'center',
            }}>
              <Text style={{
                fontFamily: Font.displayBold, fontSize: 22,
                color: T.invertText, letterSpacing: -0.5,
              }}>
                {(prefs?.name ?? '?')[0]?.toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{
                fontFamily: Font.displayBold, fontSize: 17,
                color: T.text, letterSpacing: -0.3,
              }}>
                {prefs?.name ?? '—'}
              </Text>
              {username?.username && (
                <Text style={{
                  fontFamily: Font.bodyMed, fontSize: 13,
                  color: T.textDim, letterSpacing: -0.1,
                }}>
                  @{username.username}
                </Text>
              )}
            </View>
          </View>

          {/* ── Hydration ─────────────────────────────────────────────── */}
          <SectionLabel T={T}>Hydration</SectionLabel>
          <View style={{
            backgroundColor: T.card,
            borderRadius: Radius.xl,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: T.cardBorder,
            padding: 16,
            marginBottom: 28,
            gap: 14,
          }}>
            <View>
              <Text style={{
                fontFamily: Font.displaySemi, fontSize: 15,
                color: T.text, letterSpacing: -0.2,
              }}>
                Daily water goal
              </Text>
              <Text style={{
                fontFamily: Font.bodyReg, fontSize: 12.5,
                color: T.textDim, marginTop: 2,
              }}>
                The amount you aim to drink each day.
              </Text>
            </View>

            {/* Stepper */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: T.background,
              borderRadius: Radius.lg,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: T.cardBorder,
              overflow: 'hidden',
            }}>
              <Pressable
                onPress={() => adjustGoal(-STEP)}
                style={({ pressed }) => ({
                  width: 52, height: 52,
                  justifyContent: 'center', alignItems: 'center',
                  opacity: pressed ? 0.5 : 1,
                })}>
                <Text style={{ fontFamily: Font.displayBold, fontSize: 22, color: T.text }}>−</Text>
              </Pressable>

              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{
                  fontFamily: Font.displayBlack, fontSize: 26,
                  color: T.text, letterSpacing: -0.8,
                }}>
                  {mlLabel(goalMl)}
                </Text>
                <Text style={{ fontFamily: Font.bodyReg, fontSize: 10, color: T.textDim, marginTop: 1 }}>
                  per day
                </Text>
              </View>

              <Pressable
                onPress={() => adjustGoal(STEP)}
                style={({ pressed }) => ({
                  width: 52, height: 52,
                  justifyContent: 'center', alignItems: 'center',
                  opacity: pressed ? 0.5 : 1,
                })}>
                <Text style={{ fontFamily: Font.displayBold, fontSize: 22, color: T.text }}>+</Text>
              </Pressable>
            </View>

            {/* Save button — only visible when value changed */}
            {(goalChanged || saved) && (
              <Pressable
                onPress={handleSaveGoal}
                disabled={saving || saved}
                style={({ pressed }) => ({
                  backgroundColor: saved ? '#22C55E' : T.invertBg,
                  borderRadius: Radius.lg,
                  paddingVertical: 13,
                  alignItems: 'center',
                  opacity: pressed || saving ? 0.6 : 1,
                })}>
                <Text style={{
                  fontFamily: Font.displayBold, fontSize: 15,
                  color: T.invertText, letterSpacing: -0.2,
                }}>
                  {saved ? 'Saved!' : saving ? 'Saving…' : 'Save changes'}
                </Text>
              </Pressable>
            )}
          </View>

          {/* ── Appearance ────────────────────────────────────────────── */}
          <SectionLabel T={T}>Appearance</SectionLabel>
          <View style={{
            backgroundColor: T.card,
            borderRadius: Radius.xl,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: T.cardBorder,
            padding: 16,
            marginBottom: 28,
            gap: 10,
          }}>
            <Text style={{
              fontFamily: Font.displaySemi, fontSize: 15,
              color: T.text, letterSpacing: -0.2,
            }}>
              Theme
            </Text>
            <View style={{
              flexDirection: 'row',
              backgroundColor: T.background,
              borderRadius: Radius.lg,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: T.cardBorder,
              overflow: 'hidden',
            }}>
              {(['system', 'light', 'dark'] as ThemeChoice[]).map((choice, i) => (
                <Pressable
                  key={choice}
                  onPress={() => applyTheme(choice)}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 11,
                    alignItems: 'center',
                    backgroundColor: theme === choice ? T.invertBg : 'transparent',
                    borderRightWidth: i < 2 ? StyleSheet.hairlineWidth : 0,
                    borderRightColor: T.cardBorder,
                    opacity: pressed ? 0.7 : 1,
                  })}>
                  <Text style={{
                    fontFamily: Font.displaySemi, fontSize: 13,
                    color: theme === choice ? T.invertText : T.textDim,
                    letterSpacing: -0.1,
                    textTransform: 'capitalize',
                  }}>
                    {choice}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* ── Challenge ────────────────────────────────────────────── */}
          <SectionLabel T={T}>Challenge</SectionLabel>
          <View style={{
            backgroundColor: T.card,
            borderRadius: Radius.xl,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: T.cardBorder,
            overflow: 'hidden',
            marginBottom: 28,
          }}>
            {prefs && (() => {
              const ch = getChallenge(prefs.challenge as never);
              const startDate = prefs.challengeStartDate;
              const today = localDateString();
              const daysPassed = startDate
                ? Math.floor((new Date(today).getTime() - new Date(startDate).getTime()) / 86400000)
                : 0;
              const currentDay = Math.max(1, Math.min(daysPassed + 1, prefs.challengeLength));
              const isComplete = daysPassed >= prefs.challengeLength;
              return (
                <View style={{ padding: 16, gap: 4 }}>
                  <Text style={{
                    fontFamily: Font.displaySemi, fontSize: 15,
                    color: T.text, letterSpacing: -0.2,
                  }}>
                    {ch?.name ?? prefs.challenge}
                  </Text>
                  <Text style={{
                    fontFamily: Font.bodyReg, fontSize: 13,
                    color: isComplete ? '#22C55E' : T.textDim,
                  }}>
                    {isComplete
                      ? `Completed · ${prefs.challengeLength} days`
                      : `Day ${currentDay} of ${prefs.challengeLength}`}
                  </Text>
                </View>
              );
            })()}
            <View style={{
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: T.cardBorder,
            }}>
              <Pressable
                onPress={() => router.push('/change-challenge')}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  gap: 12,
                  opacity: pressed ? 0.6 : 1,
                })}>
                <Text style={{
                  fontFamily: Font.icon, fontSize: 20, lineHeight: 22,
                  color: T.text, includeFontPadding: false,
                }}>
                  swap_horiz
                </Text>
                <Text style={{
                  fontFamily: Font.displaySemi, fontSize: 15,
                  color: T.text, letterSpacing: -0.2, flex: 1,
                }}>
                  Change challenge
                </Text>
                <Text style={{
                  fontFamily: Font.icon, fontSize: 18, lineHeight: 20,
                  color: T.textDim, includeFontPadding: false,
                }}>
                  chevron_right
                </Text>
              </Pressable>
            </View>
          </View>

          {/* ── Account ───────────────────────────────────────────────── */}
          <SectionLabel T={T}>Account</SectionLabel>
          <View style={{
            backgroundColor: T.card,
            borderRadius: Radius.xl,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: T.cardBorder,
            overflow: 'hidden',
          }}>
            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 16,
                gap: 12,
                opacity: pressed ? 0.6 : 1,
              })}>
              <Text style={{
                fontFamily: Font.icon, fontSize: 20, lineHeight: 22,
                color: '#EF4444', includeFontPadding: false,
              }}>
                logout
              </Text>
              <Text style={{
                fontFamily: Font.displaySemi, fontSize: 15,
                color: '#EF4444', letterSpacing: -0.2,
              }}>
                Sign out
              </Text>
            </Pressable>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
