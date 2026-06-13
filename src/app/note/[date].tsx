import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNoteForDay, useSetNote } from '@/lib/convex-api';
import { Colors, Font } from '@/constants/theme';

function formatDateHeader(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function NoteScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();

  const serverNote = useNoteForDay(date as string);
  const setNote = useSetNote();

  const [text, setText] = useState('');
  const [savedIndicator, setSavedIndicator] = useState(false);

  // Initialise text once the server note loads (only on first load)
  const initialised = useRef(false);
  useEffect(() => {
    if (serverNote === undefined) return; // still loading
    if (initialised.current) return;
    initialised.current = true;
    setText(serverNote?.note ?? '');
  }, [serverNote]);

  // Debounced auto-save
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingText = useRef(text);

  const schedulesSave = (value: string) => {
    pendingText.current = value;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await setNote({ date: date as string, note: value });
        setSavedIndicator(true);
        setTimeout(() => setSavedIndicator(false), 1500);
      } catch { /* silent */ }
    }, 700);
  };

  const handleChange = (value: string) => {
    setText(value);
    schedulesSave(value);
  };

  // Flush any pending save on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        if (pendingText.current !== (serverNote?.note ?? '')) {
          setNote({ date: date as string, note: pendingText.current }).catch(() => {});
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDone = () => {
    Keyboard.dismiss();
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      setNote({ date: date as string, note: pendingText.current }).catch(() => {});
    }
    router.back();
  };

  const isLoading = serverNote === undefined;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: T.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      {/* Top bar */}
      <View style={{
        paddingTop: insets.top + 8,
        paddingHorizontal: 20,
        paddingBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 0,
      }}>
        {/* Close */}
        <Pressable
          onPress={handleDone}
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
          <Text style={{
            fontFamily: Font.icon,
            fontSize: 22,
            lineHeight: 22,
            color: T.text,
            includeFontPadding: false,
            textAlignVertical: 'center',
          }}>
            close
          </Text>
        </Pressable>

        {/* Date label (centre) */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{
            fontFamily: Font.bodyMed,
            fontSize: 11,
            letterSpacing: 1.8,
            color: T.textSubtle,
          }}>
            JOURNAL
          </Text>
        </View>

        {/* Save indicator / Done */}
        <Pressable
          onPress={handleDone}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
          <Text style={{
            fontFamily: Font.displaySemi,
            fontSize: 15,
            color: savedIndicator ? '#22C55E' : T.text,
            letterSpacing: -0.2,
          }}>
            {savedIndicator ? 'Saved' : 'Done'}
          </Text>
        </Pressable>
      </View>

      {/* Date subheader */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
        <Text style={{
          fontFamily: Font.displayBlack,
          fontSize: 26,
          color: T.text,
          letterSpacing: -0.8,
          lineHeight: 30,
        }}>
          {formatDateHeader(date as string)}
        </Text>
      </View>

      {/* Editor */}
      <TextInput
        value={isLoading ? '' : text}
        onChangeText={handleChange}
        editable={!isLoading}
        multiline
        autoFocus={!isLoading}
        placeholder={isLoading ? '' : "What's on your mind today?"}
        placeholderTextColor={T.textSubtle}
        scrollEnabled
        textAlignVertical='top'
        style={{
          flex: 1,
          paddingHorizontal: 20,
          paddingTop: 4,
          paddingBottom: insets.bottom + 24,
          fontFamily: Font.bodyReg,
          fontSize: 17,
          lineHeight: 26,
          color: T.text,
          letterSpacing: -0.1,
        }}
      />
    </KeyboardAvoidingView>
  );
}
