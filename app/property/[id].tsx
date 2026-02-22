import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useData } from '@/lib/data-context';
import { BrutalistCard, BrutalistButton, StatusBadge, SectionHeader, EmptyState } from '@/components/ui';
import { formatCurrency, furnishingLabel } from '@/lib/format';

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { getPropertyById } = useData();

  const property = getPropertyById(id);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

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

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: Colors.black,
    gap: 12,
  },
  backBtn: { padding: 4 },
  topTitle: {
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 18,
    color: Colors.black,
    flex: 1,
  },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: Colors.primaryYellow,
    borderWidth: 2,
    borderColor: Colors.black,
    marginBottom: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  heroIcon: {
    width: 80,
    height: 80,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroPrice: {
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 36,
    color: Colors.black,
    letterSpacing: -1.5,
  },
  heroAddress: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: Colors.black,
    marginTop: 4,
  },
  heroArea: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.charcoal,
    marginTop: 2,
  },
  detailCard: { marginBottom: 12 },
  sectionLabel: {
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 12,
    color: Colors.charcoal,
    letterSpacing: 1,
    marginBottom: 12,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    width: '45%',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.black,
  },
  detailValue: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: Colors.black,
    marginTop: 6,
  },
  detailLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: Colors.gray,
    marginTop: 2,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.lightGray,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.black,
  },
  amenityText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.black,
  },
  ownerAvatar: {
    width: 44,
    height: 44,
    borderWidth: 2,
    borderColor: Colors.black,
    backgroundColor: Colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: Colors.black,
  },
  ownerPhone: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.gray,
  },
});
