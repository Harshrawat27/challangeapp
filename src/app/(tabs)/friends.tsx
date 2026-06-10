import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Colors, Font, MaxContentWidth, Radius } from '@/constants/theme';

export default function FriendsScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  return (
    <View style={{ flex: 1, backgroundColor: T.background, alignItems: 'center' }}>
      <SafeAreaView style={{ flex: 1, width: '100%', maxWidth: MaxContentWidth }} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 140 }}>

          {/* Header */}
          <Animated.View entering={FadeIn.duration(400)} style={{ marginTop: 12 }}>
            <Text style={{
              fontFamily: Font.bodyMed,
              fontSize: 11,
              letterSpacing: 3,
              color: T.textDim,
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
              Friends.
            </Text>
            <Text style={{
              fontFamily: Font.bodyReg,
              fontSize: 14,
              color: T.textDim,
              marginTop: 6,
              letterSpacing: -0.05,
            }}>
              Hard is easier together.
            </Text>
          </Animated.View>

          {/* Empty state */}
          <Animated.View entering={FadeInDown.delay(140).duration(440)} style={{
            marginTop: 48,
            alignItems: 'center',
            paddingHorizontal: 12,
          }}>
            {/* Decorative grouped avatars */}
            <View style={{ flexDirection: 'row', marginBottom: 24 }}>
              {[0, 1, 2].map(i => (
                <View
                  key={i}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 56,
                    backgroundColor: T.card,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: T.cardBorder,
                    marginLeft: i === 0 ? 0 : -18,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                  <Text style={{
                    fontFamily: Font.icon,
                    fontSize: 22,
                    color: T.textSubtle,
                  }}>
                    person
                  </Text>
                </View>
              ))}
            </View>

            <Text style={{
              fontFamily: Font.displayBold,
              fontSize: 22,
              color: T.text,
              letterSpacing: -0.5,
              textAlign: 'center',
            }}>
              No friends yet
            </Text>
            <Text style={{
              fontFamily: Font.bodyReg,
              fontSize: 14,
              color: T.textDim,
              lineHeight: 20,
              textAlign: 'center',
              marginTop: 8,
              maxWidth: 280,
            }}>
              Invite people doing 75 Hard. See each other&apos;s daily progress, keep each other honest.
            </Text>

            <Pressable
              onPress={() => { /* TODO: invite flow */ }}
              style={({ pressed }) => ({
                marginTop: 24,
                backgroundColor: T.invertBg,
                paddingHorizontal: 24,
                height: 48,
                borderRadius: Radius.pill,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                opacity: pressed ? 0.78 : 1,
              })}>
              <Text style={{
                fontFamily: Font.icon,
                fontSize: 18,
                color: T.invertText,
                lineHeight: 20,
              }}>
                person_add
              </Text>
              <Text style={{
                fontFamily: Font.displaySemi,
                fontSize: 15,
                color: T.invertText,
                letterSpacing: -0.2,
              }}>
                Add a friend
              </Text>
            </Pressable>
          </Animated.View>

          {/* Coming soon section */}
          <Animated.View entering={FadeInDown.delay(280).duration(440)} style={{ marginTop: 48 }}>
            <Text style={{
              fontFamily: Font.bodyMed,
              fontSize: 11,
              letterSpacing: 1.8,
              color: T.textSubtle,
              marginLeft: 4,
              marginBottom: 10,
            }}>
              COMING SOON
            </Text>
            <View style={{
              backgroundColor: T.card,
              borderRadius: Radius.lg,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: T.cardBorder,
              padding: 20,
              gap: 12,
            }}>
              <Text style={{
                fontFamily: Font.displaySemi,
                fontSize: 17,
                color: T.text,
                letterSpacing: -0.3,
              }}>
                Daily check-ins with friends
              </Text>
              <Text style={{
                fontFamily: Font.bodyReg,
                fontSize: 14,
                color: T.textDim,
                lineHeight: 20,
                letterSpacing: -0.05,
              }}>
                Send a one-tap &ldquo;done&rdquo; to friends each day. Nudges if someone&apos;s slipping. No social feed, just accountability.
              </Text>
            </View>
          </Animated.View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
