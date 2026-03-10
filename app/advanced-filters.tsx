import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, TextInput, Modal, FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { BrutalistCard, BrutalistButton } from '@/components/ui';
import { useData } from '@/lib/data-context';
import { formatCurrency, furnishingLabel } from '@/lib/format';
import { PropertyType, PropertyStatus, PropertyFilterCriteria } from '@/lib/types';

const PROPERTY_TYPES: { label: string; value: PropertyType }[] = [
  { label: 'Residential', value: 'residential' },
  { label: 'Commercial', value: 'commercial' },
  { label: 'Rental', value: 'rental' },
  { label: 'Land', value: 'land' },
];

const FURNISHING_OPTIONS = [
  { label: 'Furnished', value: 'furnished' },
  { label: 'Semi-Furnished', value: 'semi_furnished' },
  { label: 'Unfurnished', value: 'unfurnished' },
];

const STATUS_OPTIONS: { label: string; value: PropertyStatus }[] = [
  { label: 'Available', value: 'available' },
  { label: 'Sold', value: 'sold' },
  { label: 'Rented Out', value: 'rented_out' },
  { label: 'On Hold', value: 'on_hold' },
  { label: 'Inactive', value: 'inactive' },
];

const AMENITY_OPTIONS = ['Gym', 'Pool', 'Parking', 'Security', 'Garden', 'Clubhouse', 'Power Backup', 'Lift'];

const BEDROOM_OPTIONS = [1, 2, 3, 4, 5];

const QUICK_FILTERS: { label: string; criteria: PropertyFilterCriteria }[] = [
  { label: 'Under 30L', criteria: { maxPrice: 3000000 } },
  { label: '2BHK Bangalore', criteria: { bedrooms: 2, city: 'Bangalore' } },
  { label: 'Premium (1Cr+)', criteria: { minPrice: 10000000 } },
  { label: 'Furnished Only', criteria: { furnishing: 'furnished' } },
  { label: 'Available Now', criteria: { status: 'available' } },
];

const PRICE_RANGES = [
  { label: 'Any', min: undefined, max: undefined },
  { label: 'Under 30L', min: undefined, max: 3000000 },
  { label: '30L-50L', min: 3000000, max: 5000000 },
  { label: '50L-80L', min: 5000000, max: 8000000 },
  { label: '80L-1Cr', min: 8000000, max: 10000000 },
  { label: '1Cr+', min: 10000000, max: undefined },
];

export default function AdvancedFiltersScreen() {
  const insets = useSafeAreaInsets();
  const { getFilteredProperties, saveFilter, savedFilters, deleteFilter } = useData();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [criteria, setCriteria] = useState<PropertyFilterCriteria>({});
  const [filterName, setFilterName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState<'filter' | 'saved'>('filter');

  const results = useMemo(() => {
    if (!showResults) return [];
    return getFilteredProperties(criteria);
  }, [criteria, showResults, getFilteredProperties]);

  const toggleType = (type: PropertyType) => {
    const current = criteria.propertyTypes || [];
    const next = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
    setCriteria(prev => ({ ...prev, propertyTypes: next.length > 0 ? next : undefined }));
  };

  const toggleAmenity = (a: string) => {
    const current = criteria.amenities || [];
    const next = current.includes(a) ? current.filter(x => x !== a) : [...current, a];
    setCriteria(prev => ({ ...prev, amenities: next.length > 0 ? next : undefined }));
  };

  const setPriceRange = (min?: number, max?: number) => {
    setCriteria(prev => ({ ...prev, minPrice: min, maxPrice: max }));
  };

  const applyQuickFilter = (qf: typeof QUICK_FILTERS[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCriteria(qf.criteria);
    setShowResults(true);
  };

  const applyFilter = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowResults(true);
  };

  const clearAll = () => {
    setCriteria({});
    setShowResults(false);
  };

  const handleSaveFilter = async () => {
    if (!filterName.trim()) return;
    await saveFilter({ name: filterName.trim(), filterType: 'property', criteria });
    setFilterName('');
    setShowSaveModal(false);
  };

  const loadSavedFilter = (sf: typeof savedFilters[0]) => {
    setCriteria(sf.criteria as PropertyFilterCriteria);
    setShowResults(true);
    setActiveTab('filter');
  };

  const activeFilterCount = [
    criteria.propertyTypes?.length,
    criteria.minPrice || criteria.maxPrice ? 1 : 0,
    criteria.bedrooms ? 1 : 0,
    criteria.furnishing ? 1 : 0,
    criteria.amenities?.length,
    criteria.city ? 1 : 0,
    criteria.status ? 1 : 0,
  ].reduce((sum: number, v) => sum + (v || 0), 0);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.black} />
        </Pressable>
        <Text style={styles.title}>Advanced Filters</Text>
        {activeFilterCount > 0 && (
          <View style={styles.filterCountBadge}>
            <Text style={styles.filterCountText}>{activeFilterCount}</Text>
          </View>
        )}
        <Pressable onPress={clearAll} style={styles.clearBtn}>
          <Text style={styles.clearText}>Clear All</Text>
        </Pressable>
      </View>

      <View style={styles.tabRow}>
        {[
          { key: 'filter', label: 'Filter Properties' },
          { key: 'saved', label: `Saved (${savedFilters.filter(f => f.filterType === 'property').length})` },
        ].map(tab => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key as any)}
            style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'filter' && (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'web' ? 34 : 160 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>QUICK FILTERS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingRight: 16 }}>
              {QUICK_FILTERS.map(qf => (
                <Pressable key={qf.label} onPress={() => applyQuickFilter(qf)} style={styles.quickFilterChip}>
                  <Text style={styles.quickFilterText}>{qf.label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.sectionLabel}>PROPERTY TYPE</Text>
          <View style={styles.optionsRow}>
            {PROPERTY_TYPES.map(pt => (
              <Pressable
                key={pt.value}
                onPress={() => toggleType(pt.value)}
                style={[styles.optionChip, (criteria.propertyTypes || []).includes(pt.value) && styles.optionChipActive]}
              >
                <Text style={[styles.optionChipText, (criteria.propertyTypes || []).includes(pt.value) && styles.optionChipTextActive]}>
                  {pt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionLabel}>PRICE RANGE</Text>
          <View style={styles.optionsRow}>
            {PRICE_RANGES.map(pr => {
              const isActive = criteria.minPrice === pr.min && criteria.maxPrice === pr.max;
              return (
                <Pressable
                  key={pr.label}
                  onPress={() => setPriceRange(pr.min, pr.max)}
                  style={[styles.optionChip, isActive && styles.optionChipActive]}
                >
                  <Text style={[styles.optionChipText, isActive && styles.optionChipTextActive]}>
                    {pr.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>BEDROOMS</Text>
          <View style={styles.optionsRow}>
            {BEDROOM_OPTIONS.map(b => (
              <Pressable
                key={b}
                onPress={() => setCriteria(prev => ({ ...prev, bedrooms: prev.bedrooms === b ? undefined : b }))}
                style={[styles.bedroomChip, criteria.bedrooms === b && styles.optionChipActive]}
              >
                <Text style={[styles.optionChipText, criteria.bedrooms === b && styles.optionChipTextActive]}>
                  {b} BHK
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionLabel}>FURNISHING</Text>
          <View style={styles.optionsRow}>
            {FURNISHING_OPTIONS.map(fo => (
              <Pressable
                key={fo.value}
                onPress={() => setCriteria(prev => ({ ...prev, furnishing: prev.furnishing === fo.value ? undefined : fo.value }))}
                style={[styles.optionChip, criteria.furnishing === fo.value && styles.optionChipActive]}
              >
                <Text style={[styles.optionChipText, criteria.furnishing === fo.value && styles.optionChipTextActive]}>
                  {fo.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionLabel}>AMENITIES</Text>
          <View style={styles.amenitiesGrid}>
            {AMENITY_OPTIONS.map(a => (
              <Pressable
                key={a}
                onPress={() => toggleAmenity(a)}
                style={[styles.amenityChip, (criteria.amenities || []).includes(a) && styles.amenityChipActive]}
              >
                {(criteria.amenities || []).includes(a) && (
                  <Feather name="check" size={12} color={Colors.white} />
                )}
                <Text style={[styles.amenityChipText, (criteria.amenities || []).includes(a) && styles.amenityChipTextActive]}>
                  {a}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionLabel}>CITY</Text>
          <TextInput
            value={criteria.city || ''}
            onChangeText={val => setCriteria(prev => ({ ...prev, city: val || undefined }))}
            placeholder="e.g. Bangalore, Mumbai..."
            placeholderTextColor={Colors.gray}
            style={styles.cityInput}
          />

          <Text style={styles.sectionLabel}>STATUS</Text>
          <View style={styles.optionsRow}>
            {STATUS_OPTIONS.map(so => (
              <Pressable
                key={so.value}
                onPress={() => setCriteria(prev => ({ ...prev, status: prev.status === so.value ? undefined : so.value }))}
                style={[styles.optionChip, criteria.status === so.value && styles.optionChipActive]}
              >
                <Text style={[styles.optionChipText, criteria.status === so.value && styles.optionChipTextActive]}>
                  {so.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      {activeTab === 'saved' && (
        <FlatList
          data={savedFilters.filter(f => f.filterType === 'property')}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'web' ? 34 : 100 }]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="bookmark" size={48} color={Colors.lightGray} />
              <Text style={styles.emptyTitle}>No saved filters</Text>
              <Text style={styles.emptySubtitle}>Apply filters and save them for quick access</Text>
            </View>
          }
          renderItem={({ item }) => (
            <BrutalistCard style={styles.savedFilterCard}>
              <View style={styles.savedFilterHeader}>
                <Text style={styles.savedFilterName}>{item.name}</Text>
                <Pressable onPress={() => deleteFilter(item.id)}>
                  <Feather name="trash-2" size={16} color={Colors.red} />
                </Pressable>
              </View>
              <Text style={styles.savedFilterDesc}>
                {(() => {
                  const c = item.criteria as PropertyFilterCriteria;
                  const parts = [];
                  if (c.propertyTypes?.length) parts.push(c.propertyTypes.join(', '));
                  if (c.minPrice || c.maxPrice) parts.push(`${c.minPrice ? formatCurrency(c.minPrice) : '0'} – ${c.maxPrice ? formatCurrency(c.maxPrice) : 'Any'}`);
                  if (c.bedrooms) parts.push(`${c.bedrooms} BHK`);
                  if (c.city) parts.push(c.city);
                  return parts.join(' · ') || 'All properties';
                })()}
              </Text>
              <BrutalistButton
                title="Apply Filter"
                onPress={() => loadSavedFilter(item)}
                variant="secondary"
                small
                style={{ marginTop: 10 }}
              />
            </BrutalistCard>
          )}
        />
      )}

      {showResults && activeTab === 'filter' && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsHeader}>{results.length} Properties Found</Text>
          {results.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8, paddingRight: 16 }}>
                {results.slice(0, 5).map(p => (
                  <Pressable
                    key={p.id}
                    onPress={() => router.push({ pathname: '/property/[id]', params: { id: p.id } })}
                  >
                    <View style={styles.resultChip}>
                      <Text style={styles.resultChipName} numberOfLines={1}>{p.address.split(',')[0]}</Text>
                      <Text style={styles.resultChipPrice}>{formatCurrency(p.price)}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      )}

      <View style={[styles.bottomBar, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 16 }]}>
        <BrutalistButton
          title={`Save Filter${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`}
          onPress={() => setShowSaveModal(true)}
          variant="secondary"
          icon="bookmark"
          style={{ flex: 1 }}
          disabled={activeFilterCount === 0}
        />
        <BrutalistButton
          title={showResults ? `${results.length} Results` : 'Apply Filter'}
          onPress={applyFilter}
          variant="charcoal"
          icon="search"
          style={{ flex: 1 }}
          disabled={activeFilterCount === 0}
        />
      </View>

      <Modal visible={showSaveModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save Filter</Text>
            <TextInput
              value={filterName}
              onChangeText={setFilterName}
              placeholder="e.g. 2BHK Bangalore Under 50L"
              placeholderTextColor={Colors.gray}
              style={styles.modalInput}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <BrutalistButton
                title="Cancel"
                onPress={() => setShowSaveModal(false)}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <BrutalistButton
                title="Save"
                onPress={handleSaveFilter}
                variant="charcoal"
                disabled={!filterName.trim()}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: Colors.black,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontFamily: 'DMSans_800ExtraBold', fontSize: 20, color: Colors.black },
  filterCountBadge: {
    backgroundColor: Colors.charcoal, width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  filterCountText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.white },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 2, borderColor: Colors.black },
  clearText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.black },
  tabRow: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: Colors.black },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { backgroundColor: Colors.charcoal },
  tabText: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.black },
  tabTextActive: { color: Colors.white },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  sectionLabel: {
    fontFamily: 'DMSans_800ExtraBold', fontSize: 11, color: Colors.gray,
    letterSpacing: 1.5, marginBottom: 10,
  },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  optionChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderWidth: 2, borderColor: Colors.black,
    backgroundColor: Colors.white,
  },
  optionChipActive: { backgroundColor: Colors.charcoal },
  optionChipText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.black },
  optionChipTextActive: { color: Colors.white },
  bedroomChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderWidth: 2, borderColor: Colors.black,
    backgroundColor: Colors.white,
  },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  amenityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: Colors.black,
    backgroundColor: Colors.white,
  },
  amenityChipActive: { backgroundColor: Colors.charcoal },
  amenityChipText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.black },
  amenityChipTextActive: { color: Colors.white },
  cityInput: {
    borderWidth: 2, borderColor: Colors.black, padding: 12, marginBottom: 20,
    fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.black,
  },
  quickFilterChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderWidth: 2, borderColor: Colors.black,
    backgroundColor: Colors.primaryYellow,
  },
  quickFilterText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.black },
  resultsContainer: {
    borderTopWidth: 2, borderTopColor: Colors.black, padding: 12, backgroundColor: Colors.lightGray,
  },
  resultsHeader: {
    fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.black, marginBottom: 8,
  },
  resultChip: {
    borderWidth: 2, borderColor: Colors.black, padding: 10, backgroundColor: Colors.white,
    minWidth: 120, shadowColor: Colors.black, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0,
  },
  resultChipName: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.black },
  resultChipPrice: { fontFamily: 'DMSans_800ExtraBold', fontSize: 14, color: Colors.black, marginTop: 2 },
  bottomBar: {
    flexDirection: 'row', gap: 10, padding: 16,
    borderTopWidth: 2, borderTopColor: Colors.black, backgroundColor: Colors.white,
  },
  savedFilterCard: { marginBottom: 12 },
  savedFilterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  savedFilterName: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.black },
  savedFilterDesc: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.gray },
  empty: { alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: Colors.black },
  emptySubtitle: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.gray, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: {
    backgroundColor: Colors.white, padding: 20, borderWidth: 2, borderColor: Colors.black,
    shadowColor: Colors.black, shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0,
  },
  modalTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 18, color: Colors.black, marginBottom: 12 },
  modalInput: {
    borderWidth: 2, borderColor: Colors.black, padding: 12,
    fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.black,
  },
});
