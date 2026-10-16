import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Linking, Modal, TextInput, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useData } from '@/lib/data-context';
import { BrutalistCard, BrutalistButton, StatusBadge, EmptyState } from '@/components/ui';
import { formatCurrency, furnishingLabel, formatDate } from '@/lib/format';
import { PropertyStatus, PropertyStatusHistory } from '@/lib/types';
import { MediaEditor, MediaGallery } from '@/components/PropertyMedia';
import { shareProperty, propertyShareUrl } from '@/lib/share';
import { formatCurrency as fmtPrice } from '@/lib/format';

const STATUS_OPTIONS: { status: PropertyStatus; label: string; color: string; icon: string }[] = [
  { status: 'available', label: 'Available', color: Colors.green, icon: 'check-circle' },
  { status: 'sold', label: 'Sold', color: Colors.charcoal, icon: 'dollar-sign' },
  { status: 'rented_out', label: 'Rented Out', color: Colors.blue, icon: 'key' },
  { status: 'on_hold', label: 'On Hold', color: Colors.yellowWarning, icon: 'pause-circle' },
  { status: 'inactive', label: 'Inactive', color: Colors.gray, icon: 'x-circle' },
];

function StatusToggleModal({
  currentStatus,
  onClose,
  onStatusChange,
}: {
  currentStatus: PropertyStatus;
  onClose: () => void;
  onStatusChange: (status: PropertyStatus, reason: string) => void;
}) {
  const [selected, setSelected] = useState<PropertyStatus>(currentStatus);
  const [reason, setReason] = useState('');

  return (
    <Modal visible animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Change Property Status</Text>
            <Pressable onPress={onClose}>
              <Feather name="x" size={22} color={Colors.black} />
            </Pressable>
          </View>

          <View style={styles.statusGrid}>
            {STATUS_OPTIONS.map(opt => (
              <Pressable
                key={opt.status}
                onPress={() => setSelected(opt.status)}
                style={[
                  styles.statusOption,
                  selected === opt.status && { borderColor: opt.color, borderWidth: 3 },
                  { backgroundColor: selected === opt.status ? opt.color + '22' : Colors.white },
                ]}
              >
                <Feather name={opt.icon as any} size={24} color={opt.color} />
                <Text style={[styles.statusOptionText, { color: opt.color }]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.reasonLabel}>Reason / Notes (optional)</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Sold at 45L, Registration done..."
            placeholderTextColor={Colors.gray}
            multiline
            numberOfLines={3}
            style={styles.reasonInput}
          />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <BrutalistButton title="Cancel" onPress={onClose} variant="secondary" style={{ flex: 1 }} />
            <BrutalistButton
              title="Update Status"
              onPress={() => {
                if (selected === currentStatus) { onClose(); return; }
                onStatusChange(selected, reason);
              }}
              variant="charcoal"
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function StatusHistoryItem({ item }: { item: PropertyStatusHistory }) {
  const from = STATUS_OPTIONS.find(s => s.status === item.previousStatus);
  const to = STATUS_OPTIONS.find(s => s.status === item.newStatus);

  return (
    <View style={styles.historyItem}>
      <View style={[styles.historyDot, { backgroundColor: to?.color || Colors.gray }]} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.historyFrom}>{from?.label || item.previousStatus}</Text>
          <Feather name="arrow-right" size={12} color={Colors.gray} />
          <Text style={[styles.historyTo, { color: to?.color || Colors.gray }]}>{to?.label || item.newStatus}</Text>
        </View>
        {item.reason && <Text style={styles.historyReason}>{item.reason}</Text>}
        <Text style={styles.historyMeta}>By {item.changedBy} · {formatDate(item.changedAt)}</Text>
      </View>
    </View>
  );
}

function MediaModal({
  initialImages,
  initialVideoUrl,
  onClose,
  onSave,
}: {
  initialImages: string[];
  initialVideoUrl: string;
  onClose: () => void;
  onSave: (images: string[], videoUrl: string) => Promise<void>;
}) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(images, videoUrl.trim());
    } catch (e: any) {
      Alert.alert('Could not save media', e?.message || 'Please try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Photos & Video</Text>
            <Pressable onPress={onClose}>
              <Feather name="x" size={22} color={Colors.black} />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
            <MediaEditor
              images={images}
              videoUrl={videoUrl}
              onChangeImages={setImages}
              onChangeVideoUrl={setVideoUrl}
            />
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <BrutalistButton title="Cancel" onPress={onClose} variant="secondary" style={{ flex: 1 }} />
            <BrutalistButton title="Save Media" onPress={handleSave} variant="charcoal" loading={saving} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { getPropertyById, changePropertyStatus, getStatusHistoryForProperty, updateProperty } = useData();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [shareNote, setShareNote] = useState('');

  const property = getPropertyById(id);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const statusHistory = property ? getStatusHistoryForProperty(id) : [];

  if (!property) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <EmptyState icon="alert-circle" title="Property not found" />
      </View>
    );
  }

  const handleCallOwner = () => {
    if (property.ownerPhone) Linking.openURL(`tel:${property.ownerPhone}`);
  };

  const handleStatusChange = async (newStatus: PropertyStatus, reason: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await changePropertyStatus(id, newStatus, reason);
    setShowStatusModal(false);
  };

  const handleSaveMedia = async (images: string[], videoUrl: string) => {
    await updateProperty(id, { images, videoUrl: videoUrl || undefined });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowMediaModal(false);
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await shareProperty({
        propertyId: id,
        title: property.address,
        message: `${property.address}, ${property.area} — ${fmtPrice(property.price)}`,
      });
      if (result === 'copied') {
        setShareNote('Link copied to clipboard');
        setTimeout(() => setShareNote(''), 2500);
      } else if (result === 'unavailable') {
        Alert.alert('Share link', propertyShareUrl(id));
      }
    } catch (e: any) {
      Alert.alert('Could not share', e?.message || 'Please try again');
    }
  };

  const hasMedia = !!(property.images?.length || property.videoUrl);
  const currentStatusOpt = STATUS_OPTIONS.find(s => s.status === property.status);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.black} />
        </Pressable>
        <Text style={styles.topTitle}>Property</Text>
        <StatusBadge status={property.status} small />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons
              name={property.propertyType === 'commercial' ? 'business' : property.propertyType === 'land' ? 'map' : 'home'}
              size={48}
              color={Colors.black}
            />
          </View>
          <Text style={styles.heroPrice}>{formatCurrency(property.price)}</Text>
          <Text style={styles.heroAddress}>{property.address}</Text>
          <Text style={styles.heroArea}>{property.area}, {property.city}</Text>
        </View>

        <BrutalistCard style={[styles.statusCard, { borderLeftColor: currentStatusOpt?.color, borderLeftWidth: 6 }]}>
          <View style={styles.statusCardRow}>
            <View>
              <Text style={styles.statusCardLabel}>CURRENT STATUS</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Feather name={currentStatusOpt?.icon as any || 'circle'} size={20} color={currentStatusOpt?.color || Colors.gray} />
                <Text style={[styles.statusCardValue, { color: currentStatusOpt?.color || Colors.black }]}>
                  {currentStatusOpt?.label || property.status}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowStatusModal(true);
              }}
              style={styles.changeStatusBtn}
            >
              <Feather name="edit-3" size={14} color={Colors.white} />
              <Text style={styles.changeStatusText}>Change</Text>
            </Pressable>
          </View>
          {statusHistory.length > 0 && (
            <Text style={styles.historyCount}>{statusHistory.length} status change{statusHistory.length > 1 ? 's' : ''} recorded</Text>
          )}
        </BrutalistCard>

        <BrutalistCard style={styles.detailCard}>
          <View style={styles.mediaHeaderRow}>
            <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>PHOTOS & VIDEO</Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowMediaModal(true);
              }}
              style={styles.mediaEditBtn}
            >
              <Feather name={hasMedia ? 'edit-3' : 'plus'} size={13} color={Colors.black} />
              <Text style={styles.mediaEditText}>{hasMedia ? 'Edit' : 'Add'}</Text>
            </Pressable>
          </View>

          {hasMedia ? (
            <View style={{ marginTop: 12 }}>
              <MediaGallery images={property.images} videoUrl={property.videoUrl} />
            </View>
          ) : (
            <Text style={styles.mediaEmpty}>No photos or video yet. Tap Add to upload images or paste a YouTube link.</Text>
          )}
        </BrutalistCard>

        <BrutalistCard style={styles.detailCard}>
          <Text style={styles.sectionLabel}>PROPERTY DETAILS</Text>
          <View style={styles.detailGrid}>
            {property.bedrooms && (
              <View style={styles.detailItem}>
                <Feather name="home" size={18} color={Colors.charcoal} />
                <Text style={styles.detailValue}>{property.bedrooms} BHK</Text>
                <Text style={styles.detailLabel}>Bedrooms</Text>
              </View>
            )}
            {property.bathrooms && (
              <View style={styles.detailItem}>
                <Feather name="droplet" size={18} color={Colors.charcoal} />
                <Text style={styles.detailValue}>{property.bathrooms}</Text>
                <Text style={styles.detailLabel}>Bathrooms</Text>
              </View>
            )}
            {property.carpetArea && (
              <View style={styles.detailItem}>
                <Feather name="maximize" size={18} color={Colors.charcoal} />
                <Text style={styles.detailValue}>{property.carpetArea}</Text>
                <Text style={styles.detailLabel}>Sq Ft</Text>
              </View>
            )}
            <View style={styles.detailItem}>
              <Feather name="package" size={18} color={Colors.charcoal} />
              <Text style={styles.detailValue}>{furnishingLabel(property.furnishing)}</Text>
              <Text style={styles.detailLabel}>Furnishing</Text>
            </View>
          </View>
        </BrutalistCard>

        {property.amenities.length > 0 && (
          <BrutalistCard style={styles.detailCard}>
            <Text style={styles.sectionLabel}>AMENITIES</Text>
            <View style={styles.amenitiesGrid}>
              {property.amenities.map(a => (
                <View key={a} style={styles.amenityItem}>
                  <Feather name="check" size={14} color={Colors.green} />
                  <Text style={styles.amenityText}>{a}</Text>
                </View>
              ))}
            </View>
          </BrutalistCard>
        )}

        {property.ownerName && (
          <BrutalistCard style={styles.detailCard}>
            <Text style={styles.sectionLabel}>OWNER INFO</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <View style={styles.ownerAvatar}>
                <Feather name="user" size={20} color={Colors.black} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ownerName}>{property.ownerName}</Text>
                {property.ownerPhone && <Text style={styles.ownerPhone}>{property.ownerPhone}</Text>}
              </View>
              {property.ownerPhone && (
                <BrutalistButton icon="phone" onPress={handleCallOwner} small variant="charcoal" />
              )}
            </View>
          </BrutalistCard>
        )}

        <BrutalistCard style={styles.shareCard}>
          <Text style={styles.sectionLabel}>SHARE THIS PROPERTY</Text>
          <Text style={styles.shareHint}>
            Anyone with the link can view a clean listing page — photos, video and details. No login needed.
          </Text>
          <Pressable onPress={handleShare} style={styles.shareBtn}>
            <Feather name="share-2" size={18} color={Colors.black} />
            <Text style={styles.shareBtnText}>Share Property</Text>
          </Pressable>
          {shareNote ? (
            <View style={styles.shareNoteRow}>
              <Feather name="check-circle" size={13} color={Colors.green} />
              <Text style={styles.shareNote}>{shareNote}</Text>
            </View>
          ) : null}
        </BrutalistCard>

        {statusHistory.length > 0 && (
          <BrutalistCard style={styles.detailCard}>
            <Text style={styles.sectionLabel}>STATUS HISTORY</Text>
            <View style={styles.historyList}>
              {statusHistory.slice(0, 5).map(h => (
                <StatusHistoryItem key={h.id} item={h} />
              ))}
            </View>
          </BrutalistCard>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {showMediaModal && (
        <MediaModal
          initialImages={property.images ?? []}
          initialVideoUrl={property.videoUrl ?? ''}
          onClose={() => setShowMediaModal(false)}
          onSave={handleSaveMedia}
        />
      )}

      {showStatusModal && (
        <StatusToggleModal
          currentStatus={property.status}
          onClose={() => setShowStatusModal(false)}
          onStatusChange={handleStatusChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  topBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: Colors.black, gap: 12,
  },
  backBtn: { padding: 4 },
  topTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 18, color: Colors.black, flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  heroSection: {
    alignItems: 'center', paddingVertical: 24, backgroundColor: Colors.primaryYellow,
    borderWidth: 2, borderColor: Colors.black, marginBottom: 16,
    shadowColor: Colors.black, shadowOffset: { width: 8, height: 8 }, shadowOpacity: 1, shadowRadius: 0, elevation: 8,
  },
  heroIcon: {
    width: 80, height: 80, backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.black,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  heroPrice: { fontFamily: 'DMSans_800ExtraBold', fontSize: 36, color: Colors.black, letterSpacing: -1.5 },
  heroAddress: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.black, marginTop: 4 },
  heroArea: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.charcoal, marginTop: 2 },
  statusCard: { marginBottom: 12 },
  statusCardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusCardLabel: {
    fontFamily: 'DMSans_800ExtraBold', fontSize: 11, color: Colors.gray, letterSpacing: 1,
  },
  statusCardValue: { fontFamily: 'DMSans_800ExtraBold', fontSize: 18 },
  changeStatusBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.charcoal, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 2, borderColor: Colors.black,
  },
  changeStatusText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.white },
  historyCount: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.gray, marginTop: 6 },
  detailCard: { marginBottom: 12 },
  sectionLabel: {
    fontFamily: 'DMSans_800ExtraBold', fontSize: 12, color: Colors.charcoal, letterSpacing: 1, marginBottom: 12,
  },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  detailItem: {
    width: '45%', alignItems: 'center', backgroundColor: Colors.lightGray,
    padding: 12, borderWidth: 1, borderColor: Colors.black,
  },
  detailValue: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.black, marginTop: 6 },
  detailLabel: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.gray, marginTop: 2 },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.lightGray, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.black,
  },
  amenityText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.black },
  ownerAvatar: {
    width: 44, height: 44, borderWidth: 2, borderColor: Colors.black,
    backgroundColor: Colors.sage, alignItems: 'center', justifyContent: 'center',
  },
  ownerName: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.black },
  ownerPhone: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.gray },
  historyList: { gap: 12 },
  historyItem: { flexDirection: 'row', gap: 12 },
  historyDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  historyFrom: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.gray },
  historyTo: { fontFamily: 'DMSans_700Bold', fontSize: 13 },
  historyReason: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.charcoal, marginTop: 3 },
  historyMeta: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.gray, marginTop: 2 },
  shareCard: { marginBottom: 12, backgroundColor: Colors.primaryYellow },
  shareHint: {
    fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.charcoal, marginBottom: 12,
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.black,
    paddingVertical: 13,
    shadowColor: Colors.black, shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1, shadowRadius: 0, elevation: 3,
  },
  shareBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.black },
  shareNoteRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10,
  },
  shareNote: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.charcoal },
  mediaHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mediaEditBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primaryYellow, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 2, borderColor: Colors.black,
  },
  mediaEditText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.black },
  mediaEmpty: {
    fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.gray, marginTop: 10,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.white, padding: 20, borderTopWidth: 2, borderTopColor: Colors.black,
    paddingBottom: Platform.OS === 'web' ? 34 : 40,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 18, color: Colors.black },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statusOption: {
    flex: 1, minWidth: '45%', alignItems: 'center', padding: 14, gap: 8,
    borderWidth: 2, borderColor: Colors.black,
  },
  statusOptionText: { fontFamily: 'DMSans_700Bold', fontSize: 13 },
  reasonLabel: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.black, marginBottom: 8 },
  reasonInput: {
    borderWidth: 2, borderColor: Colors.black, padding: 12, minHeight: 70,
    fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.black, textAlignVertical: 'top',
  },
});
