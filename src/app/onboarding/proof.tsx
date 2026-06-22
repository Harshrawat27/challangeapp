import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { OnboardingFrame } from '@/components/onboarding-frame';
import { Colors, Font, Radius, type Theme } from '@/constants/theme';

type Testimonial = {
  initial: string;
  name: string;
  meta: string;
  quote: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    initial: 'M',
    name: 'Marcus',
    meta: '75 Hard · finished Dec 2025',
    quote: 'I lost 18 pounds, but the bigger thing — I stopped negotiating with myself. That alone was worth it.',
  },
  {
    initial: 'A',
    name: 'Aisha',
    meta: 'Monk Mode · founder',
    quote: 'Thirty days, no social media, two deep work blocks. I shipped what I\'d been "planning" for a year.',
  },
  {
    initial: 'J',
    name: 'Jordan',
    meta: '75 Soft · first challenge',
    quote: 'I used to quit by day 4. Having someone check the box with me every night made it impossible to skip.',
  },
];

function StarRow({ T }: { T: Theme }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Text key={i} style={{ fontFamily: Font.icon, fontSize: 13, color: T.text, lineHeight: 14 }}>
          star
        </Text>
      ))}
    </View>
  );
}

function TestimonialCard({ t, T }: { t: Testimonial; T: Theme }) {
  return (
    <View style={{
      backgroundColor: T.card,
      borderRadius: Radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: T.cardBorder,
      padding: 18,
      gap: 12,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{
          width: 38, height: 38, borderRadius: 38,
          backgroundColor: T.invertBg,
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Text style={{
            fontFamily: Font.displayBold,
            fontSize: 16,
            color: T.invertText,
            letterSpacing: -0.3,
          }}>
            {t.initial}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontFamily: Font.displaySemi,
            fontSize: 14,
            color: T.text,
            letterSpacing: -0.2,
          }}>
            {t.name}
          </Text>
          <Text style={{
            fontFamily: Font.bodyReg,
            fontSize: 11,
            color: T.textDim,
            marginTop: 1,
            letterSpacing: 0.1,
          }}>
            {t.meta}
          </Text>
        </View>
        <StarRow T={T} />
      </View>
      <Text style={{
        fontFamily: Font.bodyReg,
        fontSize: 14,
        color: T.text,
        lineHeight: 21,
        letterSpacing: -0.05,
      }}>
        &ldquo;{t.quote}&rdquo;
      </Text>
    </View>
  );
}

export default function ProofScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  return (
    <OnboardingFrame
      step={11}
      onContinue={() => router.push('/onboarding/partner')}>
      <View style={{ flex: 1 }}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={{
            fontFamily: Font.bodyMed, fontSize: 11, letterSpacing: 2.4, color: T.textDim,
            marginBottom: 12,
          }}>
            PROOF
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(440)}>
          <Text style={{
            fontFamily: Font.displayBlack, fontSize: 36, color: T.text,
            letterSpacing: -1.2, lineHeight: 40, marginBottom: 8,
          }}>
            People who finished say…
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(440)}>
          <Text style={{
            fontFamily: Font.bodyReg, fontSize: 14, color: T.textDim, lineHeight: 20,
            marginBottom: 24,
          }}>
            Not the start. Not the middle. The finish.
          </Text>
        </Animated.View>

        <View style={{ gap: 12 }}>
          {TESTIMONIALS.map((t, i) => (
            <Animated.View
              key={t.name}
              entering={FadeInDown.delay(240 + i * 120).duration(500)}>
              <TestimonialCard t={t} T={T} />
            </Animated.View>
          ))}
        </View>

        {/* Rating footer */}
        <Animated.View
          entering={FadeIn.delay(700).duration(440)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginTop: 24,
          }}>
          <Text style={{
            fontFamily: Font.displayBold,
            fontSize: 18,
            color: T.text,
            letterSpacing: -0.4,
          }}>
            4.8
          </Text>
          <StarRow T={T} />
          <Text style={{
            fontFamily: Font.bodyReg,
            fontSize: 12,
            color: T.textDim,
            letterSpacing: -0.05,
          }}>
            · App Store
          </Text>
        </Animated.View>
      </View>
    </OnboardingFrame>
  );
}
