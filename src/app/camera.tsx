import React, { useRef, useState } from 'react';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library/legacy';
import { captureRef } from 'react-native-view-shot';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Font } from '@/constants/theme';
import { useDay, useMyPreferences } from '@/lib/convex-api';
import { buildTasks, localDateString } from '@/lib/tasks';
import { getChallenge, type ChallengeId } from '@/constants/challenges';

type Step = 'camera' | 'preview';

// ─── Camera step ─────────────────────────────────────────────────────────────

function CameraStep({
  onCapture,
  onClose,
}: {
  onCapture: (uri: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<'front' | 'back'>('back');

  const takePicture = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.9 });
    if (photo) onCapture(photo.uri);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing} />

      {/* Top controls */}
      <View style={{
        position: 'absolute',
        top: insets.top + 12,
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
      }}>
        <Pressable onPress={onClose} hitSlop={12}>
          <View style={iconBtn}>
            <Text style={iconText}>close</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')} hitSlop={12}>
          <View style={iconBtn}>
            <Text style={iconText}>flip_camera_ios</Text>
          </View>
        </Pressable>
      </View>

      {/* Shutter */}
      <View style={{ position: 'absolute', bottom: insets.bottom + 40, left: 0, right: 0, alignItems: 'center' }}>
        <Pressable onPress={takePicture} hitSlop={8}>
          <View style={{
            width: 76,
            height: 76,
            borderRadius: 76,
            borderWidth: 4,
            borderColor: '#fff',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <View style={{ width: 60, height: 60, borderRadius: 60, backgroundColor: '#fff' }} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Overlay card ────────────────────────────────────────────────────────────

function HabitCard({
  dayNumber,
  challengeName,
  completedTasks,
  bottom,
}: {
  dayNumber: number;
  challengeName: string;
  completedTasks: { id: string; label: string }[];
  bottom: number;
}) {
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <View style={{
      position: 'absolute',
      bottom,
      left: 20,
      right: 20,
      backgroundColor: 'rgba(0,0,0,0.72)',
      borderRadius: 20,
      padding: 20,
      gap: 12,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: Font.displayBlack, fontSize: 42, lineHeight: 44, color: '#fff' }}>
          Day {dayNumber}
        </Text>
        <Text style={{ fontFamily: Font.bodyMed, fontSize: 13, color: 'rgba(255,255,255,0.55)', paddingBottom: 6 }}>
          {challengeName}
        </Text>
      </View>

      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />

      {/* Completed habits */}
      <View style={{ gap: 9 }}>
        {completedTasks.map(task => (
          <View key={task.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontFamily: Font.icon, fontSize: 18, lineHeight: 20, color: '#4ADE80', includeFontPadding: false }}>
              check_circle
            </Text>
            <Text style={{ fontFamily: Font.bodyMed, fontSize: 14, color: '#fff', flex: 1 }}>
              {task.label}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />

      {/* Footer */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: Font.bodyMed, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
          {dateStr}
        </Text>
        <Text style={{ fontFamily: Font.bodySemi, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
          habittracker
        </Text>
      </View>
    </View>
  );
}

// ─── Preview step ─────────────────────────────────────────────────────────────

function PreviewStep({
  photoUri,
  captureRef,
  onRetake,
  onSave,
  saving,
  saved,
  dayNumber,
  challengeName,
  completedTasks,
}: {
  photoUri: string;
  captureRef: React.RefObject<View>;
  onRetake: () => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  dayNumber: number;
  challengeName: string;
  completedTasks: { id: string; label: string }[];
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Only this View gets captured — no buttons inside */}
      <View ref={captureRef} collapsable={false} style={{ flex: 1 }}>
        <Image source={{ uri: photoUri }} style={{ flex: 1 }} contentFit='cover' />
        {completedTasks.length > 0 && (
          <HabitCard
            dayNumber={dayNumber}
            challengeName={challengeName}
            completedTasks={completedTasks}
            bottom={20}
          />
        )}
      </View>

      {/* Saved toast — centered on screen */}
      {saved && (
        <View
          pointerEvents='none'
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'rgba(0,0,0,0.75)',
            paddingHorizontal: 22,
            paddingVertical: 14,
            borderRadius: 999,
          }}>
            <Text style={{ fontFamily: Font.icon, fontSize: 18, lineHeight: 20, color: '#4ADE80', includeFontPadding: false }}>
              check_circle
            </Text>
            <Text style={{ fontFamily: Font.bodySemi, fontSize: 15, color: '#fff' }}>
              Photo saved!
            </Text>
          </View>
        </View>
      )}

      {/* Top controls — outside the capture area */}
      <View style={{
        position: 'absolute',
        top: insets.top + 12,
        left: 16,
        right: 16,
        flexDirection: 'row',
        gap: 12,
      }}>
        <Pressable onPress={onRetake} style={{ flex: 1 }} disabled={saving || saved}>
          <View style={[ghostBtn, (saving || saved) && { opacity: 0.4 }]}>
            <Text style={{ fontFamily: Font.bodySemi, fontSize: 16, color: '#fff' }}>Retake</Text>
          </View>
        </Pressable>
        <Pressable onPress={onSave} disabled={saving || saved} style={{ flex: 1 }}>
          <View style={[solidBtn, (saving || saved) && { opacity: 0.4 }]}>
            {saving
              ? <ActivityIndicator color='#000' />
              : <Text style={{ fontFamily: Font.bodySemi, fontSize: 16, color: '#000' }}>Save to Photos</Text>
            }
          </View>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CameraScreen() {
  const [step, setStep] = useState<Step>('camera');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const previewRef = useRef<View>(null);

  const [camPermission, requestCamPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();

  const today = localDateString();
  const log = useDay(today);
  const prefs = useMyPreferences();
  const tasks = buildTasks(prefs?.challenge, prefs?.customHabits);
  const completedTasks = tasks.filter(t => !!log?.completions[t.id]);
  const challenge = getChallenge((prefs?.challenge as ChallengeId | undefined) ?? null);
  const dayNumber = log?.challengeDay ?? 1;

  // ── Permission gate ──────────────────────────────────────────────────────
  if (!camPermission) {
    return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  }

  if (!camPermission.granted) {
    const canAsk = camPermission.canAskAgain;
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32 }}>
        <Text style={{ fontFamily: Font.icon, fontSize: 48, color: '#fff', includeFontPadding: false }}>photo_camera</Text>
        <Text style={{ fontFamily: Font.displaySemi, fontSize: 22, color: '#fff', textAlign: 'center' }}>Camera access needed</Text>
        <Text style={{ fontFamily: Font.bodyMed, fontSize: 15, color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>
          {canAsk
            ? 'To take your progress photo and generate your shareable card.'
            : 'Camera access was denied. Enable it in Settings → Privacy & Security → Camera.'}
        </Text>
        <Pressable onPress={canAsk ? requestCamPermission : () => Linking.openSettings()}>
          <View style={{ backgroundColor: '#fff', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 999, marginTop: 8 }}>
            <Text style={{ fontFamily: Font.bodySemi, fontSize: 16, color: '#000' }}>
              {canAsk ? 'Allow Camera' : 'Open Settings'}
            </Text>
          </View>
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <Text style={{ fontFamily: Font.bodyMed, fontSize: 15, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCapture = (uri: string) => {
    setPhotoUri(uri);
    setStep('preview');
  };

  const handleSave = async () => {
    if (!previewRef.current || saving) return;
    setSaving(true);
    try {
      if (!mediaPermission?.granted) {
        const { granted } = await requestMediaPermission();
        if (!granted) {
          Alert.alert('Permission needed', 'Please allow access to your photo library to save.');
          setSaving(false);
          return;
        }
      }
      const uri = await captureRef(previewRef, { format: 'jpg', quality: 0.92 });
      const asset = await MediaLibrary.createAssetAsync(uri);
      const album = await MediaLibrary.getAlbumAsync('challangephotos');
      if (album) {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      } else {
        await MediaLibrary.createAlbumAsync('challangephotos', asset, false);
      }
      setSaving(false);
      setSaved(true);
      setTimeout(() => router.back(), 1000);
    } catch (e) {
      Alert.alert('Error', 'Failed to save photo. Please try again.');
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (step === 'camera') {
    return (
      <CameraStep
        onCapture={handleCapture}
        onClose={() => router.back()}
      />
    );
  }

  return (
    <PreviewStep
      photoUri={photoUri!}
      captureRef={previewRef}
      onRetake={() => setStep('camera')}
      onSave={handleSave}
      saving={saving}
      saved={saved}
      dayNumber={dayNumber}
      challengeName={challenge?.name ?? 'Challenge'}
      completedTasks={completedTasks}
    />
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const iconBtn = {
  width: 40,
  height: 40,
  borderRadius: 40,
  backgroundColor: 'rgba(0,0,0,0.45)',
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
};

const iconText = {
  fontFamily: Font.icon,
  fontSize: 22,
  lineHeight: 24,
  color: '#fff',
  includeFontPadding: false,
};

const ghostBtn = {
  paddingVertical: 16,
  borderRadius: 999,
  backgroundColor: 'rgba(255,255,255,0.15)',
  alignItems: 'center' as const,
};

const solidBtn = {
  paddingVertical: 16,
  borderRadius: 999,
  backgroundColor: '#fff',
  alignItems: 'center' as const,
};
