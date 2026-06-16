import { useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCachedPreferences, useWaterForDay, useLogWater, useDeleteWaterEntry, waterGetForDay, type WaterEntry } from '@/lib/convex-api';
import { Colors, Font, Radius } from '@/constants/theme';

const PRESETS = [200, 300, 500, 750];
const STEP = 50;
const DEFAULT_GOAL = 2500;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function mlLabel(ml: number): string {
  if (ml >= 1000) return `${(ml / 1000).toFixed(1).replace('.0', '')}L`;
  return `${ml}ml`;
}

export default function WaterLogScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const prefs = useCachedPreferences();
  const waterGoal = prefs?.waterGoalMl ?? DEFAULT_GOAL;
  const entries = useWaterForDay(date as string);
  const logWater = useLogWater().withOptimisticUpdate((localStore, args) => {
    const existing = localStore.getQuery(waterGetForDay, { date: args.date });
    if (existing === undefined) return;
    const optimistic: WaterEntry = {
      _id: `optimistic_${Date.now()}`,
      _creationTime: Date.now(),
      userId: '',
      date: args.date,
      amountMl: args.amountMl,
      loggedAt: new Date().toISOString(),
    };
    localStore.setQuery(waterGetForDay, { date: args.date }, [...existing, optimistic]);
  });
  const deleteEntry = useDeleteWaterEntry();

  const sortedEntries = [...(entries ?? [])].reverse(); // most-recent first
  const total = (entries ?? []).reduce((s, e) => s + e.amountMl, 0);
  const pct = Math.min(1, waterGoal > 0 ? total / waterGoal : 0);

  const [amount, setAmount] = useState(300);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (adding) return;
    setAdding(true);
    setAddError(null);
    try {
      await logWater({ date: date as string, amountMl: amount });
      router.back();
    } catch {
      setAddError('Failed to log water. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (entryId: string) => {
    try { await deleteEntry({ entryId }); } catch {}
  };

  return (
    // edges={['bottom']} — formSheet doesn't reach the top safe area so we
    // only need bottom inset handling. SafeAreaView ensures the ScrollView
    // content is never hidden behind the home indicator.
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: T.background }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={{
        paddingTop: 16,
        paddingHorizontal: 20,
        paddingBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: T.cardBorder,
      }}>
        {/* Close */}
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 32, height: 32, borderRadius: 32,
            backgroundColor: T.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: T.cardBorder,
            justifyContent: 'center', alignItems: 'center',
            opacity: pressed ? 0.5 : 1,
          })}>
          <Text style={{
            fontFamily: Font.icon, fontSize: 18, lineHeight: 18,
            color: T.text, includeFontPadding: false, textAlignVertical: 'center',
          }}>
            close
          </Text>
        </Pressable>

        {/* Title (centre) */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{
            fontFamily: Font.displayBold, fontSize: 16,
            color: T.text, letterSpacing: -0.3,
          }}>
            Hydrate
          </Text>
        </View>

        {/* Right spacer matches close button width for perfect centering */}
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 32,
        }}>

        {/* ── Compact progress strip ───────────────────────────────────── */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
        }}>
          <Text style={{
            fontFamily: Font.icon, fontSize: 20, lineHeight: 22,
            color: total >= waterGoal ? '#3B82F6' : T.textDim,
            includeFontPadding: false,
          }}>
            water_drop
          </Text>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{
                fontFamily: Font.displayBold, fontSize: 15,
                color: T.text, letterSpacing: -0.3,
              }}>
                {mlLabel(total)}
              </Text>
              <Text style={{
                fontFamily: Font.bodyMed, fontSize: 13,
                color: T.textDim, letterSpacing: -0.1,
              }}>
                / {mlLabel(waterGoal)}
              </Text>
            </View>
            <View style={{
              height: 5, borderRadius: 5,
              backgroundColor: T.cardBorder,
              overflow: 'hidden',
            }}>
              <View style={{
                width: `${Math.round(pct * 100)}%`,
                height: '100%',
                backgroundColor: total >= waterGoal ? '#3B82F6' : T.text,
                borderRadius: 5,
              }} />
            </View>
          </View>
        </View>

        {/* ── Presets ──────────────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {PRESETS.map(p => (
            <Pressable
              key={p}
              onPress={() => setAmount(p)}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 11,
                borderRadius: Radius.lg,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: amount === p ? T.text : T.cardBorder,
                backgroundColor: amount === p ? T.invertBg : T.card,
                alignItems: 'center',
                opacity: pressed ? 0.7 : 1,
              })}>
              <Text style={{
                fontFamily: Font.displayBold, fontSize: 13,
                color: amount === p ? T.invertText : T.text,
                letterSpacing: -0.2,
              }}>
                {mlLabel(p)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Stepper ──────────────────────────────────────────────────── */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: T.card,
          borderRadius: Radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: T.cardBorder,
          overflow: 'hidden',
          marginBottom: 14,
        }}>
          <Pressable
            onPress={() => setAmount(a => Math.max(50, a - STEP))}
            style={({ pressed }) => ({
              width: 52, height: 52,
              justifyContent: 'center', alignItems: 'center',
              opacity: pressed ? 0.5 : 1,
            })}>
            <Text style={{ fontFamily: Font.displayBold, fontSize: 22, color: T.text }}>−</Text>
          </Pressable>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{
              fontFamily: Font.displayBlack, fontSize: 26,
              color: T.text, letterSpacing: -0.8,
            }}>
              {mlLabel(amount)}
            </Text>
            <Text style={{ fontFamily: Font.bodyReg, fontSize: 10, color: T.textDim, marginTop: 1 }}>
              ±{STEP}ml
            </Text>
          </View>

          <Pressable
            onPress={() => setAmount(a => Math.min(2000, a + STEP))}
            style={({ pressed }) => ({
              width: 52, height: 52,
              justifyContent: 'center', alignItems: 'center',
              opacity: pressed ? 0.5 : 1,
            })}>
            <Text style={{ fontFamily: Font.displayBold, fontSize: 22, color: T.text }}>+</Text>
          </Pressable>
        </View>

        {/* ── Add error ────────────────────────────────────────────────── */}
        {addError && (
          <Text style={{
            fontFamily: Font.bodyMed, fontSize: 13,
            color: '#DC2626', textAlign: 'center', marginBottom: 10,
          }}>
            {addError}
          </Text>
        )}

        {/* ── Add button ───────────────────────────────────────────────── */}
        <Pressable
          onPress={handleAdd}
          disabled={adding}
          style={({ pressed }) => ({
            backgroundColor: T.invertBg,
            borderRadius: Radius.lg,
            paddingVertical: 15,
            alignItems: 'center',
            opacity: pressed || adding ? 0.6 : 1,
            marginBottom: 28,
          })}>
          <Text style={{
            fontFamily: Font.displayBold, fontSize: 16,
            color: T.invertText, letterSpacing: -0.3,
          }}>
            {adding ? 'Adding…' : `Add ${mlLabel(amount)}`}
          </Text>
        </Pressable>

        {/* ── Today's entries ──────────────────────────────────────────── */}
        {sortedEntries.length > 0 && (
          <>
            <Text style={{
              fontFamily: Font.bodyMed, fontSize: 11, letterSpacing: 1.8,
              color: T.textDim, marginBottom: 10,
            }}>
              TODAY'S LOG
            </Text>
            <View style={{
              backgroundColor: T.card,
              borderRadius: Radius.lg,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: T.cardBorder,
              overflow: 'hidden',
            }}>
              {sortedEntries.map((entry, i) => (
                <View
                  key={entry._id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 13,
                    borderBottomWidth: i === sortedEntries.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: T.hairline,
                    gap: 12,
                  }}>
                  <Text style={{
                    fontFamily: Font.icon, fontSize: 16, lineHeight: 18,
                    color: '#3B82F6', includeFontPadding: false,
                  }}>
                    water_drop
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontFamily: Font.displaySemi, fontSize: 14,
                      color: T.text, letterSpacing: -0.2,
                    }}>
                      {mlLabel(entry.amountMl)}
                    </Text>
                    <Text style={{
                      fontFamily: Font.bodyReg, fontSize: 11.5,
                      color: T.textDim, marginTop: 1,
                    }}>
                      {formatTime(entry.loggedAt)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleDelete(entry._id)}
                    hitSlop={10}
                    style={({ pressed }) => ({ opacity: pressed ? 0.3 : 0.5 })}>
                    <Text style={{
                      fontFamily: Font.icon, fontSize: 18, lineHeight: 20,
                      color: T.text, includeFontPadding: false,
                    }}>
                      delete
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
