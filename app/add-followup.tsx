import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { BrutalistButton, BrutalistInput } from '@/components/ui';
import { useData } from '@/lib/data-context';
import { FollowUpType } from '@/lib/types';

const FOLLOW_UP_TYPES: { label: string; value: FollowUpType }[] = [
  { label: 'Call', value: 'call' },
  { label: 'Site Visit', value: 'site_visit' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'Email', value: 'email' },
  { label: 'SMS', value: 'sms' },
];

export default function AddFollowUpScreen() {
  const { leadId, leadName } = useLocalSearchParams<{ leadId: string; leadName: string }>();
  const { addFollowUp } = useData();
  const [type, setType] = useState<FollowUpType>('call');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const handleSave = async () => {
    if (!notes.trim()) return;
    setLoading(true);
    try {
      await addFollowUp({
        leadId: leadId || '',
        leadName: leadName || '',
        type,
        date: tomorrow,
        notes: notes.trim(),
        status: 'pending',
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
        <Text style={styles.title}>Schedule Follow-up</Text>
        {leadName && <Text style={styles.subtitle}>For {leadName}</Text>}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Type</Text>
        <View style={styles.chipRow}>
          {FOLLOW_UP_TYPES.map(t => (
            <Pressable
              key={t.value}
              onPress={() => setType(t.value)}
              style={[styles.chip, type === t.value && styles.chipActive]}
            >
              <Text style={[styles.chipText, type === t.value && styles.chipTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        <BrutalistInput
          label="Notes *"
          value={notes}
          onChangeText={setNotes}
          placeholder="What needs to be done?"
          multiline
          style={{ marginTop: 16 }}
          autoFocus
        />

        <View style={styles.dateInfo}>
          <Text style={styles.dateLabel}>Scheduled for: Tomorrow ({tomorrow})</Text>
        </View>

        <BrutalistButton
          title="Save Follow-up"
          icon="check"
          onPress={handleSave}
          variant="charcoal"
          disabled={!notes.trim()}
          loading={loading}
          style={{ marginTop: 20 }}
        />
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
  subtitle: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.gray,
    marginTop: 2,
  },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  sectionLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.black,
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
  dateInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.primaryYellow,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  dateLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.black,
  },
});
