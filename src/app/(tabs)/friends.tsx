import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';
import { router } from 'expo-router';

import {
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useMyFriends,
  useMyUsername,
  usePendingFriendRequests,
  useRemoveFriend,
  useSearchByUsername,
  useSendFriendRequest,
  type FoundUser,
  type FriendCard,
} from '@/lib/convex-api';
import { buildTasks, localDateString } from '@/lib/tasks';
import { Colors, Font, MaxContentWidth, Radius, type Theme } from '@/constants/theme';
import { getChallenge, type ChallengeId } from '@/constants/challenges';

const USERNAME_REGEX = /^[a-z0-9._]{3,20}$/;

// ─── Section label ─────────────────────────────────────────────────────────

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

// ─── Friend big card ───────────────────────────────────────────────────────

function FriendBigCard({ f, onRemove, T }: {
  f: FriendCard; onRemove: () => void; T: Theme;
}) {
  const initial = (f.displayName || f.username || '?').charAt(0).toUpperCase();
  const challengeName = getChallenge((f.challenge as ChallengeId | null) ?? null)?.name ?? '—';
  const todayPct = f.todayExpected > 0
    ? Math.round((f.todayCompleted / f.todayExpected) * 100)
    : 0;
  const tasks = useMemo(
    () => buildTasks(f.challenge, f.customHabits),
    [f.challenge, f.customHabits],
  );

  return (
    <Pressable
      onPress={() => router.push(`/friend/${f.userId}`)}
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
      <View style={{
        backgroundColor: T.card,
        borderRadius: Radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: T.cardBorder,
        padding: 16,
        gap: 14,
      }}>
        {/* Top row: avatar + name + day + remove */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{
            width: 50, height: 50, borderRadius: 50,
            backgroundColor: T.invertBg,
            justifyContent: 'center', alignItems: 'center',
          }}>
            <Text style={{ fontFamily: Font.displayBold, fontSize: 20, color: T.invertText, letterSpacing: -0.4 }}>
              {initial}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: Font.displaySemi, fontSize: 16, color: T.text, letterSpacing: -0.3 }}>
              {f.displayName || f.username || 'Friend'}
            </Text>
            <Text style={{ fontFamily: Font.bodyReg, fontSize: 12, color: T.textDim, marginTop: 2, letterSpacing: -0.05 }}>
              @{f.username ?? '—'}  ·  {challengeName}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            {f.currentDay != null && (
              <Text style={{ fontFamily: Font.displayBold, fontSize: 12, color: T.textDim, letterSpacing: -0.2 }}>
                Day {f.currentDay}{f.challengeLength ? `/${f.challengeLength}` : ''}
              </Text>
            )}
            <Pressable
              onPress={onRemove}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.4 : 1 })}>
              <Text style={{ fontFamily: Font.icon, fontSize: 18, color: T.textSubtle, lineHeight: 20, includeFontPadding: false }}>
                more_vert
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Progress bar */}
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: Font.bodyMed, fontSize: 10, letterSpacing: 1.4, color: T.textSubtle }}>
              TODAY
            </Text>
            <Text style={{
              fontFamily: Font.displayBold,
              fontSize: 13,
              letterSpacing: -0.2,
              color: todayPct === 100 ? T.text : T.textDim,
            }}>
              {f.todayExpected > 0 ? `${todayPct}%` : '—'}
            </Text>
          </View>
          <View style={{ height: 5, borderRadius: 5, backgroundColor: T.hairline }}>
            <View style={{
              width: `${todayPct}%`,
              height: '100%',
              borderRadius: 5,
              backgroundColor: todayPct === 100 ? T.text : T.textDim,
            }} />
          </View>
        </View>

        {/* Task icon pills */}
        {tasks.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {tasks.map(task => {
              const done = f.todayCompletions.includes(task.id);
              return (
                <View key={task.id} style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: done ? T.invertBg : 'transparent',
                  borderWidth: done ? 0 : StyleSheet.hairlineWidth,
                  borderColor: T.cardBorder,
                  justifyContent: 'center', alignItems: 'center',
                }}>
                  <Text style={{
                    fontFamily: Font.icon, fontSize: 17, lineHeight: 19,
                    color: done ? T.invertText : T.textSubtle,
                    includeFontPadding: false,
                  }}>
                    {task.icon}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Tap hint */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontFamily: Font.bodyReg, fontSize: 11, color: T.textSubtle, flex: 1 }}>
            Tap to see full profile & heatmap
          </Text>
          <Text style={{ fontFamily: Font.icon, fontSize: 14, color: T.textSubtle, lineHeight: 16, includeFontPadding: false }}>
            chevron_right
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Pending request row (incoming) ─────────────────────────────────────────

function PendingIncomingRow({
  displayName, username, onAccept, onDecline, isLast, T,
}: {
  displayName: string; username: string | null;
  onAccept: () => void; onDecline: () => void; isLast: boolean; T: Theme;
}) {
  const initial = displayName.charAt(0).toUpperCase();
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
      borderBottomColor: T.hairline,
    }}>
      <View style={{
        width: 40, height: 40, borderRadius: 40,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: T.cardBorder,
        backgroundColor: T.card,
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Text style={{
          fontFamily: Font.displayBold,
          fontSize: 15,
          color: T.text,
        }}>
          {initial}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontFamily: Font.displaySemi,
          fontSize: 14,
          color: T.text,
          letterSpacing: -0.2,
        }}>
          {displayName}
        </Text>
        <Text style={{
          fontFamily: Font.bodyReg,
          fontSize: 12,
          color: T.textDim,
          marginTop: 1,
        }}>
          @{username ?? '—'} wants to be friends
        </Text>
      </View>
      <Pressable
        onPress={onDecline}
        hitSlop={6}
        style={({ pressed }) => ({
          paddingHorizontal: 12,
          height: 32,
          borderRadius: Radius.pill,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: T.cardBorder,
          backgroundColor: T.card,
          justifyContent: 'center',
          opacity: pressed ? 0.5 : 1,
        })}>
        <Text style={{
          fontFamily: Font.displaySemi, fontSize: 12, color: T.textDim,
        }}>
          Decline
        </Text>
      </Pressable>
      <Pressable
        onPress={onAccept}
        hitSlop={6}
        style={({ pressed }) => ({
          paddingHorizontal: 14,
          height: 32,
          borderRadius: Radius.pill,
          backgroundColor: T.invertBg,
          justifyContent: 'center',
          opacity: pressed ? 0.78 : 1,
        })}>
        <Text style={{
          fontFamily: Font.displaySemi, fontSize: 12, color: T.invertText,
        }}>
          Accept
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Add Friend (search) modal-ish section ─────────────────────────────────

function AddFriendSection({ T, isDark }: { T: Theme; isDark: boolean }) {
  const [text, setText] = useState('');
  const sanitized = text.toLowerCase().replace(/[^a-z0-9._]/g, '');
  const valid = USERNAME_REGEX.test(sanitized);
  const found: FoundUser | null | undefined = useSearchByUsername(valid ? sanitized : '');
  const sendRequest = useSendFriendRequest();

  const [sending, setSending] = useState(false);
  const [sentStatus, setSentStatus] = useState<string | null>(null);

  const handleSend = useCallback(async () => {
    if (!valid) return;
    setSending(true);
    setSentStatus(null);
    try {
      const res = await sendRequest({ toUsername: sanitized });
      if (res.status === 'sent') setSentStatus('Invite sent.');
      else if (res.status === 'already_pending') setSentStatus('Invite already pending.');
      else if (res.status === 'already_friends') setSentStatus("You're already friends.");
      else if (res.status === 'auto_accepted') setSentStatus("Connected — they invited you too.");
      setText('');
    } catch (e: any) {
      Alert.alert('Could not send invite', e?.message ?? 'Something went wrong.');
    } finally {
      setSending(false);
    }
  }, [sanitized, valid, sendRequest]);

  return (
    <View>
      {/* Input + send button */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: T.card,
        borderRadius: Radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: T.cardBorder,
        paddingHorizontal: 14,
        height: 52,
        gap: 6,
      }}>
        <Text style={{
          fontFamily: Font.icon,
          fontSize: 18,
          color: T.textDim,
          lineHeight: 20,
        }}>
          search
        </Text>
        <Text style={{
          fontFamily: Font.displaySemi,
          fontSize: 17,
          color: T.textSubtle,
          letterSpacing: -0.3,
        }}>
          @
        </Text>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder='friend_username'
          placeholderTextColor={T.textSubtle}
          autoCapitalize='none'
          autoCorrect={false}
          maxLength={20}
          style={{
            flex: 1,
            fontFamily: Font.displaySemi,
            fontSize: 16,
            color: T.text,
            letterSpacing: -0.3,
          }}
        />
      </View>

      {/* Live result */}
      {valid && (
        <Animated.View
          layout={Layout.springify().damping(18)}
          entering={FadeIn.duration(200)}
          style={{ marginTop: 12 }}>
          {found === undefined ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 }}>
              <ActivityIndicator size='small' color={T.textDim} />
              <Text style={{ fontFamily: Font.bodyReg, fontSize: 13, color: T.textDim }}>
                Looking for @{sanitized}…
              </Text>
            </View>
          ) : found === null ? (
            <View style={{
              backgroundColor: T.card,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: T.cardBorder,
              borderRadius: Radius.lg,
              padding: 14,
            }}>
              <Text style={{
                fontFamily: Font.displaySemi,
                fontSize: 14,
                color: T.text,
                letterSpacing: -0.2,
              }}>
                No user with that username
              </Text>
              <Text style={{
                fontFamily: Font.bodyReg,
                fontSize: 12.5,
                color: T.textDim,
                marginTop: 4,
                letterSpacing: -0.05,
              }}>
                Once they create their account they can be invited here.
              </Text>
            </View>
          ) : found.self ? (
            <View style={{
              backgroundColor: T.card,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: T.cardBorder,
              borderRadius: Radius.lg,
              padding: 14,
            }}>
              <Text style={{
                fontFamily: Font.bodyReg,
                fontSize: 13,
                color: T.textDim,
              }}>
                That&apos;s you.
              </Text>
            </View>
          ) : (
            <View style={{
              backgroundColor: T.card,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: T.cardBorder,
              borderRadius: Radius.lg,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}>
              <View style={{
                width: 44, height: 44, borderRadius: 44,
                backgroundColor: T.invertBg,
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Text style={{
                  fontFamily: Font.displayBold,
                  fontSize: 17,
                  color: T.invertText,
                }}>
                  {(found.displayName || found.username).charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontFamily: Font.displaySemi,
                  fontSize: 15,
                  color: T.text,
                  letterSpacing: -0.2,
                }}>
                  {found.name || found.displayName}
                </Text>
                <Text style={{
                  fontFamily: Font.bodyReg,
                  fontSize: 12,
                  color: T.textDim,
                  marginTop: 1,
                }}>
                  @{found.username}
                </Text>
              </View>
              <Pressable
                onPress={handleSend}
                disabled={sending}
                style={({ pressed }) => ({
                  paddingHorizontal: 14,
                  height: 36,
                  borderRadius: Radius.pill,
                  backgroundColor: T.invertBg,
                  justifyContent: 'center',
                  opacity: pressed || sending ? 0.78 : 1,
                })}>
                {sending ? (
                  <ActivityIndicator size='small' color={T.invertText} />
                ) : (
                  <Text style={{
                    fontFamily: Font.displaySemi,
                    fontSize: 13,
                    color: T.invertText,
                  }}>
                    Invite
                  </Text>
                )}
              </Pressable>
            </View>
          )}
        </Animated.View>
      )}

      {sentStatus && (
        <Animated.View
          entering={FadeIn.duration(180)}
          style={{ marginTop: 10, paddingHorizontal: 4 }}>
          <Text style={{ fontFamily: Font.bodyMed, fontSize: 13, color: T.textDim }}>
            {sentStatus}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function FriendsScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];

  const today = localDateString();
  const myUsername = useMyUsername();
  const friends = useMyFriends(today);
  const pending = usePendingFriendRequests();

  const acceptReq = useAcceptFriendRequest();
  const declineReq = useDeclineFriendRequest();
  const removeFriend = useRemoveFriend();

  const onAccept = useCallback(async (fromUserId: string) => {
    try { await acceptReq({ fromUserId }); }
    catch (e: any) { Alert.alert('Could not accept', e?.message ?? ''); }
  }, [acceptReq]);

  const onDecline = useCallback(async (fromUserId: string) => {
    try { await declineReq({ fromUserId }); }
    catch (e: any) { Alert.alert('Could not decline', e?.message ?? ''); }
  }, [declineReq]);

  const onRemove = useCallback((friendUserId: string, displayName: string) => {
    Alert.alert(
      `Remove ${displayName}?`,
      'They will no longer see your progress and vice-versa.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive', onPress: async () => {
            try { await removeFriend({ friendUserId }); }
            catch (e: any) { Alert.alert('Could not remove', e?.message ?? ''); }
          },
        },
      ],
    );
  }, [removeFriend]);

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
              {myUsername ? `@${myUsername.username}` : '75 / HARD'}
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

          {/* Add Friend */}
          <Animated.View entering={FadeInDown.delay(120).duration(420)} style={{ marginTop: 28 }}>
            <SectionLabel T={T}>Add Friend</SectionLabel>
            <AddFriendSection T={T} isDark={isDark} />
          </Animated.View>

          {/* Pending — incoming */}
          {pending && pending.incoming.length > 0 && (
            <Animated.View entering={FadeInDown.delay(180).duration(440)}>
              <SectionLabel T={T}>{`Pending (${pending.incoming.length})`}</SectionLabel>
              <View style={{
                backgroundColor: T.card,
                borderRadius: Radius.lg,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: T.cardBorder,
                paddingHorizontal: 16,
                paddingVertical: 4,
              }}>
                {pending.incoming.map((req, i) => (
                  <PendingIncomingRow
                    key={req.fromUserId}
                    displayName={req.displayName}
                    username={req.username}
                    onAccept={() => onAccept(req.fromUserId)}
                    onDecline={() => onDecline(req.fromUserId)}
                    isLast={i === pending.incoming.length - 1}
                    T={T}
                  />
                ))}
              </View>
            </Animated.View>
          )}

          {/* Friends list */}
          <Animated.View entering={FadeInDown.delay(240).duration(440)}>
            <SectionLabel T={T}>
              {friends ? `Your Crew (${friends.length})` : 'Your Crew'}
            </SectionLabel>
            {friends === undefined ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator color={T.text} />
              </View>
            ) : friends.length === 0 ? (
              <View style={{
                backgroundColor: T.card,
                borderRadius: Radius.lg,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: T.cardBorder,
                padding: 18,
              }}>
                <Text style={{
                  fontFamily: Font.displaySemi,
                  fontSize: 14,
                  color: T.text,
                  letterSpacing: -0.2,
                  marginBottom: 6,
                }}>
                  No friends yet
                </Text>
                <Text style={{
                  fontFamily: Font.bodyReg,
                  fontSize: 13,
                  color: T.textDim,
                  lineHeight: 19,
                  letterSpacing: -0.05,
                }}>
                  Search by their username above. Once you&apos;re connected, you&apos;ll see each other&apos;s daily progress.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {friends.map(f => (
                  <FriendBigCard
                    key={f.userId}
                    f={f}
                    onRemove={() => onRemove(f.userId, f.displayName)}
                    T={T}
                  />
                ))}
              </View>
            )}
          </Animated.View>

          {/* Outgoing pending — small footer */}
          {pending && pending.outgoing.length > 0 && (
            <Animated.View entering={FadeInDown.delay(320).duration(420)} style={{ marginTop: 18 }}>
              <Text style={{
                fontFamily: Font.bodyMed,
                fontSize: 11,
                letterSpacing: 1.6,
                color: T.textSubtle,
                marginLeft: 4,
                marginBottom: 6,
              }}>
                YOU INVITED ({pending.outgoing.length})
              </Text>
              <View style={{
                backgroundColor: T.card,
                borderRadius: Radius.md,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: T.cardBorder,
                padding: 14,
                gap: 4,
              }}>
                {pending.outgoing.map(r => (
                  <Text
                    key={r.toUserId}
                    style={{
                      fontFamily: Font.bodyMed,
                      fontSize: 13,
                      color: T.textDim,
                      letterSpacing: -0.05,
                    }}>
                    @{r.username ?? r.displayName} · awaiting reply
                  </Text>
                ))}
              </View>
            </Animated.View>
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
