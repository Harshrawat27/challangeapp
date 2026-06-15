import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useChallengeHistory } from '@/lib/convex-api';
import { getChallenge, type ChallengeId } from '@/constants/challenges';
import { Colors, Font, Radius } from '@/constants/theme';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ChallengeHistoryScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const history = useChallengeHistory();

  return (
    <View style={{ flex: 1, backgroundColor: T.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => ({
              width: 36, height: 36, borderRadius: 36,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: T.cardBorder,
              backgroundColor: T.card,
              justifyContent: 'center', alignItems: 'center',
              opacity: pressed ? 0.55 : 1,
            })}>
            <Text style={{
              fontFamily: Font.icon, fontSize: 18, lineHeight: 18,
              color: T.text, includeFontPadding: false, textAlignVertical: 'center',
            }}>
              arrow_back
            </Text>
          </Pressable>
          <Text style={{
            flex: 1, textAlign: 'center',
            fontFamily: Font.displayBold, fontSize: 17,
            color: T.text, letterSpacing: -0.3,
          }}>
            Challenge history
          </Text>
          <View style={{ width: 36 }} />
        </View>

        {history === undefined ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={T.textDim} />
          </View>
        ) : history.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
            <Text style={{
              fontFamily: Font.icon, fontSize: 48, lineHeight: 52,
              color: T.textSubtle, includeFontPadding: false,
              marginBottom: 16,
            }}>
              emoji_events
            </Text>
            <Text style={{
              fontFamily: Font.displayBold, fontSize: 20,
              color: T.text, letterSpacing: -0.5,
              textAlign: 'center', marginBottom: 8,
            }}>
              No history yet
            </Text>
            <Text style={{
              fontFamily: Font.bodyReg, fontSize: 14,
              color: T.textDim, textAlign: 'center', lineHeight: 20,
            }}>
              Past challenge runs will appear here when you switch to a new challenge.
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 60 }}>

            {/* Summary strip */}
            <View style={{
              flexDirection: 'row',
              gap: 10,
              marginBottom: 24,
            }}>
              {(['completed', 'abandoned'] as const).map(s => {
                const count = history.filter(h => h.status === s).length;
                const isCompleted = s === 'completed';
                return (
                  <View key={s} style={{
                    flex: 1,
                    backgroundColor: T.card,
                    borderRadius: Radius.xl,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: T.cardBorder,
                    padding: 14,
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    <Text style={{
                      fontFamily: Font.displayBlack, fontSize: 28,
                      color: isCompleted ? '#22C55E' : T.text,
                      letterSpacing: -1,
                    }}>
                      {count}
                    </Text>
                    <Text style={{
                      fontFamily: Font.bodyMed, fontSize: 11,
                      letterSpacing: 1.2,
                      color: T.textDim,
                    }}>
                      {isCompleted ? 'COMPLETED' : 'ABANDONED'}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* History list */}
            <View style={{ gap: 12 }}>
              {history.map((entry) => {
                const ch = getChallenge(entry.challenge as ChallengeId);
                const pct = entry.challengeLength > 0
                  ? Math.round((entry.daysLogged / entry.challengeLength) * 100)
                  : 0;
                const isCompleted = entry.status === 'completed';
                const barWidth = `${Math.min(pct, 100)}%` as `${number}%`;

                return (
                  <View key={entry._id} style={{
                    backgroundColor: T.card,
                    borderRadius: Radius.xl,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: isCompleted ? 'rgba(34,197,94,0.25)' : T.cardBorder,
                    padding: 16,
                    gap: 12,
                  }}>
                    {/* Top row */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={{
                          fontFamily: Font.displayBold, fontSize: 16,
                          color: T.text, letterSpacing: -0.3,
                        }}>
                          {ch?.name ?? entry.challenge}
                        </Text>
                        <Text style={{
                          fontFamily: Font.bodyReg, fontSize: 12.5,
                          color: T.textDim,
                        }}>
                          {formatDate(entry.challengeStartDate)} – {formatDate(entry.endedAt)}
                        </Text>
                      </View>
                      <View style={{
                        paddingHorizontal: 10, paddingVertical: 4,
                        borderRadius: 20,
                        backgroundColor: isCompleted ? 'rgba(34,197,94,0.12)' : 'rgba(0,0,0,0.06)',
                      }}>
                        <Text style={{
                          fontFamily: Font.bodySemi, fontSize: 11,
                          letterSpacing: 0.5,
                          color: isCompleted ? '#16A34A' : T.textDim,
                        }}>
                          {isCompleted ? 'Completed' : 'Abandoned'}
                        </Text>
                      </View>
                    </View>

                    {/* Stats row */}
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                      <View style={{ gap: 2 }}>
                        <Text style={{
                          fontFamily: Font.displayBold, fontSize: 20,
                          color: T.text, letterSpacing: -0.6,
                        }}>
                          {entry.daysLogged}
                          <Text style={{ fontSize: 13, fontFamily: Font.bodyReg, color: T.textDim }}>
                            /{entry.challengeLength}
                          </Text>
                        </Text>
                        <Text style={{
                          fontFamily: Font.bodyMed, fontSize: 11,
                          color: T.textDim, letterSpacing: 0.3,
                        }}>
                          DAYS LOGGED
                        </Text>
                      </View>
                      <View style={{ gap: 2 }}>
                        <Text style={{
                          fontFamily: Font.displayBold, fontSize: 20,
                          color: isCompleted ? '#22C55E' : T.text, letterSpacing: -0.6,
                        }}>
                          {pct}%
                        </Text>
                        <Text style={{
                          fontFamily: Font.bodyMed, fontSize: 11,
                          color: T.textDim, letterSpacing: 0.3,
                        }}>
                          COMPLETION
                        </Text>
                      </View>
                    </View>

                    {/* Progress bar */}
                    <View style={{
                      height: 5,
                      backgroundColor: T.background,
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}>
                      <View style={{
                        width: barWidth,
                        height: '100%',
                        backgroundColor: isCompleted ? '#22C55E' : T.textDim,
                        borderRadius: 3,
                      }} />
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
