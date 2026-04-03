import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useData } from '@/lib/data-context';
import { BrutalistCard, StatusBadge, EmptyState } from '@/components/ui';
import { formatBudget, formatDate, statusLabel } from '@/lib/format';
import { Lead } from '@/lib/types';

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Inquiry', value: 'inquiry' },
  { label: 'Visit', value: 'site_visit' },
  { label: 'Negotiation', value: 'negotiation' },
  { label: 'Offer', value: 'offer' },
  { label: 'Deal Done', value: 'deal_done' },
  { label: 'Lost', value: 'lost' },
];

export default function LeadsScreen() {
  const insets = useSafeAreaInsets();
  const { leads } = useData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return l.name.toLowerCase().includes(q) || l.phone.includes(q) || (l.city || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [leads, search, statusFilter]);

  const renderLead = ({ item }: { item: Lead }) => (
    <Pressable onPress={() => router.push({ pathname: '/lead/[id]', params: { id: item.id } })}>
      <BrutalistCard style={styles.leadCard}>
        <View style={styles.leadRow}>
          <View style={styles.leadAvatar}>
            <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.leadName}>{item.name}</Text>
              <StatusBadge status={item.status} small />
            </View>
            <Text style={styles.leadPhone}>{item.phone}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              {item.propertyInterest && <Text style={styles.leadTag}>{item.propertyInterest}</Text>}
              {item.city && <Text style={styles.leadTag}>{item.city}</Text>}
            </View>
            <Text style={styles.leadBudget}>{formatBudget(item.budgetMin, item.budgetMax)}</Text>
          </View>
        </View>
        <View style={styles.leadFooter}>
          <Text style={styles.leadDate}>{formatDate(item.createdAt)}</Text>
          {item.assignedTo && <Text style={styles.leadAgent}>{item.assignedTo}</Text>}
          <Feather name="chevron-right" size={16} color={Colors.gray} />
        </View>
      </BrutalistCard>
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Leads</Text>
        <Pressable
          style={styles.addBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/add-lead');
          }}
        >
          <Feather name="plus" size={20} color={Colors.black} />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color={Colors.gray} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search name, phone, city..."
            placeholderTextColor={Colors.gray}
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Feather name="x" size={16} color={Colors.gray} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        horizontal
        data={STATUS_FILTERS}
        keyExtractor={item => item.value}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setStatusFilter(item.value)}
            style={[styles.filterChip, statusFilter === item.value && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, statusFilter === item.value && styles.filterTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        )}
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      />

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderLead}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        scrollEnabled={!!filtered.length}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState icon="users" title="No leads found" subtitle={search ? 'Try different search terms' : 'Add your first lead to get started'} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 12,
  },
  title: {
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 28,
    color: Colors.black,
    letterSpacing: -1,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderWidth: 2,
    borderColor: Colors.black,
    backgroundColor: Colors.primaryYellow,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  searchRow: { paddingHorizontal: 16, marginBottom: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.black,
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: Colors.black,
  },
  filterRow: { marginBottom: 12, flexGrow: 0 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: Colors.black,
    backgroundColor: Colors.white,
  },
  filterChipActive: {
    backgroundColor: Colors.charcoal,
  },
  filterText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 12,
    color: Colors.black,
  },
  filterTextActive: {
    color: Colors.white,
  },
  leadCard: { marginBottom: 10 },
  leadRow: { flexDirection: 'row', gap: 12 },
  leadAvatar: {
    width: 42,
    height: 42,
    borderWidth: 2,
    borderColor: Colors.black,
    backgroundColor: Colors.primaryYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 18,
    color: Colors.black,
  },
  leadName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: Colors.black,
  },
  leadPhone: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.gray,
    marginTop: 1,
  },
  leadTag: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: Colors.charcoal,
    backgroundColor: Colors.lightGray,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  leadBudget: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.charcoal,
    marginTop: 4,
  },
  leadFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  leadDate: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.gray,
  },
  leadAgent: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.charcoal,
    flex: 1,
    textAlign: 'right',
    marginRight: 8,
  },
});
