import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useData } from '@/lib/data-context';
import { BrutalistCard, StatusBadge, EmptyState } from '@/components/ui';
import { formatCurrency, furnishingLabel } from '@/lib/format';
import { Property } from '@/lib/types';

const TYPE_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Residential', value: 'residential' },
  { label: 'Commercial', value: 'commercial' },
  { label: 'Rental', value: 'rental' },
  { label: 'Land', value: 'land' },
];

export default function PropertiesScreen() {
  const insets = useSafeAreaInsets();
  const { properties } = useData();
  const [typeFilter, setTypeFilter] = useState('all');

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return properties;
    return properties.filter(p => p.propertyType === typeFilter);
  }, [properties, typeFilter]);

  const renderProperty = ({ item }: { item: Property }) => (
    <Pressable onPress={() => router.push({ pathname: '/property/[id]', params: { id: item.id } })}>
      <BrutalistCard style={styles.propCard}>
        <View style={styles.propHeader}>
          <View style={styles.propIconBox}>
            <Ionicons
              name={item.propertyType === 'commercial' ? 'business' : item.propertyType === 'land' ? 'map' : 'home'}
              size={24}
              color={Colors.black}
            />
          </View>
          <StatusBadge status={item.status} small />
        </View>
        <Text style={styles.propAddress}>{item.address}</Text>
        <Text style={styles.propArea}>{item.area}, {item.city}</Text>

        <View style={styles.propDetails}>
          {item.bedrooms && (
            <View style={styles.propTag}>
              <Feather name="home" size={12} color={Colors.charcoal} />
              <Text style={styles.propTagText}>{item.bedrooms}BHK</Text>
            </View>
          )}
          {item.carpetArea && (
            <View style={styles.propTag}>
              <Feather name="maximize" size={12} color={Colors.charcoal} />
              <Text style={styles.propTagText}>{item.carpetArea} sq ft</Text>
            </View>
          )}
          <View style={styles.propTag}>
            <Feather name="package" size={12} color={Colors.charcoal} />
            <Text style={styles.propTagText}>{furnishingLabel(item.furnishing)}</Text>
          </View>
        </View>

        <View style={styles.propFooter}>
          <Text style={styles.propPrice}>{formatCurrency(item.price)}</Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {item.amenities.slice(0, 3).map(a => (
              <View key={a} style={styles.amenityTag}>
                <Text style={styles.amenityText}>{a}</Text>
              </View>
            ))}
            {item.amenities.length > 3 && (
              <View style={styles.amenityTag}>
                <Text style={styles.amenityText}>+{item.amenities.length - 3}</Text>
              </View>
            )}
          </View>
        </View>
      </BrutalistCard>
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Properties</Text>
        <Pressable
          style={styles.addBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/add-property');
          }}
        >
          <Feather name="plus" size={20} color={Colors.black} />
        </Pressable>
      </View>

      <FlatList
        horizontal
        data={TYPE_FILTERS}
        keyExtractor={item => item.value}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setTypeFilter(item.value)}
            style={[styles.filterChip, typeFilter === item.value && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, typeFilter === item.value && styles.filterTextActive]}>
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
        renderItem={renderProperty}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        scrollEnabled={!!filtered.length}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState icon="home" title="No properties found" subtitle="Add your first property listing" />
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
  filterRow: { marginBottom: 12, flexGrow: 0 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: Colors.black,
    backgroundColor: Colors.white,
  },
  filterChipActive: { backgroundColor: Colors.charcoal },
  filterText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.black },
  filterTextActive: { color: Colors.white },
  propCard: { marginBottom: 12 },
  propHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  propIconBox: {
    width: 44,
    height: 44,
    borderWidth: 2,
    borderColor: Colors.black,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propAddress: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: Colors.black,
  },
  propArea: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.gray,
    marginTop: 2,
  },
  propDetails: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  propTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.lightGray,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  propTagText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.charcoal,
  },
  propFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  propPrice: {
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 20,
    color: Colors.black,
    letterSpacing: -0.5,
  },
  amenityTag: {
    backgroundColor: Colors.sage,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.black,
  },
  amenityText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    color: Colors.black,
  },
});
