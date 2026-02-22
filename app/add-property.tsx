import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { BrutalistButton, BrutalistInput } from '@/components/ui';
import { useData } from '@/lib/data-context';
import { PropertyType } from '@/lib/types';

const PROPERTY_TYPES: { label: string; value: PropertyType }[] = [
  { label: 'Residential', value: 'residential' },
  { label: 'Commercial', value: 'commercial' },
  { label: 'Rental', value: 'rental' },
  { label: 'Land', value: 'land' },
];

const FURNISHING_OPTIONS = [
  { label: 'Furnished', value: 'furnished' as const },
  { label: 'Semi-Furnished', value: 'semi_furnished' as const },
  { label: 'Unfurnished', value: 'unfurnished' as const },
];

export default function AddPropertyScreen() {
  const { addProperty } = useData();
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('residential');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [carpetArea, setCarpetArea] = useState('');
  const [price, setPrice] = useState('');
  const [furnishing, setFurnishing] = useState<'furnished' | 'semi_furnished' | 'unfurnished'>('semi_furnished');
  const [amenities, setAmenities] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!address.trim() || !city.trim() || !price.trim()) return;
    setLoading(true);
    try {
      await addProperty({
        address: address.trim(),
        area: area.trim(),
        city: city.trim(),
        propertyType,
        bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
        bathrooms: bathrooms ? parseInt(bathrooms) : undefined,
        carpetArea: carpetArea ? parseInt(carpetArea) : undefined,
        price: parseInt(price) * 100000,
        furnishing,
        status: 'available',
        amenities: amenities ? amenities.split(',').map(a => a.trim()).filter(Boolean) : [],
        ownerName: ownerName.trim() || undefined,
        ownerPhone: ownerPhone.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Property</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BrutalistInput label="Address *" value={address} onChangeText={setAddress} placeholder="e.g. ABC Apartments, Koramangala" autoFocus />
        <BrutalistInput label="Area" value={area} onChangeText={setArea} placeholder="e.g. Koramangala" style={{ marginTop: 14 }} />
        <BrutalistInput label="City *" value={city} onChangeText={setCity} placeholder="e.g. Bangalore" style={{ marginTop: 14 }} />

        <Text style={styles.sectionLabel}>Property Type</Text>
        <View style={styles.chipRow}>
          {PROPERTY_TYPES.map(t => (
            <Pressable
              key={t.value}
              onPress={() => setPropertyType(t.value)}
              style={[styles.chip, propertyType === t.value && styles.chipActive]}
            >
              <Text style={[styles.chipText, propertyType === t.value && styles.chipTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.row}>
          <BrutalistInput label="Bedrooms" value={bedrooms} onChangeText={setBedrooms} placeholder="2" keyboardType="numeric" style={{ flex: 1 }} />
          <BrutalistInput label="Bathrooms" value={bathrooms} onChangeText={setBathrooms} placeholder="2" keyboardType="numeric" style={{ flex: 1 }} />
          <BrutalistInput label="Sq Ft" value={carpetArea} onChangeText={setCarpetArea} placeholder="950" keyboardType="numeric" style={{ flex: 1 }} />
        </View>

        <BrutalistInput label="Price (Lakhs) *" value={price} onChangeText={setPrice} placeholder="40" keyboardType="numeric" style={{ marginTop: 14 }} />

        <Text style={styles.sectionLabel}>Furnishing</Text>
        <View style={styles.chipRow}>
          {FURNISHING_OPTIONS.map(f => (
            <Pressable
              key={f.value}
              onPress={() => setFurnishing(f.value)}
              style={[styles.chip, furnishing === f.value && styles.chipActive]}
            >
              <Text style={[styles.chipText, furnishing === f.value && styles.chipTextActive]}>{f.label}</Text>
            </Pressable>
          ))}
        </View>

        <BrutalistInput label="Amenities (comma separated)" value={amenities} onChangeText={setAmenities} placeholder="Gym, Pool, Parking" style={{ marginTop: 14 }} />
        <BrutalistInput label="Owner Name" value={ownerName} onChangeText={setOwnerName} placeholder="Owner name" style={{ marginTop: 14 }} />
        <BrutalistInput label="Owner Phone" value={ownerPhone} onChangeText={setOwnerPhone} placeholder="+91 98765 43210" keyboardType="phone-pad" style={{ marginTop: 14 }} />

        <BrutalistButton
          title="Save Property"
          icon="check"
          onPress={handleSave}
          variant="charcoal"
          disabled={!address.trim() || !city.trim() || !price.trim()}
          loading={loading}
          style={{ marginTop: 24 }}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: Colors.black,
  },
  title: {
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 22,
    color: Colors.black,
    letterSpacing: -0.5,
  },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  sectionLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.black,
    marginTop: 14,
    marginBottom: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: Colors.black,
    backgroundColor: Colors.white,
  },
  chipActive: { backgroundColor: Colors.charcoal },
  chipText: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.black },
  chipTextActive: { color: Colors.white },
  row: { flexDirection: 'row', gap: 10, marginTop: 14 },
});
