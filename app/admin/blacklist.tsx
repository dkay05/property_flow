import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Modal, TextInput, FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { BrutalistCard, BrutalistButton } from '@/components/ui';
import { useData } from '@/lib/data-context';
import { BlacklistEntry } from '@/lib/types';
import { formatDate } from '@/lib/format';

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  spam: { label: 'Spam', color: Colors.yellowWarning },
  fraud: { label: 'Fraud', color: Colors.red },
  non_responsive: { label: 'Non-Responsive', color: Colors.gray },
  difficult_client: { label: 'Difficult Client', color: Colors.blue },
  competitive: { label: 'Competitor', color: Colors.charcoal },
  other: { label: 'Other', color: Colors.sage },
};

function AddToBlacklistModal({ onClose }: { onClose: () => void }) {
  const { addToBlacklist } = useData();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [reason, setReason] = useState<BlacklistEntry['reason']>('spam');
  const [description, setDescription] = useState('');

  const handleAdd = async () => {
    if (!phone.trim() && !email.trim() && !clientName.trim()) return;
    await addToBlacklist({
      phoneNumber: phone.trim() || undefined,
      email: email.trim() || undefined,
      clientName: clientName.trim() || undefined,
      reason, reasonDescription: description.trim() || undefined,
      blockedBy: 'Admin', isActive: true,
    });
    onClose();
  };

  return (
    <Modal visible animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add to Blacklist</Text>
            <Pressable onPress={onClose}>
              <Feather name="x" size={22} color={Colors.black} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {[
              { label: 'Phone Number', value: phone, set: setPhone, placeholder: '+91 XXXXXXXXXX', keyboard: 'phone-pad' as const },
              { label: 'Email', value: email, set: setEmail, placeholder: 'example@email.com', keyboard: 'email-address' as const },
              { label: 'Client Name', value: clientName, set: setClientName, placeholder: 'Full name', keyboard: 'default' as const },
            ].map(field => (
              <View key={field.label} style={styles.formField}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <TextInput
                  value={field.value}
                  onChangeText={field.set}
                  placeholder={field.placeholder}
                  placeholderTextColor={Colors.gray}
                  keyboardType={field.keyboard}
                  style={styles.fieldInput}
                />
              </View>
            ))}

            <Text style={styles.fieldLabel}>Reason *</Text>
            <View style={styles.reasonGrid}>
              {Object.entries(REASON_LABELS).map(([key, val]) => (
                <Pressable
                  key={key}
                  onPress={() => setReason(key as BlacklistEntry['reason'])}
                  style={[
                    styles.reasonOption,
                    reason === key && { backgroundColor: val.color, borderColor: Colors.black },
                  ]}
                >
                  <Text style={[styles.reasonOptionText, reason === key && { color: Colors.white }]}>
                    {val.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Description (optional)</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Additional details..."
                placeholderTextColor={Colors.gray}
                multiline
                numberOfLines={3}
                style={[styles.fieldInput, { minHeight: 70, textAlignVertical: 'top' }]}
              />
            </View>

            <BrutalistButton
              title="Block Entry"
              onPress={handleAdd}
              variant="danger"
              icon="slash"
              disabled={!phone.trim() && !email.trim() && !clientName.trim()}
              style={{ marginTop: 10, marginBottom: 20 }}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function BlacklistScreen() {
  const insets = useSafeAreaInsets();
  const { blacklist, removeFromBlacklist } = useData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const filtered = blacklist.filter(entry => {
    if (filter === 'active' && !entry.isActive) return false;
    if (filter === 'inactive' && entry.isActive) return false;
    if (search) {
      const q = search.toLowerCase();
      return (entry.clientName || '').toLowerCase().includes(q) ||
        (entry.phoneNumber || '').includes(q) ||
        (entry.email || '').toLowerCase().includes(q);
    }
    return true;
  });

  const handleUnblock = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await removeFromBlacklist(id);
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.black} />
        </Pressable>
        <Text style={styles.title}>Blacklist Manager</Text>
        <Pressable
          style={styles.addBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowAddModal(true);
          }}
        >
          <Feather name="plus" size={18} color={Colors.black} />
        </Pressable>
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statVal}>{blacklist.filter(b => b.isActive).length}</Text>
          <Text style={styles.statLbl}>Active Blocks</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statVal}>{blacklist.filter(b => b.reason === 'fraud').length}</Text>
          <Text style={styles.statLbl}>Fraud Cases</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statVal}>{blacklist.filter(b => b.reason === 'spam').length}</Text>
          <Text style={styles.statLbl}>Spam</Text>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Feather name="search" size={16} color={Colors.gray} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, phone, email..."
          placeholderTextColor={Colors.gray}
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Feather name="x" size={16} color={Colors.gray} />
          </Pressable>
        )}
      </View>

      <View style={styles.filterRow}>
        {['all', 'active', 'inactive'].map(f => (
          <Pressable
            key={f}
            onPress={() => setFilter(f as any)}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
          >
            <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === 'web' ? 34 : 100 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="shield" size={48} color={Colors.lightGray} />
            <Text style={styles.emptyTitle}>No entries found</Text>
            <Text style={styles.emptySubtitle}>Add spam callers or fraud clients to block them</Text>
          </View>
        }
        renderItem={({ item }) => {
          const reasonInfo = REASON_LABELS[item.reason] || { label: item.reason, color: Colors.gray };
          return (
            <BrutalistCard style={[styles.entryCard, !item.isActive && styles.inactiveCard]}>
              <View style={styles.entryHeader}>
                <View style={[styles.blockIcon, { backgroundColor: item.isActive ? Colors.red : Colors.gray }]}>
                  <Feather name="slash" size={20} color={Colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryName}>{item.clientName || 'Unknown'}</Text>
                  {item.phoneNumber && (
                    <Text style={styles.entryDetail}>
                      <Feather name="phone" size={11} color={Colors.gray} /> {item.phoneNumber}
                    </Text>
                  )}
                  {item.email && (
                    <Text style={styles.entryDetail}>
                      <Feather name="mail" size={11} color={Colors.gray} /> {item.email}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[styles.reasonBadge, { backgroundColor: reasonInfo.color }]}>
                    <Text style={styles.reasonBadgeText}>{reasonInfo.label}</Text>
                  </View>
                  {!item.isActive && (
                    <View style={styles.unblockBadge}>
                      <Text style={styles.unblockBadgeText}>UNBLOCKED</Text>
                    </View>
                  )}
                </View>
              </View>

              {item.reasonDescription && (
                <Text style={styles.entryDesc}>{item.reasonDescription}</Text>
              )}

              <View style={styles.entryFooter}>
                <View>
                  <Text style={styles.entryMeta}>Blocked by {item.blockedBy}</Text>
                  <Text style={styles.entryMeta}>{formatDate(item.blockedAt)}</Text>
                </View>
                {item.isActive && (
                  <Pressable onPress={() => handleUnblock(item.id)} style={styles.unblockBtn}>
                    <Feather name="unlock" size={14} color={Colors.charcoal} />
                    <Text style={styles.unblockBtnText}>Unblock</Text>
                  </Pressable>
                )}
              </View>
            </BrutalistCard>
          );
        }}
      />

      {showAddModal && <AddToBlacklistModal onClose={() => setShowAddModal(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: Colors.black,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontFamily: 'DMSans_800ExtraBold', fontSize: 20, color: Colors.black },
  addBtn: {
    width: 40, height: 40, borderWidth: 2, borderColor: Colors.black,
    backgroundColor: Colors.red, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.black, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3,
  },
  statsBar: {
    flexDirection: 'row', backgroundColor: Colors.charcoal, paddingVertical: 14, paddingHorizontal: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontFamily: 'DMSans_800ExtraBold', fontSize: 22, color: Colors.white },
  statLbl: { fontFamily: 'DMSans_500Medium', fontSize: 10, color: Colors.gray, marginTop: 2 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginTop: 12, marginBottom: 8,
    borderWidth: 2, borderColor: Colors.black, padding: 12, backgroundColor: Colors.lightGray,
  },
  searchInput: { flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.black },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderWidth: 2, borderColor: Colors.black, backgroundColor: Colors.white },
  filterBtnActive: { backgroundColor: Colors.charcoal },
  filterBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.black },
  filterBtnTextActive: { color: Colors.white },
  listContent: { paddingHorizontal: 16 },
  entryCard: { marginBottom: 12 },
  inactiveCard: { opacity: 0.6 },
  entryHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  blockIcon: {
    width: 42, height: 42, borderWidth: 2, borderColor: Colors.black,
    alignItems: 'center', justifyContent: 'center',
  },
  entryName: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.black },
  entryDetail: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.gray, marginTop: 2 },
  reasonBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1.5, borderColor: Colors.black,
  },
  reasonBadgeText: { fontFamily: 'DMSans_700Bold', fontSize: 9, color: Colors.white },
  unblockBadge: { backgroundColor: Colors.sage, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: Colors.black },
  unblockBadgeText: { fontFamily: 'DMSans_700Bold', fontSize: 8, color: Colors.black },
  entryDesc: {
    fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.gray,
    backgroundColor: Colors.lightGray, padding: 8, marginBottom: 8,
  },
  entryFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryMeta: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.gray },
  unblockBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: Colors.black,
    backgroundColor: Colors.sage,
  },
  unblockBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.black },
  empty: { alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.black },
  emptySubtitle: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.gray, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.white, padding: 20, borderTopWidth: 2, borderTopColor: Colors.black, maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 18, color: Colors.black },
  formField: { marginBottom: 14 },
  fieldLabel: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.black, marginBottom: 6 },
  fieldInput: {
    borderWidth: 2, borderColor: Colors.black, padding: 12,
    fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.black,
  },
  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14, marginTop: 6 },
  reasonOption: {
    paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: Colors.black,
    backgroundColor: Colors.white,
  },
  reasonOptionText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.black },
});
