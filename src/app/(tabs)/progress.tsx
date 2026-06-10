import { ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Colors, Font, MaxContentWidth, Radius, type Theme } from '@/constants/theme';

function StatTile({
  label, value, hint, T,
}: { label: string; value: string; hint: string; T: Theme }) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: T.card,
      borderRadius: Radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: T.cardBorder,
      padding: 16,
      gap: 6,
    }}>
      <Text style={{
        fontFamily: Font.bodyMed,
        fontSize: 10,
        letterSpacing: 1.6,
        color: T.textSubtle,
      }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{
        fontFamily: Font.displayBlack,
        fontSize: 32,
        color: T.text,
        letterSpacing: -1,
        lineHeight: 36,
      }}>
        {value}
      </Text>
      <Text style={{
        fontFamily: Font.bodyReg,
        fontSize: 12,
        color: T.textDim,
        letterSpacing: -0.05,
      }}>
        {hint}
      </Text>
    </View>
  );
}

export default function ProgressScreen() {
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
              Progress.
            </Text>
            <Text style={{
              fontFamily: Font.bodyReg,
              fontSize: 14,
              color: T.textDim,
              marginTop: 6,
              letterSpacing: -0.05,
            }}>
              Every checkmark tells a story.
            </Text>
          </Animated.View>

          {/* Stat tiles */}
          <Animated.View entering={FadeInDown.delay(120).duration(420)} style={{ marginTop: 28, gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <StatTile label='Current day'   value='—'  hint='of 75'        T={T} />
              <StatTile label='Completion'    value='—%' hint='all tasks'    T={T} />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <StatTile label='Streak'        value='—d' hint='consecutive'  T={T} />
              <StatTile label='Workouts done' value='—'  hint='this challenge' T={T} />
            </View>
          </Animated.View>

          {/* Coming soon section */}
          <Animated.View entering={FadeInDown.delay(240).duration(420)} style={{ marginTop: 32 }}>
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
                Charts, heatmaps & history
              </Text>
              <Text style={{
                fontFamily: Font.bodyReg,
                fontSize: 14,
                color: T.textDim,
                lineHeight: 20,
                letterSpacing: -0.05,
              }}>
                See your completion patterns by day of the week, task type, and time of day. Compare progress photos side-by-side.
              </Text>
            </View>
          </Animated.View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
