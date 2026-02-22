import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { BrutalistButton, BrutalistInput, BrutalistCard } from '@/components/ui';
import { useData } from '@/lib/data-context';
import { LeadSource, LeadStatus } from '@/lib/types';

const SOURCES: { label: string; value: LeadSource }[] = [
  { label: 'Walk-in', value: 'walk_in' },
  { label: 'Referral', value: 'referral' },
  { label: 'Call', value: 'call' },
  { label: 'Website', value: 'website' },
  { label: 'Social', value: 'social_media' },
];

export default function AddLeadScreen() {
  const { addLead, user } = useData();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState<LeadSource>('walk_in');
  const [propertyInterest, setPropertyInterest] = useState('');
  const [city, setCity] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) return;
    setLoading(true);
    try {
      await addLead({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        status: 'inquiry',
        source,
        propertyInterest: propertyInterest.trim() || undefined,
        city: city.trim() || undefined,
        budgetMin: budgetMin ? parseInt(budgetMin) * 100000 : undefined,
        budgetMax: budgetMax ? parseInt(budgetMax) * 100000 : undefined,
        notes: notes.trim() || undefined,
        assignedTo: user?.name,
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
        <Text style={styles.title}>Add Lead</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BrutalistInput label="Name *" value={name} onChangeText={setName} placeholder="Client name" autoFocus />
        <BrutalistInput label="Phone *" value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" keyboardType="phone-pad" style={{ marginTop: 14 }} />
        <BrutalistInput label="Email" value={email} onChangeText={setEmail} placeholder="email@example.com" keyboardType="email-address" style={{ marginTop: 14 }} />

        <Text style={styles.sectionLabel}>Lead Source</Text>
        <View style={styles.sourceRow}>
          {SOURCES.map(s => (
            <Pressable
              key={s.value}
              onPress={() => setSource(s.value)}
              style={[styles.sourceChip, source === s.value && styles.sourceChipActive]}
            >
              <Text style={[styles.sourceText, source === s.value && styles.sourceTextActive]}>{s.label}</Text>
            </Pressable>
          ))}
        </View>

        <BrutalistInput label="Property Interest" value={propertyInterest} onChangeText={setPropertyInterest} placeholder="e.g. 2BHK Residential" style={{ marginTop: 14 }} />
        <BrutalistInput label="City" value={city} onChangeText={setCity} placeholder="e.g. Bangalore" style={{ marginTop: 14 }} />

        <View style={styles.budgetRow}>
          <BrutalistInput label="Budget Min (Lakhs)" value={budgetMin} onChangeText={setBudgetMin} placeholder="30" keyboardType="numeric" style={{ flex: 1 }} />
          <BrutalistInput label="Budget Max (Lakhs)" value={budgetMax} onChangeText={setBudgetMax} placeholder="40" keyboardType="numeric" style={{ flex: 1 }} />
        </View>

        <BrutalistInput label="Notes" value={notes} onChangeText={setNotes} placeholder="Any additional details..." multiline style={{ marginTop: 14 }} />

        <BrutalistButton
          title="Save Lead"
          icon="check"
          onPress={handleSave}
          variant="charcoal"
          disabled={!name.trim() || !phone.trim()}
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
  sourceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sourceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: Colors.black,
    backgroundColor: Colors.white,
  },
  sourceChipActive: { backgroundColor: Colors.charcoal },
  sourceText: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.black },
  sourceTextActive: { color: Colors.white },
  budgetRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
});
