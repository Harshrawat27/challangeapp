import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
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

// Request OS permission. Returns true if granted.
async function requestNotificationPermission(): Promise<boolean> {
  // On Android 12 and below, permission is auto-granted.
  if (Platform.OS === 'android' && (Platform.Version as number) < 33) return true;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  // undetermined = first time asking (Apple shows the system dialog).
  // denied = user already said no — dialog won't show, send to Settings.
  if (existing === 'denied') {
    Alert.alert(
      'Notifications blocked',
      'You\'ve previously declined notifications. To receive reminders, enable them in Settings.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ],
    );
    return false;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export default function NotificationsScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    morning: true,
    water: true,
    evening: true,
  });

  // Track whether we've already triggered the OS permission request this session.
  const permissionRequested = useRef(false);

  // All toggles start ON — ask for permission on mount so the system dialog
  // appears as soon as the user sees this screen (they've implicitly said "yes"
  // by reaching this step with reminders pre-enabled).
  useEffect(() => {
    if (permissionRequested.current) return;
    permissionRequested.current = true;
    requestNotificationPermission();
  }, []);

  const toggle = (id: string) => {
    const willBeEnabled = !enabled[id];
    setEnabled(prev => ({ ...prev, [id]: willBeEnabled }));

    // If user is turning a reminder ON and we haven't asked yet, ask now.
    if (willBeEnabled && !permissionRequested.current) {
      permissionRequested.current = true;
      requestNotificationPermission();
    }
  };

  return (
    <OnboardingFrame
      step={13}
      onContinue={() => router.push('/onboarding/username')}>
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
