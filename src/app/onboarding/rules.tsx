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
              {state.customHabits.map((h, i) => (
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
                        star
                      </Text>
                    </View>
                    <Text style={{
                      flex: 1,
                      fontFamily: Font.displaySemi,
                      fontSize: 15,
                      color: T.text,
                      letterSpacing: -0.2,
                    }}>
                      {h}
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
            style={[StyleSheet.absoluteFillObject, backdropStyle, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
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
                  paddingHorizontal: 24,
                  paddingTop: 12,
                  paddingBottom: 12,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderColor: T.cardBorder,
                }}
              >
                <View style={{
                  width: 36, height: 4, borderRadius: 2,
                  backgroundColor: T.cardBorder,
                  alignSelf: 'center', marginBottom: 20,
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
