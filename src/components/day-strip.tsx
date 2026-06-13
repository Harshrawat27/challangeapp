import { useEffect, useMemo, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Font } from '@/constants/theme';

/**
 * Horizontal calendar strip of challenge days.
 *
 * Visual rules:
 *  - Past days = white pill, hairline border, small ink dot underneath.
 *  - Today = ring around the pill when *not* selected; filled when selected.
 *  - Selected (the day being viewed) = always filled black.
 *  - Future days = dimmed, non-interactive.
 *
 * Centers `selectedIdx` near the left on first mount.
 */
export function DayStrip({
  todayDate,
  challengeStart,
  totalDays,
  ink,
  invertBg,
  invertText,
  cardBg,
  cardBorder,
  dim,
  edgePadding,
  selectedIdx,
  onSelect,
}: {
  todayDate: Date;
  challengeStart: Date;
  totalDays: number;
  ink: string;
  invertBg: string;
  invertText: string;
  cardBg: string;
  cardBorder: string;
  dim: string;
  edgePadding: number;
  selectedIdx: number;
  onSelect: (idx: number) => void;
}) {
  const PILL = 50;
  const GAP = 10;
  const SLOT = PILL + GAP;

  const todayIndex = Math.max(0, Math.min(
    totalDays - 1,
    Math.floor((+todayDate - +challengeStart) / 86_400_000),
  ));

  const scrollRef = useRef<ScrollView>(null);
  const hasMounted = useRef(false);

  // Initial mount: jump (no animation) so the selected pill is already visible.
  // Subsequent selection changes: smooth-scroll. This avoids the jarring "snap"
  // that made day-to-day navigation feel like a page refresh.
  useEffect(() => {
    const focusIdx = selectedIdx ?? todayIndex;
    const offset = Math.max(0, (focusIdx - 2) * SLOT);
    const animated = hasMounted.current;
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: offset, animated });
      hasMounted.current = true;
    }, 0);
    return () => clearTimeout(t);
  }, [selectedIdx, todayIndex, SLOT]);

  const days = useMemo(
    () => Array.from({ length: totalDays }).map((_, i) => {
      const d = new Date(challengeStart);
      d.setDate(challengeStart.getDate() + i);
      return d;
    }),
    [challengeStart, totalDays],
  );

  return (
    <View style={{ marginHorizontal: -edgePadding }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate='fast'
        contentContainerStyle={{
          paddingHorizontal: edgePadding,
          gap: GAP,
          alignItems: 'flex-start',
          paddingVertical: 4,
        }}>
        {days.map((d, i) => {
          const isToday = i === todayIndex;
          const isSelected = i === selectedIdx;
          const isPast = i < todayIndex;
          const isFuture = i > todayIndex;
          const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
          const dayNum = d.getDate();

          const filled = isSelected;
          const showTodayRing = isToday && !isSelected;

          return (
            <Pressable
              key={i}
              onPress={() => onSelect(i)}
              disabled={isFuture}
              style={({ pressed }) => ({
                width: PILL,
                alignItems: 'center',
                gap: 6,
                opacity: pressed && !isFuture ? 0.6 : 1,
              })}>
              <Text style={{
                fontFamily: Font.bodyMed,
                fontSize: 10.5,
                color: isSelected ? ink : (isFuture ? dim : ink),
                letterSpacing: 0.3,
                opacity: isFuture ? 0.5 : 0.75,
              }}>
                {weekday.toUpperCase()}
              </Text>
              <View style={{
                width: PILL,
                height: PILL,
                borderRadius: PILL / 2,
                backgroundColor: filled ? invertBg : cardBg,
                borderWidth: showTodayRing ? 1.5 : StyleSheet.hairlineWidth,
                borderColor: showTodayRing ? invertBg : cardBorder,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Text style={{
                  fontFamily: filled ? Font.displayBold : Font.displaySemi,
                  fontSize: 17,
                  color: filled ? invertText : ink,
                  letterSpacing: -0.4,
                  opacity: isFuture ? 0.45 : 1,
                }}>
                  {dayNum}
                </Text>
              </View>
              <View style={{
                width: 5, height: 5, borderRadius: 5,
                backgroundColor: isPast ? ink : 'transparent',
                opacity: 0.85,
              }} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
