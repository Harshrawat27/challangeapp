import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useCachedPreferences, useChangeChallenge } from '@/lib/convex-api';
import { CHALLENGES, getChallenge, type ChallengeId } from '@/constants/challenges';
import { Colors, Font, Radius } from '@/constants/theme';
import { localDateString } from '@/lib/tasks';

const DURATION_OPTIONS = [21, 30, 45, 60, 75, 90];

function computeStatus(prefs: NonNullable<ReturnType<typeof useCachedPreferences>>) {
  const today = localDateString();
  const daysPassed = prefs.challengeStartDate
    ? Math.floor((new Date(today).getTime() - new Date(prefs.challengeStartDate).getTime()) / 86400000)
    : 0;
  const currentDay = Math.max(1, Math.min(daysPassed + 1, prefs.challengeLength));
  const isComplete = daysPassed >= prefs.challengeLength;
  return { currentDay, isComplete, daysPassed };
}

export default function ChangeChallengeScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const prefs = useCachedPreferences();
  const changeChallenge = useChangeChallenge();

  const existingChallenge = prefs ? getChallenge(prefs.challenge as ChallengeId) : null;
  const { currentDay, isComplete, daysPassed } = prefs ? computeStatus(prefs) : { currentDay: 1, isComplete: false, daysPassed: 0 };

  const [selectedId, setSelectedId] = useState<ChallengeId | null>(null);
  const [duration, setDuration] = useState<number>(
    CHALLENGES.find(c => c.id === selectedId)?.defaultDuration ?? 75,
  );
  const [customHabits, setCustomHabits] = useState<string[]>(['', '', '']);
  const [saving, setSaving] = useState(false);

  const selectedChallenge = selectedId ? getChallenge(selectedId) : null;

  const handleSelectChallenge = (id: ChallengeId) => {
    setSelectedId(id);
    const ch = getChallenge(id);
    setDuration(ch?.defaultDuration ?? 75);
    if (id === 'custom') setCustomHabits(['', '', '']);
  };

  const handleStart = () => {
    if (!selectedId) return;

    const isSameChallenge = selectedId === prefs?.challenge;

    const proceed = async () => {
      setSaving(true);
      try {
        const habits = selectedId === 'custom'
          ? customHabits.map(h => h.trim()).filter(Boolean)
          : [];
        await changeChallenge({
          challenge: selectedId,
          challengeLength: duration,
          challengeStartDate: localDateString(),
          customHabits: habits,
        });
        router.replace('/');
      } catch {
        Alert.alert('Error', 'Could not switch challenge. Please try again.');
      } finally {
        setSaving(false);
      }
    };

    if (isSameChallenge) {
      Alert.alert(
        'Same challenge',
        isComplete
          ? `Start ${existingChallenge?.name ?? selectedId} again from Day 1?`
          : `Reset your ${existingChallenge?.name ?? selectedId} progress and start from Day 1?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start fresh', style: 'destructive', onPress: proceed },
        ],
      );
      return;
    }

    if (!isComplete && prefs && daysPassed >= 2) {
      Alert.alert(
        'Switch challenge?',
        `You're on Day ${currentDay} of ${prefs.challengeLength}. Your progress so far will be archived but not deleted.`,
        [
          { text: 'Keep going', style: 'cancel' },
          { text: 'Switch anyway', style: 'destructive', onPress: proceed },
        ],
      );
      return;
    }

    proceed();
  };

  const canStart = !!selectedId && (selectedId !== 'custom' || customHabits.some(h => h.trim()));

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
            Change challenge
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 60 }}>

          {/* ── Current status banner ──────────────────────────────────── */}
          {prefs && (
            <View style={{
              backgroundColor: isComplete ? 'rgba(34,197,94,0.1)' : T.card,
              borderRadius: Radius.xl,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: isComplete ? 'rgba(34,197,94,0.3)' : T.cardBorder,
              padding: 16,
              marginBottom: 28,
              gap: 6,
            }}>
              {isComplete ? (
                <>
                  <Text style={{
                    fontFamily: Font.displayBold, fontSize: 20,
                    color: '#22C55E', letterSpacing: -0.5,
                  }}>
                    Challenge complete!
                  </Text>
                  <Text style={{
                    fontFamily: Font.bodyReg, fontSize: 14,
                    color: T.textDim, lineHeight: 20,
                  }}>
                    You finished {existingChallenge?.name ?? prefs.challenge} — all {prefs.challengeLength} days. Time to start something new.
                  </Text>
                </>
              ) : daysPassed < 2 ? (
                <>
                  <Text style={{
                    fontFamily: Font.displaySemi, fontSize: 16,
                    color: T.text, letterSpacing: -0.3,
                  }}>
                    Just getting started
                  </Text>
                  <Text style={{
                    fontFamily: Font.bodyReg, fontSize: 13.5,
                    color: T.textDim, lineHeight: 20,
                  }}>
                    You're only on Day {currentDay} — still early to switch if it doesn't feel right.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={{
                    fontFamily: Font.displaySemi, fontSize: 16,
                    color: T.text, letterSpacing: -0.3,
                  }}>
                    Day {currentDay} of {prefs.challengeLength} — in progress
                  </Text>
                  <Text style={{
                    fontFamily: Font.bodyReg, fontSize: 13.5,
                    color: T.textDim, lineHeight: 20,
                  }}>
                    Switching will archive your current run. Your logged days are kept — they just fall outside the new window.
                  </Text>
                </>
              )}
            </View>
          )}

          {/* ── Pick a challenge ───────────────────────────────────────── */}
          <Text style={{
            fontFamily: Font.bodyMed, fontSize: 11, letterSpacing: 1.8,
            color: T.textDim, marginBottom: 10, marginLeft: 2,
          }}>
            CHOOSE CHALLENGE
          </Text>
          <View style={{ gap: 10, marginBottom: 28 }}>
            {CHALLENGES.map(ch => {
              const isActive = selectedId === ch.id;
              const isCurrent = prefs?.challenge === ch.id;
              const diffDots = ch.difficulty > 0
                ? '●'.repeat(ch.difficulty) + '○'.repeat(5 - ch.difficulty)
                : null;
              return (
                <Pressable
                  key={ch.id}
                  onPress={() => handleSelectChallenge(ch.id)}
                  style={({ pressed }) => ({
                    backgroundColor: isActive ? T.invertBg : T.card,
                    borderRadius: Radius.xl,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: isActive ? T.invertBg : T.cardBorder,
                    padding: 16,
                    gap: 4,
                    opacity: pressed ? 0.75 : 1,
                  })}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{
                      fontFamily: Font.displayBold, fontSize: 15,
                      color: isActive ? T.invertText : T.text,
                      letterSpacing: -0.3, flex: 1,
                    }}>
                      {ch.name}
                    </Text>
                    {isCurrent && (
                      <View style={{
                        backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : T.background,
                        borderRadius: 6,
                        paddingHorizontal: 7, paddingVertical: 3,
                      }}>
                        <Text style={{
                          fontFamily: Font.bodyMed, fontSize: 10,
                          letterSpacing: 0.8,
                          color: isActive ? T.invertText : T.textDim,
                        }}>
                          CURRENT
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={{
                    fontFamily: Font.bodyReg, fontSize: 13,
                    color: isActive ? 'rgba(255,255,255,0.7)' : T.textDim,
                    lineHeight: 18,
                  }}>
                    {ch.summary}
                  </Text>
                  {diffDots && (
                    <Text style={{
                      fontFamily: Font.bodyMed, fontSize: 10,
                      color: isActive ? 'rgba(255,255,255,0.5)' : T.textSubtle,
                      letterSpacing: 2,
                      marginTop: 2,
                    }}>
                      {diffDots}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* ── Custom habits (only when custom selected) ─────────────── */}
          {selectedId === 'custom' && (
            <>
              <Text style={{
                fontFamily: Font.bodyMed, fontSize: 11, letterSpacing: 1.8,
                color: T.textDim, marginBottom: 10, marginLeft: 2,
              }}>
                YOUR HABITS
              </Text>
              <View style={{
                backgroundColor: T.card,
                borderRadius: Radius.xl,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: T.cardBorder,
                overflow: 'hidden',
                marginBottom: 28,
              }}>
                {customHabits.map((h, i) => (
                  <View key={i} style={{
                    borderBottomWidth: i < customHabits.length - 1 ? StyleSheet.hairlineWidth : 0,
                    borderBottomColor: T.cardBorder,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                  }}>
                    <Text style={{
                      fontFamily: Font.bodyMed, fontSize: 13,
                      color: T.textDim, width: 20,
                    }}>
                      {i + 1}.
                    </Text>
                    <TextInput
                      value={h}
                      onChangeText={text => {
                        const next = [...customHabits];
                        next[i] = text;
                        setCustomHabits(next);
                      }}
                      placeholder={`Habit ${i + 1}`}
                      placeholderTextColor={T.textSubtle}
                      style={{
                        flex: 1,
                        height: 48,
                        fontFamily: Font.bodyMed,
                        fontSize: 14,
                        color: T.text,
                      }}
                    />
                  </View>
                ))}
                <Pressable
                  onPress={() => setCustomHabits(h => [...h, ''])}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    gap: 8,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: T.cardBorder,
                    opacity: pressed ? 0.6 : 1,
                  })}>
                  <Text style={{
                    fontFamily: Font.icon, fontSize: 18, lineHeight: 20,
                    color: T.textDim, includeFontPadding: false,
                  }}>
                    add
                  </Text>
                  <Text style={{
                    fontFamily: Font.bodyMed, fontSize: 14,
                    color: T.textDim,
                  }}>
                    Add habit
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {/* ── Duration ──────────────────────────────────────────────── */}
          {selectedId && (
            <>
              <Text style={{
                fontFamily: Font.bodyMed, fontSize: 11, letterSpacing: 1.8,
                color: T.textDim, marginBottom: 10, marginLeft: 2,
              }}>
                DURATION
              </Text>
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 32,
              }}>
                {DURATION_OPTIONS.map(d => {
                  const sel = duration === d;
                  return (
                    <Pressable
                      key={d}
                      onPress={() => setDuration(d)}
                      style={({ pressed }) => ({
                        paddingHorizontal: 18, paddingVertical: 10,
                        borderRadius: Radius.lg,
                        backgroundColor: sel ? T.invertBg : T.card,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: sel ? T.invertBg : T.cardBorder,
                        opacity: pressed ? 0.7 : 1,
                      })}>
                      <Text style={{
                        fontFamily: Font.displaySemi, fontSize: 14,
                        color: sel ? T.invertText : T.text,
                        letterSpacing: -0.2,
                      }}>
                        {d} days
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {/* ── CTA ───────────────────────────────────────────────────── */}
          <Pressable
            onPress={handleStart}
            disabled={!canStart || saving}
            style={({ pressed }) => ({
              backgroundColor: canStart ? T.invertBg : T.card,
              borderRadius: Radius.xl,
              paddingVertical: 16,
              alignItems: 'center',
              opacity: (!canStart || pressed || saving) ? 0.5 : 1,
            })}>
            <Text style={{
              fontFamily: Font.displayBold, fontSize: 16,
              color: canStart ? T.invertText : T.textDim,
              letterSpacing: -0.3,
            }}>
              {saving ? 'Switching…' : 'Start challenge'}
            </Text>
          </Pressable>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
