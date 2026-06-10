import { Tabs } from 'expo-router';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Colors, Font, Radius, type Theme } from '@/constants/theme';

// Subset of React Navigation's BottomTabBarProps we actually use. Typing the
// full thing requires reaching into expo-router internals — not worth it.
type Route = { name: string; key: string; params?: object };
type Nav = {
  emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
  navigate: (name: string, params?: object) => void;
};

// ─── Per-route metadata ─────────────────────────────────────────────────────

const ROUTE_ICON: Record<string, string> = {
  index: 'home',
  progress: 'bar_chart',
  friends: 'groups',
  profile: 'person',
};

const ROUTE_LABEL: Record<string, string> = {
  index: 'Home',
  progress: 'Progress',
  friends: 'Friends',
  profile: 'Profile',
};

// ─── Tab item ───────────────────────────────────────────────────────────────

function TabItem({
  routeName,
  focused,
  onPress,
  T,
  isDark,
}: {
  routeName: string;
  focused: boolean;
  onPress: () => void;
  T: Theme;
  isDark: boolean;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const icon = ROUTE_ICON[routeName] ?? 'circle';
  const label = ROUTE_LABEL[routeName] ?? routeName;
  const activeBg = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)';

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.94, { damping: 14, stiffness: 220 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 14, stiffness: 220 }); }}
      onPress={onPress}
      style={{ flex: 1 }}>
      <Animated.View
        style={[
          {
            paddingVertical: 8,
            borderRadius: Radius.pill,
            backgroundColor: focused ? activeBg : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          },
          animStyle,
        ]}>
        <Text
          selectable={false}
          style={{
            fontFamily: Font.icon,
            fontSize: 22,
            lineHeight: 24,
            color: focused ? T.text : T.textDim,
            includeFontPadding: false,
          }}>
          {icon}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: focused ? Font.displaySemi : Font.bodyMed,
            fontSize: 10.5,
            color: focused ? T.text : T.textDim,
            letterSpacing: 0.1,
          }}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── Custom Tab Bar ─────────────────────────────────────────────────────────

function CustomTabBar({ state, navigation }: { state: { routes: ReadonlyArray<Route>; index: number }; navigation: Nav }) {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();

  const handlePressAdd = () => {
    Alert.alert(
      'Quick add',
      'Daily progress photo, quick log, and reflection note will live here.',
      [{ text: 'OK' }],
    );
  };

  return (
    <View
      pointerEvents='box-none'
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: Math.max(insets.bottom, 12),
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}>
      {/* Pill — 4 tabs */}
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          backgroundColor: T.card,
          borderRadius: Radius.pill,
          paddingHorizontal: 6,
          paddingVertical: 6,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: T.cardBorder,
          shadowColor: '#000',
          shadowOpacity: isDark ? 0.4 : 0.08,
          shadowOffset: { width: 0, height: 6 },
          shadowRadius: 18,
          elevation: 8,
        }}>
        {state.routes.map((route, idx) => {
          const focused = state.index === idx;
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };
          return (
            <TabItem
              key={route.key}
              routeName={route.name}
              focused={focused}
              onPress={onPress}
              T={T}
              isDark={isDark}
            />
          );
        })}
      </View>

      {/* + FAB */}
      <PlusButton onPress={handlePressAdd} T={T} isDark={isDark} />
    </View>
  );
}

function PlusButton({ onPress, T, isDark }: { onPress: () => void; T: Theme; isDark: boolean }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.9, { damping: 12, stiffness: 240 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 240 }); }}
      onPress={onPress}>
      <Animated.View
        style={[
          {
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
          },
          animStyle,
        ]}>
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
    </Pressable>
  );
}

// ─── Layout ─────────────────────────────────────────────────────────────────

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar state={props.state as never} navigation={props.navigation as never} />}
      screenOptions={{ headerShown: false }}>
      {/* Order matters — declares left-to-right tab order */}
      <Tabs.Screen name='index'    options={{ title: 'Home' }} />
      <Tabs.Screen name='progress' options={{ title: 'Progress' }} />
      <Tabs.Screen name='friends'  options={{ title: 'Friends' }} />
      <Tabs.Screen name='profile'  options={{ title: 'Profile' }} />
    </Tabs>
  );
}
