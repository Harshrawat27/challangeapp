import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingFrame } from '@/components/onboarding-frame';
import { Colors, Font, Radius, type Theme } from '@/constants/theme';
import { useOnboarding } from '@/lib/onboarding-store';
import { CHALLENGES, getChallenge, type Challenge } from '@/constants/challenges';

function DifficultyDots({ level, T }: { level: number; T: Theme }) {
  if (level === 0) {
    return (
      <Text style={{
        fontFamily: Font.bodyMed,
        fontSize: 10,
        letterSpacing: 1.4,
        color: T.textSubtle,
      }}>
        VARIES
      </Text>
    );
  }
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: 5,
            backgroundColor: i < level ? T.text : T.hairline,
          }}
        />
      ))}
    </View>
  );
}

function ChallengeCard({
  challenge,
  selected,
  onPress,
  T,
  isDark,
}: {
  challenge: Challenge;
  selected: boolean;
  onPress: () => void;
  T: Theme;
  isDark: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: selected ? T.invertBg : T.card,
        borderRadius: Radius.lg,
        borderWidth: selected ? 0 : StyleSheet.hairlineWidth,
        borderColor: T.cardBorder,
        padding: 18,
        gap: 6,
        opacity: pressed ? 0.78 : 1,
      })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{
          fontFamily: Font.displayBold,
          fontSize: 20,
          color: selected ? T.invertText : T.text,
          letterSpacing: -0.5,
        }}>
          {challenge.name}
        </Text>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: selected ? (isDark ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)') : T.hairline,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: Radius.pill,
        }}>
          <Text style={{
            fontFamily: Font.bodyMed,
            fontSize: 11,
            letterSpacing: 0.3,
            color: selected ? T.invertText : T.textDim,
          }}>
            {challenge.defaultDuration} DAYS
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <DifficultyDots
          level={challenge.difficulty}
          T={selected ? {
            ...T,
            text: T.invertText,
            hairline: isDark ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.18)',
            textSubtle: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)',
          } : T}
        />
        <Text style={{
          fontFamily: Font.bodyReg,
          fontSize: 13,
          color: selected ? (isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.65)') : T.textDim,
          letterSpacing: -0.05,
        }}>
          {challenge.summary}
        </Text>
      </View>
    </Pressable>
  );
}

export default function ChallengeScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const { state, update } = useOnboarding();
  const selected = state.challenge;
  const challenge = getChallenge(selected);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [habitInput, setHabitInput] = useState('');

  const sheetTranslateY = useSharedValue(400);
  const backdropOpacity = useSharedValue(0);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const openSheet = useCallback(() => {
    setSheetOpen(true);
    sheetTranslateY.value = withSpring(0, { damping: 20, stiffness: 200 });
    backdropOpacity.value = withTiming(1, { duration: 180 });
  }, [sheetTranslateY, backdropOpacity]);

  const closeSheet = useCallback(() => {
    sheetTranslateY.value = withTiming(400, { duration: 220 });
    backdropOpacity.value = withTiming(0, { duration: 200 });
    setTimeout(() => {
      setSheetOpen(false);
      setHabitInput('');
    }, 230);
  }, [sheetTranslateY, backdropOpacity]);

  const addHabit = useCallback(() => {
    const text = habitInput.trim();
    if (!text) return;
    if (!state.customHabits.includes(text)) {
      update('customHabits', [...state.customHabits, text]);
    }
    closeSheet();
  }, [habitInput, state.customHabits, update, closeSheet]);

  const removeHabit = useCallback((text: string) => {
    update('customHabits', state.customHabits.filter(h => h !== text));
  }, [state.customHabits, update]);

  const handleSelect = (id: typeof CHALLENGES[number]['id']) => {
    update('challenge', id);
    const c = CHALLENGES.find(x => x.id === id);
    if (c) update('challengeLength', c.defaultDuration);
  };

  const handleContinue = () => {
    if (selected) router.push('/onboarding/rules');
  };

  return (
    <>
      <OnboardingFrame
        step={6}
        onContinue={handleContinue}
        continueDisabled={!selected}>
        <View style={{ flex: 1 }}>
          <Animated.View entering={FadeIn.duration(400)}>
            <Text style={{
              fontFamily: Font.bodyMed,
              fontSize: 11,
              letterSpacing: 2.4,
              color: T.textDim,
              marginBottom: 12,
            }}>
              YOUR CHALLENGE
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(440)}>
            <Text style={{
              fontFamily: Font.displayBlack,
              fontSize: 36,
              color: T.text,
              letterSpacing: -1.2,
              lineHeight: 40,
              marginBottom: 8,
            }}>
              Pick your challenge.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(180).duration(440)}>
            <Text style={{
              fontFamily: Font.bodyReg,
              fontSize: 14,
              color: T.textDim,
              lineHeight: 20,
              marginBottom: 24,
            }}>
              Choose your program and add any extra habits you want to commit to daily.
            </Text>
          </Animated.View>

          <View style={{ gap: 12 }}>
            {CHALLENGES.map((c, i) => (
              <Animated.View key={c.id} entering={FadeInDown.delay(260 + i * 80).duration(420)}>
                <ChallengeCard
                  challenge={c}
                  selected={selected === c.id}
                  onPress={() => handleSelect(c.id)}
                  T={T}
                  isDark={isDark}
                />
              </Animated.View>
            ))}
          </View>

          {/* Habits section */}
          {selected && (
            <Animated.View entering={FadeInDown.delay(100).duration(400)} style={{ marginTop: 24 }}>
              <Text style={{
                fontFamily: Font.bodyMed,
                fontSize: 11,
                letterSpacing: 2,
                color: T.textDim,
                marginBottom: 12,
              }}>
                YOUR HABITS
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {/* Built-in challenge tasks */}
                {(challenge?.tasks ?? []).map(task => (
                  <View
                    key={task.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      backgroundColor: T.card,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: T.cardBorder,
                      borderRadius: Radius.pill,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}>
                    <Text style={{
                      fontFamily: Font.icon,
                      fontSize: 14,
                      color: T.textDim,
                      lineHeight: 16,
                      includeFontPadding: false,
                    }}>
                      {task.icon}
                    </Text>
                    <Text style={{
                      fontFamily: Font.bodyMed,
                      fontSize: 13,
                      color: T.text,
                      letterSpacing: -0.1,
                    }}>
                      {task.label}
                    </Text>
                  </View>
                ))}

                {/* Custom habits */}
                {state.customHabits.map(h => (
                  <Animated.View key={h} layout={Layout.springify().damping(18)}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      backgroundColor: T.invertBg,
                      borderRadius: Radius.pill,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}>
                      <Text style={{
                        fontFamily: Font.bodyMed,
                        fontSize: 13,
                        color: T.invertText,
                        letterSpacing: -0.1,
                      }}>
                        {h}
                      </Text>
                      <Pressable onPress={() => removeHabit(h)} hitSlop={8}>
                        <Text style={{
                          fontFamily: Font.icon,
                          fontSize: 14,
                          color: T.invertText,
                          opacity: 0.65,
                          lineHeight: 16,
                          includeFontPadding: false,
                        }}>
                          close
                        </Text>
                      </Pressable>
                    </View>
                  </Animated.View>
                ))}

                {/* Add habit chip */}
                <Pressable
                  onPress={openSheet}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: T.textSubtle,
                    borderStyle: 'dashed',
                    borderRadius: Radius.pill,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    opacity: pressed ? 0.55 : 1,
                  })}>
                  <Text style={{
                    fontFamily: Font.icon,
                    fontSize: 14,
                    color: T.textDim,
                    lineHeight: 16,
                    includeFontPadding: false,
                  }}>
                    add
                  </Text>
                  <Text style={{
                    fontFamily: Font.bodyMed,
                    fontSize: 13,
                    color: T.textDim,
                    letterSpacing: -0.1,
                  }}>
                    Add habit
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          )}
        </View>
      </OnboardingFrame>

      {/* Bottom sheet */}
      <Modal visible={sheetOpen} transparent animationType='none' onRequestClose={closeSheet}>
        <View style={{ flex: 1 }}>
          {/* Backdrop */}
          <Animated.View
            style={[StyleSheet.absoluteFillObject, backdropStyle, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
            pointerEvents='none'
          />
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeSheet} />

          {/* Sheet */}
          <KeyboardAvoidingView
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <Animated.View style={sheetStyle}>
              <SafeAreaView
                edges={['bottom']}
                style={{
                  backgroundColor: T.background,
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  paddingHorizontal: 24,
                  paddingTop: 12,
                  paddingBottom: 12,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderColor: T.cardBorder,
                }}
              >
                {/* Handle */}
                <View style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: T.cardBorder,
                  alignSelf: 'center',
                  marginBottom: 20,
                }} />

                <Text style={{
                  fontFamily: Font.displayBold,
                  fontSize: 22,
                  color: T.text,
                  letterSpacing: -0.6,
                  marginBottom: 16,
                }}>
                  Add a habit
                </Text>

                <TextInput
                  autoFocus
                  value={habitInput}
                  onChangeText={setHabitInput}
                  onSubmitEditing={addHabit}
                  returnKeyType='done'
                  placeholder='e.g. Cold shower in the morning'
                  placeholderTextColor={T.textSubtle}
                  style={{
                    backgroundColor: T.card,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: T.cardBorder,
                    borderRadius: Radius.md,
                    height: 52,
                    paddingHorizontal: 16,
                    fontFamily: Font.bodyMed,
                    fontSize: 15,
                    color: T.text,
                    letterSpacing: -0.1,
                    marginBottom: 16,
                  }}
                />

                <Pressable
                  onPress={addHabit}
                  disabled={!habitInput.trim()}
                  style={({ pressed }) => ({
                    backgroundColor: T.invertBg,
                    height: 52,
                    borderRadius: Radius.pill,
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: !habitInput.trim() ? 0.35 : pressed ? 0.7 : 1,
                  })}>
                  <Text style={{
                    fontFamily: Font.displaySemi,
                    fontSize: 16,
                    color: T.invertText,
                    letterSpacing: -0.2,
                  }}>
                    Add
                  </Text>
                </Pressable>
              </SafeAreaView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}
