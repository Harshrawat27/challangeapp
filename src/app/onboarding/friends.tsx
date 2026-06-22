import { Colors, Font, Radius, type Theme } from '@/constants/theme';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Mock data ───────────────────────────────────────────────────────────────

type MockTask = { id: string; icon: string; done: boolean };

type MockFriend = {
  name: string;
  username: string;
  challenge: string;
  day: string;
  pct: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  avatar: any;
  tasks: MockTask[];
  tilt: number;
};

const FRIENDS: MockFriend[] = [
  {
    name: 'Alex',
    username: '@alexc',
    challenge: '75 Hard',
    day: 'Day 12/75',
    pct: 33,
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    avatar: require('@/assets/app-images/friends/image-21.png'),
    tasks: [
      { id: 'w1', icon: 'fitness_center', done: true },
      { id: 'w2', icon: 'directions_run', done: true },
      { id: 'water', icon: 'water_drop', done: false },
      { id: 'read', icon: 'menu_book', done: false },
      { id: 'diet', icon: 'restaurant', done: false },
      { id: 'photo', icon: 'photo_camera', done: false },
    ],
    tilt: -10,
  },
  {
    name: 'Maya',
    username: '@mayap',
    challenge: 'Monk Mode',
    day: 'Day 7/30',
    pct: 20,
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    avatar: require('@/assets/app-images/friends/image-22.png'),
    tasks: [
      { id: 'dw', icon: 'lightbulb', done: true },
      { id: 'no-social', icon: 'phone_disabled', done: false },
      { id: 'journal', icon: 'edit_note', done: false },
      { id: 'sober', icon: 'no_drinks', done: false },
      { id: 'sleep', icon: 'bedtime', done: false },
    ],
    tilt: 10,
  },
  {
    name: 'Ryan',
    username: '@ryan_t',
    challenge: '75 Soft',
    day: 'Day 19/75',
    pct: 60,
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    avatar: require('@/assets/app-images/friends/image-23.png'),
    tasks: [
      { id: 'move', icon: 'directions_walk', done: true },
      { id: 'water', icon: 'water_drop', done: true },
      { id: 'eat', icon: 'restaurant', done: true },
      { id: 'learn', icon: 'menu_book', done: false },
      { id: 'reflect', icon: 'edit_note', done: false },
    ],
    tilt: -10,
  },
];

// ─── Card ────────────────────────────────────────────────────────────────────

function FriendCard({
  f,
  T,
  isDark,
}: {
  f: MockFriend;
  T: Theme;
  isDark: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: T.card,
        borderRadius: Radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: T.cardBorder,
        padding: 16,
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.42 : 0.11,
        shadowRadius: 18,
        elevation: 10,
      }}
    >
      {/* Top row: avatar + name + day */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: T.invertBg,
            overflow: 'hidden',
          }}
        >
          <Image
            source={f.avatar}
            style={{ width: 50, height: 50 }}
            contentFit='cover'
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: Font.displaySemi,
              fontSize: 16,
              color: T.text,
              letterSpacing: -0.3,
            }}
          >
            {f.name}
          </Text>
          <Text
            style={{
              fontFamily: Font.bodyReg,
              fontSize: 12,
              color: T.textDim,
              marginTop: 2,
              letterSpacing: -0.05,
            }}
          >
            {f.username} · {f.challenge}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Text
            style={{
              fontFamily: Font.displayBold,
              fontSize: 12,
              color: T.textDim,
              letterSpacing: -0.2,
            }}
          >
            {f.day}
          </Text>
          <Text
            style={{
              fontFamily: Font.icon,
              fontSize: 18,
              color: T.textSubtle,
              lineHeight: 20,
              includeFontPadding: false,
            }}
          >
            more_vert
          </Text>
        </View>
      </View>

      {/* TODAY + progress bar */}
      <View style={{ gap: 6 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={{
              fontFamily: Font.bodyMed,
              fontSize: 10,
              letterSpacing: 1.4,
              color: T.textSubtle,
            }}
          >
            TODAY
          </Text>
          <Text
            style={{
              fontFamily: Font.displayBold,
              fontSize: 13,
              letterSpacing: -0.2,
              color: f.pct === 100 ? T.text : T.textDim,
            }}
          >
            {f.pct > 0 ? `${f.pct}%` : '—'}
          </Text>
        </View>
        <View
          style={{ height: 5, borderRadius: 5, backgroundColor: T.hairline }}
        >
          <View
            style={{
              width: `${f.pct}%`,
              height: '100%',
              borderRadius: 5,
              backgroundColor: f.pct === 100 ? T.text : T.textDim,
            }}
          />
        </View>
      </View>

      {/* Task icon pills */}
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {f.tasks.map((task) => (
          <View
            key={task.id}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: task.done ? T.invertBg : 'transparent',
              borderWidth: task.done ? 0 : StyleSheet.hairlineWidth,
              borderColor: T.cardBorder,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: Font.icon,
                fontSize: 17,
                lineHeight: 19,
                color: task.done ? T.invertText : T.textSubtle,
                includeFontPadding: false,
              }}
            >
              {task.icon}
            </Text>
          </View>
        ))}
      </View>

      {/* Tap hint */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text
          style={{
            fontFamily: Font.bodyReg,
            fontSize: 11,
            color: T.textSubtle,
            flex: 1,
          }}
        >
          Tap to see full profile & heatmap
        </Text>
        <Text
          style={{
            fontFamily: Font.icon,
            fontSize: 14,
            color: T.textSubtle,
            lineHeight: 16,
            includeFontPadding: false,
          }}
        >
          chevron_right
        </Text>
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function FriendsOnboardingScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: T.background }}>
      {/* ── Cards section — own block, does NOT bleed into text below ── */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          paddingBottom: 28, // absorbs rotated corner overhang
        }}
      >
        {FRIENDS.map((f, i) => (
          // Outer plain View owns the tilt — unaffected by Reanimated's transform
          <View
            key={f.username}
            style={{
              zIndex: i + 1,
              marginTop: i === 0 ? 0 : -44,
              transform: [{ rotate: `${f.tilt}deg` }],
            }}
          >
            {/* Inner Animated.View only handles opacity/translateY — no transform conflict */}
            <Animated.View entering={FadeInDown.delay(i * 130).duration(480)}>
              <FriendCard f={f} T={T} isDark={isDark} />
            </Animated.View>
          </View>
        ))}
      </View>

      {/* ── Heading + button — separate sibling section ── */}
      <View
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingBottom: Math.max(insets.bottom, 16) + 4,
          justifyContent: 'flex-end',
        }}
      >
        <Animated.View
          entering={FadeInDown.delay(420).duration(500)}
          style={{ marginBottom: 28 }}
        >
          <Text
            style={{
              fontFamily: Font.displayMed,
              fontSize: 40,
              color: T.textDim,
              letterSpacing: -1.8,
              lineHeight: 44,
            }}
          >
            See your friends
          </Text>
          <Text
            style={{
              fontFamily: Font.displayBlack,
              fontSize: 40,
              color: T.text,
              letterSpacing: -1.8,
              lineHeight: 44,
            }}
          >
            show up daily.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(560).duration(400)}>
          <Pressable
            onPress={() => router.push('/onboarding/become')}
            style={({ pressed }) => ({
              height: 54,
              borderRadius: Radius.pill,
              backgroundColor: T.invertBg,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: pressed ? 0.78 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: Font.displaySemi,
                fontSize: 16,
                color: T.invertText,
                letterSpacing: -0.2,
              }}
            >
              Continue
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}
