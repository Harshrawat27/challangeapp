import React, { useRef, useState } from 'react';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Font } from '@/constants/theme';
import { useScanMeal, useSaveMeal, type MealScanResult } from '@/lib/convex-api';
import { localDateString } from '@/lib/tasks';

type Step = 'camera' | 'analyzing' | 'confirm';

// ─── Camera step ─────────────────────────────────────────────────────────────

function CameraStep({
  onCapture,
  onPickFromLibrary,
  onClose,
}: {
  onCapture: (uri: string, base64: string) => void;
  onPickFromLibrary: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<'front' | 'back'>('back');

  const takePicture = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.4, base64: true });
    if (photo && photo.base64) onCapture(photo.uri, photo.base64);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing} />

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
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: Font.bodySemi, fontSize: 14, color: '#fff' }}>
            Scan Meal
          </Text>
        </View>
        <Pressable onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')} hitSlop={12}>
          <View style={iconBtn}>
            <Text style={iconText}>flip_camera_ios</Text>
          </View>
        </Pressable>
      </View>

      {/* Bottom row: gallery button left, shutter centre, spacer right */}
      <View style={{
        position: 'absolute',
        bottom: insets.bottom + 40,
        left: 0, right: 0,
        alignItems: 'center',
      }}>
        <Text style={{
          fontFamily: Font.bodyReg, fontSize: 13, color: 'rgba(255,255,255,0.55)',
          marginBottom: 20, textAlign: 'center', paddingHorizontal: 40,
        }}>
          Point at your meal — we'll estimate the nutrition automatically
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 40 }}>
          {/* Gallery picker */}
          <Pressable onPress={onPickFromLibrary} hitSlop={12} style={{ flex: 1, alignItems: 'flex-start' }}>
            <View style={iconBtn}>
              <Text style={iconText}>photo_library</Text>
            </View>
          </Pressable>

          {/* Shutter */}
          <Pressable onPress={takePicture} hitSlop={8}>
            <View style={{
              width: 76, height: 76, borderRadius: 76,
              borderWidth: 4, borderColor: '#fff',
              justifyContent: 'center', alignItems: 'center',
            }}>
              <View style={{ width: 60, height: 60, borderRadius: 60, backgroundColor: '#fff' }} />
            </View>
          </Pressable>

          {/* Spacer to keep shutter centred */}
          <View style={{ flex: 1 }} />
        </View>
      </View>
    </View>
  );
}

// ─── Analyzing step ───────────────────────────────────────────────────────────

function AnalyzingStep({ photoUri }: { photoUri: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Image source={{ uri: photoUri }} style={{ flex: 1 }} contentFit='cover' />
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center', alignItems: 'center', gap: 16,
      }}>
        <ActivityIndicator size='large' color='#fff' />
        <Text style={{ fontFamily: Font.displaySemi, fontSize: 18, color: '#fff', letterSpacing: -0.3 }}>
          Analyzing meal…
        </Text>
        <Text style={{ fontFamily: Font.bodyReg, fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
          This takes a few seconds
        </Text>
      </View>
    </View>
  );
}

// ─── Confirm step ─────────────────────────────────────────────────────────────

function MacroField({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: string;
  unit: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
      <Text style={{ fontFamily: Font.bodyMed, fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.2 }}>
        {label.toUpperCase()}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType='numeric'
          returnKeyType='done'
          onSubmitEditing={Keyboard.dismiss}
          style={{
            fontFamily: Font.displayBold,
            fontSize: 22,
            color: '#fff',
            letterSpacing: -0.5,
            minWidth: 40,
            textAlign: 'center',
          }}
          selectTextOnFocus
        />
        <Text style={{ fontFamily: Font.bodyReg, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
          {unit}
        </Text>
      </View>
    </View>
  );
}

function ConfirmStep({
  photoUri,
  result,
  saving,
  onRetake,
  onSave,
}: {
  photoUri: string;
  result: MealScanResult;
  saving: boolean;
  onRetake: () => void;
  onSave: (data: MealScanResult) => void;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(result.name);
  const [calories, setCalories] = useState(String(result.calories));
  const [protein, setProtein] = useState(String(result.protein));
  const [carbs, setCarbs] = useState(String(result.carbs));
  const [fat, setFat] = useState(String(result.fat));

  const handleSave = () => {
    onSave({
      name: name.trim() || 'Meal',
      calories: parseInt(calories, 10) || 0,
      protein: parseInt(protein, 10) || 0,
      carbs: parseInt(carbs, 10) || 0,
      fat: parseInt(fat, 10) || 0,
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#000' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          {/* Photo shrinks to fill remaining space above the card */}
          <Image source={{ uri: photoUri }} style={{ flex: 1 }} contentFit='cover' />
        </View>
      </TouchableWithoutFeedback>

      {/* Top controls — stay pinned at top, unaffected by keyboard */}
      <View style={{
        position: 'absolute',
        top: insets.top + 12,
        left: 16,
        right: 16,
        flexDirection: 'row',
        gap: 12,
      }}>
        <Pressable onPress={onRetake} disabled={saving} style={{ flex: 1 }}>
          <View style={[ghostBtn, saving && { opacity: 0.4 }]}>
            <Text style={{ fontFamily: Font.bodySemi, fontSize: 15, color: '#fff' }}>Retake</Text>
          </View>
        </Pressable>
        <Pressable onPress={handleSave} disabled={saving} style={{ flex: 1 }}>
          <View style={[solidBtn, saving && { opacity: 0.4 }]}>
            {saving
              ? <ActivityIndicator color='#000' />
              : <Text style={{ fontFamily: Font.bodySemi, fontSize: 15, color: '#000' }}>Save Meal</Text>
            }
          </View>
        </Pressable>
      </View>

      {/* Nutrition card — in normal flow so KeyboardAvoidingView pushes it up */}
      <View style={{
        backgroundColor: 'rgba(0,0,0,0.82)',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: insets.bottom + 20,
        gap: 14,
      }}>
        {/* Meal name */}
        <TextInput
          value={name}
          onChangeText={setName}
          style={{
            fontFamily: Font.displayBold,
            fontSize: 20,
            color: '#fff',
            letterSpacing: -0.4,
          }}
          placeholder='Meal name'
          placeholderTextColor='rgba(255,255,255,0.3)'
          returnKeyType='done'
          onSubmitEditing={Keyboard.dismiss}
          selectTextOnFocus
        />

        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.12)' }} />

        {/* Calories row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontFamily: Font.icon, fontSize: 18, color: '#FB923C', includeFontPadding: false, lineHeight: 20 }}>
            local_fire_department
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <TextInput
              value={calories}
              onChangeText={setCalories}
              keyboardType='numeric'
              returnKeyType='done'
              onSubmitEditing={Keyboard.dismiss}
              style={{
                fontFamily: Font.displayBlack,
                fontSize: 32,
                color: '#fff',
                letterSpacing: -0.8,
                minWidth: 60,
              }}
              selectTextOnFocus
            />
            <Text style={{ fontFamily: Font.bodyMed, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
              kcal
            </Text>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.12)' }} />

        {/* Macros row */}
        <View style={{ flexDirection: 'row' }}>
          <MacroField label='Protein' value={protein} unit='g' onChange={setProtein} />
          <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <MacroField label='Carbs' value={carbs} unit='g' onChange={setCarbs} />
          <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <MacroField label='Fat' value={fat} unit='g' onChange={setFat} />
        </View>

        <Text style={{
          fontFamily: Font.bodyReg, fontSize: 11, color: 'rgba(255,255,255,0.3)',
          textAlign: 'center',
        }}>
          Tap any value to edit · tap photo to dismiss
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ScanScreen() {
  const [step, setStep] = useState<Step>('camera');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [result, setResult] = useState<MealScanResult | null>(null);
  const [saving, setSaving] = useState(false);

  const [camPermission, requestCamPermission] = useCameraPermissions();
  const insets = useSafeAreaInsets();

  const scanMeal = useScanMeal();
  const saveMeal = useSaveMeal();

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
            ? 'To scan your meal and estimate nutrition.'
            : 'Enable it in Settings → Privacy & Security → Camera.'}
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

  const handlePickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to pick an existing photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.4,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      const asset = result.assets[0];
      await handleCapture(asset.uri, asset.base64!);
    }
  };

  const handleCapture = async (uri: string, base64: string) => {
    setPhotoUri(uri);
    setStep('analyzing');
    try {
      const data = await scanMeal({ imageBase64: base64 });
      setResult(data);
      setStep('confirm');
    } catch (e) {
      // Analysis failed — show confirm with zeroed values so user can enter manually
      setResult({ name: 'Meal', calories: 0, protein: 0, carbs: 0, fat: 0 });
      setStep('confirm');
      Alert.alert(
        'Could not analyze',
        'AI couldn\'t read the meal. You can enter the values manually.',
        [{ text: 'OK' }],
      );
    }
  };

  const handleSave = async (data: MealScanResult) => {
    if (saving) return;
    setSaving(true);
    try {
      await saveMeal({ date: localDateString(), ...data });
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save meal. Please try again.');
      setSaving(false);
    }
  };

  if (step === 'camera') {
    return <CameraStep onCapture={handleCapture} onPickFromLibrary={handlePickFromLibrary} onClose={() => router.back()} />;
  }

  if (step === 'analyzing') {
    return <AnalyzingStep photoUri={photoUri!} />;
  }

  return (
    <ConfirmStep
      photoUri={photoUri!}
      result={result!}
      saving={saving}
      onRetake={() => setStep('camera')}
      onSave={handleSave}
    />
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const iconBtn = {
  width: 40, height: 40, borderRadius: 40,
  backgroundColor: 'rgba(0,0,0,0.45)',
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
};

const iconText = {
  fontFamily: Font.icon, fontSize: 22, lineHeight: 24,
  color: '#fff', includeFontPadding: false,
};

const ghostBtn = {
  paddingVertical: 12, borderRadius: 999,
  backgroundColor: 'rgba(255,255,255,0.15)',
  alignItems: 'center' as const,
};

const solidBtn = {
  paddingVertical: 12, borderRadius: 999,
  backgroundColor: '#fff',
  alignItems: 'center' as const,
};
