import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { useAddCustomHabit, useCachedPreferences } from '@/lib/convex-api';
import { encodeCustomHabit, localDateString, parseCustomHabit } from '@/lib/tasks';
import { Colors, Font, Radius } from '@/constants/theme';

const HABIT_ICONS = [
  'fitness_center', 'directions_run', 'directions_bike', 'pool', 'hiking',
  'self_improvement', 'favorite', 'spa', 'air', 'bedtime',
  'sunny', 'water_drop', 'restaurant', 'no_drinks', 'local_cafe',
  'book', 'school', 'psychology', 'music_note', 'star',
  'emoji_events', 'bolt', 'timer', 'camera_alt', 'smoke_free',
  'savings', 'brush', 'eco', 'thermostat', 'task_alt',
];

function Icon({ name, size, color }: { name: string; size: number; color: string }) {
  return (
    <Text
      selectable={false}
      style={{
        fontFamily: Font.icon,
        fontSize: size,
        lineHeight: size + 2,
        color,
        includeFontPadding: false,
      }}>
      {name}
    </Text>
  );
}

export default function AddHabitScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const prefs = useCachedPreferences();
  const addCustomHabit = useAddCustomHabit();

  const [habitInput, setHabitInput] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(HABIT_ICONS[0]);
  const [selectedCount, setSelectedCount] = useState(1);
  const [saving, setSaving] = useState(false);

  const isDuplicate = (prefs?.customHabits ?? []).some(h => {
    const parsed = parseCustomHabit(h);
    return !parsed.endDate && parsed.label.toLowerCase() === habitInput.trim().toLowerCase();
  });

  const canSave = habitInput.trim().length > 0 && !isDuplicate && !saving;

  const save = useCallback(async () => {
    const text = habitInput.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      const startDate = localDateString();
      const encoded = encodeCustomHabit(startDate, '', selectedCount, selectedIcon, text);
      await addCustomHabit({ encoded });
      router.replace('/');
    } catch {
      setSaving(false);
    }
  }, [habitInput, selectedIcon, selectedCount, addCustomHabit, saving]);

  return (
    <View style={{ flex: 1, backgroundColor: T.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          {/* Header */}
          <Animated.View
            entering={FadeIn.duration(300)}
            style={{
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
              <Icon name="arrow_back" size={18} color={T.text} />
            </Pressable>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={{
                fontFamily: Font.displayBlack,
                fontSize: 26,
                color: T.text,
                letterSpacing: -1,
                lineHeight: 30,
              }}>
                Add a habit
              </Text>
            </View>
          </Animated.View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>

            {/* Icon picker */}
            <Animated.View entering={FadeInDown.delay(60).duration(380)}>
              <Text style={{
                fontFamily: Font.bodyMed, fontSize: 11,
                letterSpacing: 1.8, color: T.textSubtle,
                marginBottom: 12, marginTop: 8,
              }}>
                CHOOSE AN ICON
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {HABIT_ICONS.map(icon => {
                  const active = selectedIcon === icon;
                  return (
                    <Pressable
                      key={icon}
                      onPress={() => setSelectedIcon(icon)}
                      style={({ pressed }) => ({
                        width: 52, height: 52, borderRadius: 14,
                        backgroundColor: active ? T.invertBg : T.card,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: active ? 'transparent' : T.cardBorder,
                        justifyContent: 'center', alignItems: 'center',
                        opacity: pressed ? 0.6 : 1,
                      })}>
                      <Icon
                        name={icon}
                        size={24}
                        color={active ? T.invertText : T.textDim}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>

            {/* Habit name */}
            <Animated.View entering={FadeInDown.delay(120).duration(380)} style={{ marginTop: 28 }}>
              <Text style={{
                fontFamily: Font.bodyMed, fontSize: 11,
                letterSpacing: 1.8, color: T.textSubtle,
                marginBottom: 12,
              }}>
                HABIT NAME
              </Text>
              <TextInput
                autoFocus
                value={habitInput}
                onChangeText={setHabitInput}
                onSubmitEditing={save}
                returnKeyType="done"
                placeholder="e.g. Cold shower"
                placeholderTextColor={T.textSubtle}
                style={{
                  backgroundColor: T.card,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: isDuplicate ? '#EF4444' : T.cardBorder,
                  borderRadius: Radius.md,
                  height: 52,
                  paddingHorizontal: 16,
                  fontFamily: Font.bodyMed,
                  fontSize: 16,
                  color: T.text,
                  letterSpacing: -0.1,
                }}
              />
              {isDuplicate && (
                <Text style={{
                  fontFamily: Font.bodyReg, fontSize: 12,
                  color: '#EF4444', marginTop: 6, marginLeft: 4,
                }}>
                  You already have a habit with this name.
                </Text>
              )}
            </Animated.View>

            {/* Times per day */}
            <Animated.View entering={FadeInDown.delay(180).duration(380)} style={{ marginTop: 28 }}>
              <Text style={{
                fontFamily: Font.bodyMed, fontSize: 11,
                letterSpacing: 1.8, color: T.textSubtle,
                marginBottom: 12,
              }}>
                TIMES PER DAY
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[1, 2, 3, 4, 5].map(n => {
                  const active = selectedCount === n;
                  return (
                    <Pressable
                      key={n}
                      onPress={() => setSelectedCount(n)}
                      style={({ pressed }) => ({
                        flex: 1,
                        height: 52,
                        borderRadius: Radius.md,
                        backgroundColor: active ? T.invertBg : T.card,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: active ? 'transparent' : T.cardBorder,
                        justifyContent: 'center', alignItems: 'center',
                        opacity: pressed ? 0.6 : 1,
                      })}>
                      <Text style={{
                        fontFamily: Font.displayBlack,
                        fontSize: 20,
                        color: active ? T.invertText : T.textDim,
                        letterSpacing: -0.5,
                      }}>
                        {n}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={{
                fontFamily: Font.bodyReg, fontSize: 12,
                color: T.textSubtle, marginTop: 8, marginLeft: 2,
              }}>
                {selectedCount === 1
                  ? 'Tap once to complete — simple checkbox.'
                  : `Tap ${selectedCount} times to complete this habit.`}
              </Text>
            </Animated.View>

          </ScrollView>

          {/* Save button */}
          <Animated.View
            entering={FadeInDown.delay(240).duration(380)}
            style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
            <Pressable
              onPress={save}
              disabled={!canSave}
              style={({ pressed }) => ({
                backgroundColor: T.invertBg,
                height: 54,
                borderRadius: Radius.pill,
                justifyContent: 'center',
                alignItems: 'center',
                opacity: !canSave ? 0.35 : pressed ? 0.75 : 1,
              })}>
              <Text style={{
                fontFamily: Font.displaySemi,
                fontSize: 17,
                color: T.invertText,
                letterSpacing: -0.3,
              }}>
                {saving ? 'Saving…' : 'Add habit'}
              </Text>
            </Pressable>
          </Animated.View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
