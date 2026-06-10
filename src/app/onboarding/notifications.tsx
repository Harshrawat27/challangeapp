import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { OnboardingFrame } from '@/components/onboarding-frame';
import { Colors, Font, Radius, type Theme } from '@/constants/theme';

type Reminder = { id: string; icon: string; label: string; time: string };

const REMINDERS: Reminder[] = [
  { id: 'morning',   icon: 'wb_sunny',      label: 'Morning workout',   time: '07:00' },
  { id: 'water',     icon: 'water_drop',    label: 'Drink water',       time: '11:00' },
  { id: 'evening',   icon: 'bedtime',       label: 'Evening reflection', time: '21:00' },
];

function ReminderRow({
  reminder, enabled, onToggle, T,
}: { reminder: Reminder; enabled: boolean; onToggle: () => void; T: Theme }) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: T.card,
        borderRadius: Radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: T.cardBorder,
        padding: 14,
        gap: 14,
        opacity: pressed ? 0.85 : 1,
      })}>
      <View style={{
        width: 42, height: 42, borderRadius: 12,
        backgroundColor: T.hairline,
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Text style={{ fontFamily: Font.icon, fontSize: 22, color: T.text, lineHeight: 24 }}>
          {reminder.icon}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{
          fontFamily: Font.displaySemi,
          fontSize: 15,
          color: T.text,
          letterSpacing: -0.2,
        }}>
          {reminder.label}
        </Text>
        <Text style={{
          fontFamily: Font.bodyReg,
          fontSize: 12.5,
          color: T.textDim,
          marginTop: 2,
          letterSpacing: -0.05,
        }}>
          Daily at {reminder.time}
        </Text>
      </View>

      {/* Toggle */}
      <View style={{
        width: 44, height: 26, borderRadius: 26,
        backgroundColor: enabled ? T.invertBg : T.hairline,
        padding: 2,
        justifyContent: 'center',
      }}>
        <View style={{
          width: 22, height: 22, borderRadius: 22,
          backgroundColor: enabled ? T.invertText : T.card,
          marginLeft: enabled ? 18 : 0,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowOffset: { width: 0, height: 1 },
          shadowRadius: 2,
        }} />
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    morning: true,
    water: true,
    evening: true,
  });

  const toggle = (id: string) => {
    setEnabled(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <OnboardingFrame
      step={13}
      onContinue={() => router.push('/onboarding/account')}>
      <View style={{ flex: 1 }}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={{
            fontFamily: Font.bodyMed, fontSize: 11, letterSpacing: 2.4, color: T.textDim,
            marginBottom: 12,
          }}>
            STEP 12 — STAY ON TRACK
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(440)}>
          <Text style={{
            fontFamily: Font.displayBlack, fontSize: 36, color: T.text,
            letterSpacing: -1.2, lineHeight: 40, marginBottom: 8,
          }}>
            We&apos;ll nudge you.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(440)}>
          <Text style={{
            fontFamily: Font.bodyReg, fontSize: 14, color: T.textDim, lineHeight: 20,
            marginBottom: 24,
          }}>
            Three small reminders. You can change the times later.
          </Text>
        </Animated.View>

        <View style={{ gap: 10 }}>
          {REMINDERS.map((r, i) => (
            <Animated.View
              key={r.id}
              entering={FadeInDown.delay(240 + i * 80).duration(420)}>
              <ReminderRow
                reminder={r}
                enabled={enabled[r.id]}
                onToggle={() => toggle(r.id)}
                T={T}
              />
            </Animated.View>
          ))}
        </View>
      </View>
    </OnboardingFrame>
  );
}
