import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { authClient } from '@/lib/auth-client';
import { Colors, Font, MaxContentWidth, Radius, type Theme } from '@/constants/theme';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitial(name?: string | null, email?: string | null) {
  const source = (name || email || '?').trim();
  return source.charAt(0).toUpperCase();
}

// ─── Section ────────────────────────────────────────────────────────────────

function SectionLabel({ children, T }: { children: string; T: Theme }) {
  return (
    <Text style={{
      fontFamily: Font.bodyMed,
      fontSize: 11,
      letterSpacing: 1.8,
      color: T.textSubtle,
      marginLeft: 4,
      marginBottom: 8,
      marginTop: 28,
    }}>
      {children.toUpperCase()}
    </Text>
  );
}

function Card({ children, T }: { children: React.ReactNode; T: Theme }) {
  return (
    <View style={{
      backgroundColor: T.card,
      borderRadius: Radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: T.cardBorder,
      overflow: 'hidden',
    }}>
      {children}
    </View>
  );
}

function Row({
  label,
  value,
  onPress,
  chevron,
  destructive,
  loading,
  isLast,
  T,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  loading?: boolean;
  isLast?: boolean;
  T: Theme;
}) {
  const labelColor = destructive ? '#DC2626' : T.text;
  const interactive = !!onPress;

  const content = (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
      borderBottomColor: T.hairline,
    }}>
      <Text style={{
        flex: 1,
        fontFamily: interactive ? Font.bodySemi : Font.bodyMed,
        fontSize: 15,
        color: labelColor,
        letterSpacing: -0.1,
      }}>
        {label}
      </Text>
      {loading ? (
        <ActivityIndicator size='small' color={T.text} />
      ) : value ? (
        <Text
          numberOfLines={1}
          style={{
            maxWidth: 220,
            fontFamily: Font.bodyReg,
            fontSize: 14,
            color: T.textDim,
            letterSpacing: -0.05,
          }}>
          {value}
        </Text>
      ) : null}
      {chevron && (
        <Text style={{
          fontFamily: Font.icon,
          fontSize: 18,
          color: T.textSubtle,
          marginLeft: 8,
        }}>
          chevron_right
        </Text>
      )}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => ({
        opacity: pressed && !loading ? 0.55 : 1,
        backgroundColor: pressed ? T.hairline : 'transparent',
      })}>
      {content}
    </Pressable>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

const APP_VERSION = (Constants.expoConfig?.version as string | undefined) ?? '1.0.0';

export default function ProfileScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const initial = useMemo(() => getInitial(user?.name, user?.email), [user]);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign out?',
      'You can sign back in anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              await authClient.signOut();
              // Root _layout watches session and will redirect to /sign-up.
            } finally {
              setSigningOut(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
  }, []);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account and all challenge data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await authClient.deleteUser();
              // Session is invalidated; root _layout redirects.
            } catch (e) {
              Alert.alert('Could not delete account', 'Please try again.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
  }, []);

  const openUrl = useCallback((url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Could not open link', url);
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: T.background, alignItems: 'center' }}>
      <SafeAreaView style={{ flex: 1, width: '100%', maxWidth: MaxContentWidth }} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 140 }}>

          {/* ═══ Page header ═════════════════════════════════════════ */}
          <Animated.View entering={FadeIn.duration(400)}>
            <Text style={{
              fontFamily: Font.bodyMed,
              fontSize: 11,
              letterSpacing: 3,
              color: T.textDim,
              marginTop: 12,
            }}>
              75 / HARD
            </Text>
            <Text style={{
              fontFamily: Font.displayBlack,
              fontSize: 38,
              color: T.text,
              letterSpacing: -1.4,
              lineHeight: 42,
              marginTop: 6,
            }}>
              Profile.
            </Text>
          </Animated.View>

          {/* ═══ User card ═══════════════════════════════════════════ */}
          <Animated.View entering={FadeInDown.delay(120).duration(420)} style={{ marginTop: 28 }}>
            <Card T={T}>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 }}>
                <View style={{
                  width: 56, height: 56, borderRadius: 56,
                  backgroundColor: T.invertBg,
                  justifyContent: 'center', alignItems: 'center',
                }}>
                  {isPending ? (
                    <ActivityIndicator size='small' color={T.invertText} />
                  ) : (
                    <Text style={{
                      fontFamily: Font.displayBold,
                      fontSize: 22,
                      color: T.invertText,
                      letterSpacing: -0.5,
                    }}>
                      {initial}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: Font.displaySemi,
                      fontSize: 17,
                      color: T.text,
                      letterSpacing: -0.3,
                    }}>
                    {user?.name || (isPending ? 'Loading…' : '—')}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: Font.bodyReg,
                      fontSize: 13,
                      color: T.textDim,
                      marginTop: 2,
                      letterSpacing: -0.05,
                    }}>
                    {user?.email || ' '}
                  </Text>
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* ═══ About ═══════════════════════════════════════════════ */}
          <Animated.View entering={FadeInDown.delay(200).duration(420)}>
            <SectionLabel T={T}>About</SectionLabel>
            <Card T={T}>
              <Row label='Version' value={APP_VERSION} T={T} />
              <Row
                label='Privacy Policy'
                chevron
                onPress={() => openUrl('https://habittracker.app/privacy')}
                T={T}
              />
              <Row
                label='Terms of Service'
                chevron
                onPress={() => openUrl('https://habittracker.app/terms')}
                T={T}
              />
              <Row
                label='Support'
                value='hello@habittracker.app'
                isLast
                onPress={() => openUrl('mailto:hello@habittracker.app')}
                T={T}
              />
            </Card>
          </Animated.View>

          {/* ═══ Sign out ═══════════════════════════════════════════ */}
          <Animated.View entering={FadeInDown.delay(280).duration(420)} style={{ marginTop: 28 }}>
            <Card T={T}>
              <Row
                label='Sign out'
                onPress={handleSignOut}
                loading={signingOut}
                isLast
                T={T}
              />
            </Card>
          </Animated.View>

          {/* ═══ Danger zone ════════════════════════════════════════ */}
          <Animated.View entering={FadeInDown.delay(340).duration(420)} style={{ marginTop: 16 }}>
            <Card T={T}>
              <Row
                label='Delete account'
                destructive
                onPress={handleDeleteAccount}
                loading={deleting}
                isLast
                T={T}
              />
            </Card>
          </Animated.View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
