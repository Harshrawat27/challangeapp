import { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library/legacy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Colors, Font } from '@/constants/theme';

const NUM_COLS = 2;
const CELL_W = Dimensions.get('window').width / NUM_COLS;
const CELL_H = CELL_W * (16 / 9);

export default function GalleryScreen() {
  const isDark = useColorScheme() === 'dark';
  const T = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();

  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        setLoading(true);
        const { granted } = await MediaLibrary.requestPermissionsAsync();
        if (!granted) {
          if (!cancelled) { setPermissionDenied(true); setLoading(false); }
          return;
        }
        const album = await MediaLibrary.getAlbumAsync('challangephotos');
        if (!album) {
          if (!cancelled) setLoading(false);
          return;
        }
        const { assets: photos } = await MediaLibrary.getAssetsAsync({
          album,
          mediaType: 'photo',
          sortBy: [['creationTime', false]],
          first: 200,
        });
        if (!cancelled) { setAssets(photos); setLoading(false); }
      }
      load();
      return () => { cancelled = true; };
    }, []),
  );

  return (
    <View style={{ flex: 1, backgroundColor: T.background }}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 8 }}>
        <Text style={{
          fontFamily: Font.bodyMed,
          fontSize: 11,
          letterSpacing: 3,
          color: T.textDim,
          marginTop: 12,
        }}>
          PROGRESS
        </Text>
        <Text style={{
          fontFamily: Font.displayBlack,
          fontSize: 38,
          color: T.text,
          letterSpacing: -1.4,
          lineHeight: 42,
          marginTop: 6,
          marginBottom: 4,
        }}>
          Photos.
        </Text>
        {!loading && !permissionDenied && (
          <Text style={{
            fontFamily: Font.bodyReg,
            fontSize: 13,
            color: T.textDim,
            marginBottom: 8,
          }}>
            {assets.length} {assets.length === 1 ? 'photo' : 'photos'}
          </Text>
        )}
      </Animated.View>

      {/* Body */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={T.text} />
        </View>
      ) : permissionDenied ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 }}>
          <Text style={{ fontFamily: Font.icon, fontSize: 48, color: T.textDim, includeFontPadding: false }}>
            photo_library
          </Text>
          <Text style={{ fontFamily: Font.displaySemi, fontSize: 18, color: T.text, textAlign: 'center' }}>
            Photo access needed
          </Text>
          <Text style={{ fontFamily: Font.bodyReg, fontSize: 14, color: T.textDim, textAlign: 'center', lineHeight: 20 }}>
            Enable photo library access in Settings to view your progress photos.
          </Text>
        </View>
      ) : assets.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 }}>
          <Text style={{ fontFamily: Font.icon, fontSize: 48, color: T.textDim, includeFontPadding: false }}>
            photo_camera
          </Text>
          <Text style={{ fontFamily: Font.displaySemi, fontSize: 18, color: T.text, textAlign: 'center' }}>
            No photos yet
          </Text>
          <Text style={{ fontFamily: Font.bodyReg, fontSize: 14, color: T.textDim, textAlign: 'center', lineHeight: 20 }}>
            Tap + to take your first progress photo.
          </Text>
        </View>
      ) : (
        <FlatList
          data={assets}
          keyExtractor={item => item.id}
          numColumns={NUM_COLS}
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => router.push(`/photo-viewer?index=${index}`)}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
              <View style={{ width: CELL_W, height: CELL_H }}>
                <Image
                  source={{ uri: item.uri }}
                  style={{ width: CELL_W, height: CELL_H }}
                  contentFit='cover'
                />
              </View>
            </Pressable>
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        />
      )}
    </View>
  );
}
