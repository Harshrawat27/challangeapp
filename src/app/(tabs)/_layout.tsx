import { useState } from 'react';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { router } from 'expo-router';
import { Alert, Pressable, Text, View, useColorScheme } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Font, type Theme } from '@/constants/theme';

// ─── Actions ────────────────────────────────────────────────────────────────
// index 0 = closest to FAB, index 1 = furthest

const ACTIONS = [
  { key: 'picture', label: 'Take Picture', icon: 'photo_camera' },
  { key: 'scan',    label: 'Scan Meal',    icon: 'document_scanner' },
] as const;

const ITEM_H = 66; // visual height of each action row including gap

// ─── Speed dial item ─────────────────────────────────────────────────────────

function SpeedDialItem({
  label, icon, index, progress, onPress, T, isDark,
}: {
  label: string;
  icon: string;
  index: number;
  progress: SharedValue<number>;
  onPress: () => void;
  T: Theme;
  isDark: boolean;
}) {
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [(index + 1) * ITEM_H, 0]) }],
    opacity: interpolate(progress.value, [0, 0.25 + index * 0.1, 1], [0, 0, 1]),
  }));

  return (
    <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }, animStyle]}>
      {/* Label pill */}
      <View style={{
        backgroundColor: T.card,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOpacity: isDark ? 0.25 : 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 4,
      }}>
        <Text style={{ fontFamily: Font.bodyMed, fontSize: 14, color: T.text }}>
          {label}
        </Text>
      </View>
      {/* Icon button */}
      <Pressable onPress={onPress} hitSlop={8}>
        <View style={{
          width: 50,
          height: 50,
          borderRadius: 50,
          backgroundColor: T.card,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 10,
          elevation: 6,
        }}>
          <Text
            selectable={false}
            style={{
              fontFamily: Font.icon,
              fontSize: 22,
              lineHeight: 24,
              color: T.text,
              includeFontPadding: false,
            }}>
            {icon}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── FAB (rotates + → ×) ─────────────────────────────────────────────────────

function SpeedDialFAB({
  progress, onPress, T, isDark,
}: {
  progress: SharedValue<number>;
  onPress: () => void;
  T: Theme;
  isDark: boolean;
}) {
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(progress.value, [0, 1], [0, 45])}deg` }],
  }));

  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <View style={{
        width: 58,
        height: 58,
        borderRadius: 58,
        backgroundColor: T.invertBg,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: isDark ? 0.5 : 0.18,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 14,
        elevation: 10,
      }}>
        <Animated.View style={[{ justifyContent: 'center', alignItems: 'center' }, iconStyle]}>
          <Text
            selectable={false}
            style={{
              fontFamily: Font.icon,
              fontSize: 30,
              lineHeight: 32,
              color: T.invertText,
              includeFontPadding: false,
            }}>
            add
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export default function TabsLayout() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const progress = useSharedValue(0);

  // 49pt = standard iOS tab bar height
  const fabBottom = insets.bottom + 49 + 16;

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
  }));

  const toggle = () => {
    const opening = !isOpen;
    setIsOpen(opening);
    progress.value = withSpring(opening ? 1 : 0, { damping: 28, stiffness: 420, mass: 0.7 });
  };

  const close = () => {
    setIsOpen(false);
    progress.value = withSpring(0, { damping: 28, stiffness: 420, mass: 0.7 });
  };

  return (
    <View style={{ flex: 1 }}>
      <NativeTabs>
        <NativeTabs.Trigger name='index'>
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf='house.fill' md='home' />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name='progress'>
          <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf='chart.bar.fill' md='bar_chart' />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name='gallery'>
          <NativeTabs.Trigger.Label>Photos</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf='photo.stack.fill' md='photo_library' />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name='friends'>
          <NativeTabs.Trigger.Label>Friends</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf='person.2.fill' md='group' />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name='profile'>
          <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf='person.fill' md='person' />
        </NativeTabs.Trigger>
      </NativeTabs>

      {/* Dimmed backdrop — blocks touches to app when speed dial is open */}
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.25)',
        }, backdropStyle]}>
        <Pressable style={{ flex: 1 }} onPress={close} />
      </Animated.View>

      {/* Speed dial — items stack above FAB, furthest-from-FAB rendered first (top) */}
      <View
        pointerEvents='box-none'
        style={{ position: 'absolute', bottom: fabBottom, right: 14, alignItems: 'flex-end' }}>
        {[...ACTIONS].reverse().map((action, reverseIdx) => {
          const originalIdx = ACTIONS.length - 1 - reverseIdx;
          return (
            <SpeedDialItem
              key={action.key}
              label={action.label}
              icon={action.icon}
              index={originalIdx}
              progress={progress}
              onPress={() => {
                close();
                if (action.key === 'picture') {
                  router.push('/camera');
                } else if (action.key === 'scan') {
                  router.push('/scan');
                }
              }}
              T={T}
              isDark={isDark}
            />
          );
        })}
        <SpeedDialFAB progress={progress} onPress={toggle} T={T} isDark={isDark} />
      </View>
    </View>
  );
}
