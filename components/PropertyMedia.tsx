import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Alert, Linking, ScrollView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { apiPost, resolveMediaUrl } from '@/lib/api';
import { extractYouTubeId, youTubeThumbnail, youTubeWatchUrl } from '@/lib/youtube';

function extOf(uri: string, mimeType?: string): string {
  if (mimeType?.includes('/')) {
    const fromMime = mimeType.split('/')[1].toLowerCase();
    if (fromMime) return fromMime === 'jpeg' ? 'jpg' : fromMime;
  }
  const match = uri.split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : 'jpg';
}

/**
 * The picker fills in `base64` on native, but on web it can come back empty and
 * the uri is a blob/data url instead, so fall back to reading the uri.
 */
async function assetToBase64(asset: ImagePicker.ImagePickerAsset): Promise<string | null> {
  if (asset.base64) return asset.base64;
  if (!asset.uri) return null;

  if (asset.uri.startsWith('data:')) {
    return asset.uri.slice(asset.uri.indexOf(',') + 1);
  }

  const blob = await (await fetch(asset.uri)).blob();
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

export function openYouTube(url?: string | null) {
  const watch = youTubeWatchUrl(url);
  if (watch) Linking.openURL(watch);
}

/**
 * Picks images from the library, uploads each to the server and reports back
 * the stored paths. Also takes a YouTube link and previews its thumbnail.
 */
export function MediaEditor({
  images,
  videoUrl,
  onChangeImages,
  onChangeVideoUrl,
}: {
  images: string[];
  videoUrl: string;
  onChangeImages: (images: string[]) => void;
  onChangeVideoUrl: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const videoId = extractYouTubeId(videoUrl);
  const thumb = youTubeThumbnail(videoUrl);
  const linkTyped = videoUrl.trim().length > 0;

  const handlePickImages = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo access to upload property images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.7,
        base64: true,
      });
      if (result.canceled) return;

      setUploading(true);
      const uploaded: string[] = [];

      for (const asset of result.assets) {
        const base64 = await assetToBase64(asset);
        if (!base64) continue;
        const { url } = await apiPost<{ url: string }>('/api/uploads', {
          data: base64,
          ext: extOf(asset.uri, asset.mimeType),
        });
        uploaded.push(url);
      }

      if (uploaded.length) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onChangeImages([...images, ...uploaded]);
      }
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Could not upload image');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (url: string) => onChangeImages(images.filter(i => i !== url));

  return (
    <View>
      <Text style={styles.sectionLabel}>Photos</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
        {images.map(url => (
          <View key={url} style={styles.thumbBox}>
            <Image source={{ uri: resolveMediaUrl(url) }} style={styles.thumbImage} contentFit="cover" transition={150} />
            <Pressable onPress={() => removeImage(url)} style={styles.removeBtn} hitSlop={8}>
              <Feather name="x" size={14} color={Colors.white} />
            </Pressable>
          </View>
        ))}

        <Pressable onPress={handlePickImages} disabled={uploading} style={[styles.addBox, uploading && { opacity: 0.6 }]}>
          {uploading ? (
            <ActivityIndicator color={Colors.black} />
          ) : (
            <>
              <Feather name="camera" size={22} color={Colors.black} />
              <Text style={styles.addBoxText}>Add</Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      <Text style={styles.sectionLabel}>YouTube Video Link</Text>
      <TextInput
        value={videoUrl}
        onChangeText={onChangeVideoUrl}
        placeholder="https://youtube.com/watch?v=..."
        placeholderTextColor={Colors.gray}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        style={styles.input}
      />

      {linkTyped && !videoId && (
        <View style={styles.warnRow}>
          <Feather name="alert-circle" size={13} color={Colors.red} />
          <Text style={styles.warnText}>That does not look like a YouTube link</Text>
        </View>
      )}

      {thumb && (
        <View style={styles.previewWrap}>
          <Text style={styles.previewLabel}>VIDEO PREVIEW</Text>
          <Pressable onPress={() => openYouTube(videoUrl)} style={styles.videoBox}>
            <Image source={{ uri: thumb }} style={styles.videoImage} contentFit="cover" transition={150} />
            <View style={styles.playOverlay}>
              <View style={styles.playBtn}>
                <Feather name="play" size={20} color={Colors.white} />
              </View>
            </View>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/** Read-only gallery used on the property detail screen. */
export function MediaGallery({ images, videoUrl }: { images?: string[]; videoUrl?: string }) {
  const thumb = youTubeThumbnail(videoUrl);
  const photos = images ?? [];
  if (!photos.length && !thumb) return null;

  return (
    <View>
      {thumb && (
        <Pressable onPress={() => openYouTube(videoUrl)} style={styles.detailVideoBox}>
          <Image source={{ uri: thumb }} style={styles.detailVideoImage} contentFit="cover" transition={150} />
          <View style={styles.playOverlay}>
            <View style={styles.playBtn}>
              <Feather name="play" size={24} color={Colors.white} />
            </View>
          </View>
          <View style={styles.videoTag}>
            <Feather name="youtube" size={12} color={Colors.white} />
            <Text style={styles.videoTagText}>WATCH VIDEO</Text>
          </View>
        </Pressable>
      )}

      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
          {photos.map(url => (
            <Image
              key={url}
              source={{ uri: resolveMediaUrl(url) }}
              style={styles.detailThumb}
              contentFit="cover"
              transition={150}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

/** Small square used on the property list card. */
export function MediaThumbnail({
  images,
  videoUrl,
  size = 44,
}: {
  images?: string[];
  videoUrl?: string;
  size?: number;
}) {
  const photo = images?.[0];
  const videoThumb = youTubeThumbnail(videoUrl);
  const uri = photo ? resolveMediaUrl(photo) : videoThumb;
  if (!uri) return null;

  return (
    <View style={[styles.cardThumb, { width: size, height: size }]}>
      <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
      {!photo && videoThumb && (
        <View style={styles.cardPlayBadge}>
          <Feather name="play" size={10} color={Colors.white} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.black,
    marginTop: 14,
    marginBottom: 8,
  },
  thumbRow: { gap: 10, paddingRight: 4 },
  thumbBox: {
    width: 84,
    height: 84,
    borderWidth: 2,
    borderColor: Colors.black,
    backgroundColor: Colors.lightGray,
  },
  thumbImage: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.black,
    backgroundColor: Colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBox: {
    width: 84,
    height: 84,
    borderWidth: 2,
    borderColor: Colors.black,
    borderStyle: 'dashed',
    backgroundColor: Colors.primaryYellow,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addBoxText: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: Colors.black },
  input: {
    borderWidth: 2,
    borderColor: Colors.black,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 12,
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.black,
    backgroundColor: Colors.white,
  },
  warnRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  warnText: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.red },
  previewWrap: { marginTop: 12 },
  previewLabel: {
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 11,
    color: Colors.gray,
    letterSpacing: 1,
    marginBottom: 6,
  },
  videoBox: {
    height: 170,
    borderWidth: 2,
    borderColor: Colors.black,
    backgroundColor: Colors.lightGray,
  },
  videoImage: { width: '100%', height: '100%' },
  detailVideoBox: {
    height: 190,
    borderWidth: 2,
    borderColor: Colors.black,
    backgroundColor: Colors.lightGray,
    marginBottom: 12,
  },
  detailVideoImage: { width: '100%', height: '100%' },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  playBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: Colors.white,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTag: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.red,
    borderWidth: 2,
    borderColor: Colors.black,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  videoTagText: { fontFamily: 'DMSans_700Bold', fontSize: 10, color: Colors.white, letterSpacing: 0.5 },
  detailThumb: {
    width: 110,
    height: 90,
    borderWidth: 2,
    borderColor: Colors.black,
    backgroundColor: Colors.lightGray,
  },
  cardThumb: {
    borderWidth: 2,
    borderColor: Colors.black,
    backgroundColor: Colors.lightGray,
    overflow: 'hidden',
  },
  cardPlayBadge: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
});
