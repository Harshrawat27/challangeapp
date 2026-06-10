import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors, Font, MaxContentWidth, Radius } from '@/constants/theme';

const TOTAL_STEPS = 15;

export function OnboardingFrame({
  step,
  children,
  onContinue,
  continueLabel = 'Continue',
  continueDisabled = false,
  continueLoading = false,
  showBack = true,
  scrollable = true,
  bottomAccessory,
}: {
  step: number;
  children: React.ReactNode;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  continueLoading?: boolean;
  showBack?: boolean;
  scrollable?: boolean;
  bottomAccessory?: React.ReactNode;
}) {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];
  const progress = Math.max(0, Math.min(1, step / TOTAL_STEPS));

  const Body = (
    <View style={{ flex: 1, paddingHorizontal: 24 }}>
      {children}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: T.background, alignItems: 'center' }}>
      <SafeAreaView style={{ flex: 1, width: '100%', maxWidth: MaxContentWidth }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          {/* ── Top bar — back + progress ─────────────────────── */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 16,
          }}>
            <Pressable
              onPress={() => {
                if (router.canGoBack()) router.back();
              }}
              hitSlop={12}
              disabled={!showBack}
              style={({ pressed }) => ({
                width: 36, height: 36,
                borderRadius: 36,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: T.cardBorder,
                backgroundColor: T.card,
                justifyContent: 'center',
                alignItems: 'center',
                opacity: showBack ? (pressed ? 0.5 : 1) : 0,
              })}>
              <Text style={{ fontFamily: Font.icon, fontSize: 18, color: T.text, lineHeight: 20 }}>
                arrow_back
              </Text>
            </Pressable>

            {/* Progress bar */}
            <View style={{
              flex: 1,
              height: 4,
              borderRadius: 4,
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              overflow: 'hidden',
            }}>
              <View style={{
                width: `${progress * 100}%`,
                height: '100%',
                backgroundColor: T.text,
                borderRadius: 4,
              }} />
            </View>

            {/* Step count (subtle) */}
            <Text style={{
              fontFamily: Font.bodyMed,
              fontSize: 11,
              color: T.textSubtle,
              letterSpacing: 0.4,
              minWidth: 36,
              textAlign: 'right',
            }}>
              {step}/{TOTAL_STEPS}
            </Text>
          </View>

          {/* ── Body ─────────────────────────────────────────── */}
          {scrollable ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps='handled'
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
              {Body}
            </ScrollView>
          ) : Body}

          {/* ── Bottom CTA ───────────────────────────────────── */}
          <View style={{ paddingHorizontal: 24, paddingTop: 12 }}>
            {bottomAccessory}
            <Pressable
              onPress={onContinue}
              disabled={continueDisabled || continueLoading}
              style={({ pressed }) => ({
                height: 54,
                borderRadius: Radius.pill,
                backgroundColor: T.invertBg,
                justifyContent: 'center',
                alignItems: 'center',
                opacity: continueDisabled ? 0.35 : (pressed || continueLoading ? 0.78 : 1),
              })}>
              {continueLoading ? (
                <ActivityIndicator color={T.invertText} />
              ) : (
                <Text style={{
                  fontFamily: Font.displaySemi,
                  fontSize: 16,
                  color: T.invertText,
                  letterSpacing: -0.2,
                }}>
                  {continueLabel}
                </Text>
              )}
            </Pressable>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
