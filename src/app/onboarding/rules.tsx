import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
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
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingFrame } from '@/components/onboarding-frame';
import { Colors, Font, Radius, type Theme } from '@/constants/theme';
import { getChallenge, type ChallengeTask } from '@/constants/challenges';
import { useOnboarding } from '@/lib/onboarding-store';

function RuleRow({
  index,
  task,
  isLast,
  T,
}: { index: number; task: ChallengeTask; isLast: boolean; T: Theme }) {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      gap: 14,
      borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
      borderBottomColor: T.hairline,
    }}>
      <View style={{
        width: 42, height: 42, borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth, borderColor: T.cardBorder,
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Text style={{
          fontFamily: Font.icon,
          fontSize: 22,
          color: T.text,
          lineHeight: 24,
        }}>
          {task.icon}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontFamily: Font.displaySemi,
          fontSize: 15,
          color: T.text,
          letterSpacing: -0.2,
        }}>
          {task.label}
        </Text>
        <Text style={{
          fontFamily: Font.bodyReg,
          fontSize: 12.5,
          color: T.textDim,
          marginTop: 2,
          letterSpacing: -0.05,
        }}>
          {task.meta}
        </Text>
      </View>
      <Text style={{
        fontFamily: Font.bodyMed,
        fontSize: 10,
        letterSpacing: 1.2,
        color: T.textSubtle,
      }}>
        {String(index + 1).padStart(2, '0')}
      </Text>
    </View>
  );
}

export default function RulesScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const { state, update } = useOnboarding();
  const challenge = getChallenge(state.challenge);

  const HABIT_ICONS = [
    'fitness_center', 'directions_run', 'directions_bike', 'pool', 'hiking',
    'self_improvement', 'favorite', 'spa', 'air', 'bedtime',
    'sunny', 'water_drop', 'restaurant', 'no_drinks', 'local_cafe',
    'book', 'school', 'psychology', 'music_note', 'star',
    'emoji_events', 'bolt', 'timer', 'camera_alt', 'smoke_free',
    'savings', 'brush', 'eco', 'thermostat', 'task_alt',
  ];

  const habitLabel = (raw: string) => { const s = raw.indexOf('::'); return s !== -1 ? raw.slice(s + 2) : raw; };
  const habitIcon  = (raw: string) => { const s = raw.indexOf('::'); return s !== -1 ? raw.slice(0, s) : 'task_alt'; };

  const [sheetOpen, setSheetOpen] = useState(false);
  const [habitInput, setHabitInput] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(HABIT_ICONS[0]);

  const sheetTranslateY = useSharedValue(500);
  const backdropOpacity = useSharedValue(0);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const openSheet = useCallback(() => {
    setSheetOpen(true);
    setSelectedIcon(HABIT_ICONS[0]);
    sheetTranslateY.value = withTiming(0, { duration: 300 });
    backdropOpacity.value = withTiming(1, { duration: 250 });
  }, [sheetTranslateY, backdropOpacity]);

  const closeSheet = useCallback(() => {
    sheetTranslateY.value = withTiming(500, { duration: 260 });
    backdropOpacity.value = withTiming(0, { duration: 220 });
    setTimeout(() => {
      setSheetOpen(false);
      setHabitInput('');
    }, 270);
  }, [sheetTranslateY, backdropOpacity]);

  const addHabit = useCallback(() => {
    const text = habitInput.trim();
    if (!text) return;
    const encoded = `${selectedIcon}::${text}`;
    if (!state.customHabits.some(h => habitLabel(h) === text)) {
      update('customHabits', [...state.customHabits, encoded]);
    }
    closeSheet();
  }, [habitInput, selectedIcon, state.customHabits, update, closeSheet]);

  const removeHabit = useCallback((raw: string) => {
    update('customHabits', state.customHabits.filter(h => h !== raw));
  }, [state.customHabits, update]);

  if (!challenge) {
    return (
      <OnboardingFrame step={7} onContinue={() => router.replace('/onboarding/challenge')}>
        <Text style={{ color: T.text, fontFamily: Font.bodyMed }}>
          No challenge selected. Go back.
        </Text>
      </OnboardingFrame>
    );
  }

  const isCustom = challenge.id === 'custom';

  return (
    <>
      <OnboardingFrame
        step={7}
        onContinue={() => router.push('/onboarding/customize')}>
        <View style={{ flex: 1 }}>
          <Animated.View entering={FadeIn.duration(400)}>
            <Text style={{
              fontFamily: Font.bodyMed,
              fontSize: 11,
              letterSpacing: 2.4,
              color: T.textDim,
              marginBottom: 12,
            }}>
              THE RULES
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(440)}>
            <Text style={{
              fontFamily: Font.displayBlack,
              fontSize: 38,
              color: T.text,
              letterSpacing: -1.4,
              lineHeight: 42,
              marginBottom: 6,
            }}>
              {challenge.name}.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).duration(440)}>
            <Text style={{
              fontFamily: Font.bodyReg,
              fontSize: 15,
              color: T.textDim,
              lineHeight: 22,
              marginBottom: 24,
            }}>
              {challenge.description}
            </Text>
          </Animated.View>

          {/* Built-in task list */}
          {!isCustom && (
            <Animated.View
              entering={FadeInDown.delay(280).duration(480)}
              style={{
                backgroundColor: T.card,
                borderRadius: Radius.lg,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: T.cardBorder,
                paddingHorizontal: 16,
                paddingVertical: 6,
              }}>
              {challenge.tasks.map((task, i) => (
                <RuleRow
                  key={task.id}
                  index={i}
                  task={task}
                  isLast={i === challenge.tasks.length - 1}
                  T={T}
                />
              ))}
            </Animated.View>
          )}

          {isCustom && (
            <Animated.View
              entering={FadeInDown.delay(280).duration(480)}
              style={{
                backgroundColor: T.card,
                borderRadius: Radius.lg,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: T.cardBorder,
                padding: 18,
              }}>
              <Text style={{
                fontFamily: Font.displaySemi,
                fontSize: 15,
                color: T.text,
                marginBottom: 8,
              }}>
                You&apos;ll define your own rules next.
              </Text>
              <Text style={{
                fontFamily: Font.bodyReg,
                fontSize: 13,
                color: T.textDim,
                lineHeight: 20,
              }}>
                Pick your duration and add the daily habits you want to commit to.
              </Text>
            </Animated.View>
          )}

          {/* Custom habits as rule rows */}
          <Animated.View entering={FadeInDown.delay(380).duration(440)} style={{ marginTop: 20 }}>
            <Text style={{
              fontFamily: Font.bodyMed,
              fontSize: 11,
              letterSpacing: 2,
              color: T.textDim,
              marginBottom: 12,
            }}>
              {isCustom ? 'YOUR DAILY HABITS' : 'ADD YOUR OWN'}
            </Text>

            <View style={{
              backgroundColor: T.card,
              borderRadius: Radius.lg,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: T.cardBorder,
              paddingHorizontal: 16,
              paddingVertical: 6,
            }}>
              {state.customHabits.map((h) => (
                <Animated.View
                  key={h}
                  entering={FadeInDown.duration(260)}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    gap: 14,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: T.hairline,
                  }}>
                    <View style={{
                      width: 42, height: 42, borderRadius: 12,
                      borderWidth: StyleSheet.hairlineWidth, borderColor: T.cardBorder,
                      justifyContent: 'center', alignItems: 'center',
                    }}>
                      <Text style={{
                        fontFamily: Font.icon,
                        fontSize: 20,
                        color: T.text,
                        lineHeight: 22,
                      }}>
                        {habitIcon(h)}
                      </Text>
                    </View>
                    <Text style={{
                      flex: 1,
                      fontFamily: Font.displaySemi,
                      fontSize: 15,
                      color: T.text,
                      letterSpacing: -0.2,
                    }}>
                      {habitLabel(h)}
                    </Text>
                    <Pressable onPress={() => removeHabit(h)} hitSlop={12}>
                      <Text style={{
                        fontFamily: Font.icon,
                        fontSize: 18,
                        color: T.textSubtle,
                        lineHeight: 20,
                        includeFontPadding: false,
                      }}>
                        close
                      </Text>
                    </Pressable>
                  </View>
                </Animated.View>
              ))}

              {/* Add row */}
              <Pressable
                onPress={openSheet}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  gap: 14,
                }}>
                  <View style={{
                    width: 42, height: 42, borderRadius: 12,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: T.textSubtle,
                    borderStyle: 'dashed',
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    <Text style={{
                      fontFamily: Font.icon,
                      fontSize: 20,
                      color: T.textDim,
                      lineHeight: 22,
                    }}>
                      add
                    </Text>
                  </View>
                  <Text style={{
                    fontFamily: Font.bodySemi,
                    fontSize: 15,
                    color: T.textDim,
                    letterSpacing: -0.1,
                  }}>
                    Add habit
                  </Text>
                </View>
              </Pressable>
            </View>
          </Animated.View>

          {/* Footer note */}
          <Animated.View entering={FadeInDown.delay(480).duration(440)} style={{ marginTop: 24 }}>
            <Text style={{
              fontFamily: Font.bodyReg,
              fontSize: 13,
              color: T.textSubtle,
              letterSpacing: -0.05,
              textAlign: 'center',
            }}>
              No skipping. No shortcuts.{'\n'}Miss a day and you start over.
            </Text>
          </Animated.View>
        </View>
      </OnboardingFrame>

      {/* Bottom sheet */}
      <Modal visible={sheetOpen} transparent animationType='none' onRequestClose={closeSheet}>
        <View style={{ flex: 1 }}>
          <Animated.View
            style={[StyleSheet.absoluteFillObject, backdropStyle, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            pointerEvents='none'
          />
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeSheet} />

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
                  paddingHorizontal: 20,
                  paddingTop: 12,
                  paddingBottom: 16,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderColor: T.cardBorder,
                }}
              >
                {/* Handle */}
                <View style={{
                  width: 36, height: 4, borderRadius: 2,
                  backgroundColor: T.cardBorder,
                  alignSelf: 'center', marginBottom: 16,
                }} />

                {/* Header row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <Text style={{
                    fontFamily: Font.displayBold,
                    fontSize: 20,
                    color: T.text,
                    letterSpacing: -0.5,
                  }}>
                    Add a habit
                  </Text>
                  <Pressable
                    onPress={closeSheet}
                    hitSlop={12}
                    style={({ pressed }) => ({
                      width: 32, height: 32, borderRadius: 16,
                      backgroundColor: T.hairline,
                      justifyContent: 'center', alignItems: 'center',
                      opacity: pressed ? 0.5 : 1,
                    })}>
                    <Text style={{
                      fontFamily: Font.icon, fontSize: 16,
                      color: T.textDim, lineHeight: 18,
                      includeFontPadding: false,
                    }}>
                      close
                    </Text>
                  </Pressable>
                </View>

                {/* Icon picker */}
                <Text style={{
                  fontFamily: Font.bodyMed, fontSize: 11,
                  letterSpacing: 1.8, color: T.textSubtle,
                  marginBottom: 10,
                }}>
                  CHOOSE AN ICON
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
                  style={{ marginBottom: 16 }}
                >
                  {HABIT_ICONS.map(icon => {
                    const active = selectedIcon === icon;
                    return (
                      <Pressable
                        key={icon}
                        onPress={() => setSelectedIcon(icon)}
                        style={({ pressed }) => ({
                          width: 48, height: 48, borderRadius: 14,
                          backgroundColor: active ? T.invertBg : T.card,
                          borderWidth: StyleSheet.hairlineWidth,
                          borderColor: active ? 'transparent' : T.cardBorder,
                          justifyContent: 'center', alignItems: 'center',
                          opacity: pressed ? 0.6 : 1,
                        })}>
                        <Text style={{
                          fontFamily: Font.icon, fontSize: 22,
                          color: active ? T.invertText : T.textDim,
                          lineHeight: 24, includeFontPadding: false,
                        }}>
                          {icon}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Name input */}
                <Text style={{
                  fontFamily: Font.bodyMed, fontSize: 11,
                  letterSpacing: 1.8, color: T.textSubtle,
                  marginBottom: 10,
                }}>
                  HABIT NAME
                </Text>
                <TextInput
                  autoFocus
                  value={habitInput}
                  onChangeText={setHabitInput}
                  onSubmitEditing={addHabit}
                  returnKeyType='done'
                  placeholder='e.g. Cold shower'
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
                    opacity: !habitInput.trim() ? 0.3 : pressed ? 0.7 : 1,
                  })}>
                  <Text style={{
                    fontFamily: Font.displaySemi,
                    fontSize: 16,
                    color: T.invertText,
                    letterSpacing: -0.2,
                  }}>
                    Add habit
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
