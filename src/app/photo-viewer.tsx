import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Font } from '@/constants/theme';

export default function PhotoViewerScreen() {
  const { index: indexParam } = useLocalSearchParams<{ index: string }>();
  const initialIndex = parseInt(indexParam ?? '0', 10);

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const listRef = useRef<FlatList>(null);
  const hasScrolled = useRef(false);

  useEffect(() => {
    async function load() {
      const album = await MediaLibrary.getAlbumAsync('challangephotos');
      if (!album) { setLoading(false); return; }
      const { assets: photos } = await MediaLibrary.getAssetsAsync({
        album,
        mediaType: 'photo',
        sortBy: [['creationTime', false]],
        first: 200,
      });
      setAssets(photos);
      setLoading(false);
    }
    load();
  }, []);

  // Scroll to initial index once data is loaded
  useEffect(() => {
    if (!loading && assets.length > 0 && !hasScrolled.current) {
      hasScrolled.current = true;
      if (initialIndex > 0) {
        listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }
    }
  }, [loading, assets.length, initialIndex]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    if (viewableItems[0]?.index != null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 });

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color='#fff' />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Header */}
      <View style={{
        position: 'absolute',
        top: insets.top + 12,
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10,
      }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <View style={{
            width: 40, height: 40, borderRadius: 40,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center', alignItems: 'center',
          }}>
            <Text style={{
              fontFamily: Font.icon, fontSize: 22, lineHeight: 24,
              color: '#fff', includeFontPadding: false,
            }}>
              close
            </Text>
          </View>
        </Pressable>

        <Text style={{
          fontFamily: Font.bodySemi, fontSize: 14,
          color: 'rgba(255,255,255,0.7)',
        }}>
          {currentIndex + 1} / {assets.length}
        </Text>

        {/* Spacer to keep counter centred */}
        <View style={{ width: 40 }} />
      </View>

      {/* Pager */}
      <FlatList
        ref={listRef}
        data={assets}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        renderItem={({ item }) => (
          <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
            <Image
              source={{ uri: item.uri }}
              style={{ width, height }}
              contentFit='contain'
            />
          </View>
        )}
      />
    </View>
  );
}
