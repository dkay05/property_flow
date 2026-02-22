import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Linking, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useData } from '@/lib/data-context';
import { BrutalistCard, BrutalistButton, StatusBadge, SectionHeader, EmptyState } from '@/components/ui';
import { formatPhone, formatBudget, formatDate, formatTime, statusLabel, sourceLabel, followUpTypeLabel, daysAgo } from '@/lib/format';
import { LeadStatus } from '@/lib/types';

const STATUSES: LeadStatus[] = ['inquiry', 'site_visit', 'negotiation', 'offer', 'closed', 'dead'];

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { getLeadById, getActivitiesForLead, getFollowUpsForLead, getDealsForLead, updateLead, updateFollowUp, properties } = useData();

  const lead = getLeadById(id);
  const activities = getActivitiesForLead(id);
  const followUps = getFollowUpsForLead(id);
  const deals = getDealsForLead(id);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  if (!lead) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <EmptyState icon="alert-circle" title="Lead not found" />
      </View>
    );
  }

  const handleCall = () => {
    Linking.openURL(`tel:${lead.phone}`);
  };

  const handleWhatsApp = () => {
    const num = lead.phone.replace(/[^0-9]/g, '');
    Linking.openURL(`https://wa.me/${num}`);
  };

  const handleStatusChange = async (newStatus: LeadStatus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await updateLead(lead.id, { status: newStatus });
  };

  const handleMarkFollowUpDone = async (fuId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateFollowUp(fuId, { status: 'done' });
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.black} />
        </Pressable>
        <Text style={styles.topTitle}>Lead Details</Text>
        <Pressable
          onPress={() => router.push({ pathname: '/add-followup', params: { leadId: lead.id, leadName: lead.name } })}
          style={styles.actionBtn}
        >
          <Feather name="clock" size={18} color={Colors.black} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <BrutalistCard large style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{lead.name.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{lead.name}</Text>
              <Text style={styles.profilePhone}>{formatPhone(lead.phone)}</Text>
              {lead.email && <Text style={styles.profileEmail}>{lead.email}</Text>}
            </View>
          </View>

          <View style={styles.profileMeta}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Status</Text>
              <StatusBadge status={lead.status} />
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Budget</Text>
              <Text style={styles.metaValue}>{formatBudget(lead.budgetMin, lead.budgetMax)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Interest</Text>
              <Text style={styles.metaValue}>{lead.propertyInterest || 'Not specified'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>City</Text>
              <Text style={styles.metaValue}>{lead.city || 'Not specified'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Source</Text>
              <Text style={styles.metaValue}>{sourceLabel(lead.source)}</Text>
            </View>
            {lead.assignedTo && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Assigned To</Text>
                <Text style={styles.metaValue}>{lead.assignedTo}</Text>
              </View>
            )}
          </View>
        </BrutalistCard>

        <View style={styles.contactActions}>
          <BrutalistButton icon="phone" title="Call" onPress={handleCall} small variant="charcoal" style={{ flex: 1 }} />
          <BrutalistButton icon="message-circle" title="WhatsApp" onPress={handleWhatsApp} small variant="primary" style={{ flex: 1 }} />
          <BrutalistButton
            icon="clock"
            title="Follow-up"
            onPress={() => router.push({ pathname: '/add-followup', params: { leadId: lead.id, leadName: lead.name } })}
            small
            variant="secondary"
            style={{ flex: 1 }}
          />
        </View>

        <View style={styles.section}>
          <SectionHeader title="Update Status" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {STATUSES.map(s => (
                <Pressable
                  key={s}
                  onPress={() => handleStatusChange(s)}
                  style={[styles.statusChip, lead.status === s && styles.statusChipActive]}
                >
                  <Text style={[styles.statusChipText, lead.status === s && styles.statusChipTextActive]}>
                    {statusLabel(s)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {lead.notes && (
          <View style={styles.section}>
            <SectionHeader title="Notes" />
            <BrutalistCard>
              <Text style={styles.notesText}>{lead.notes}</Text>
            </BrutalistCard>
          </View>
        )}

        {followUps.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Follow-ups" count={followUps.filter(f => f.status !== 'done').length} />
            {followUps.map(fu => (
              <BrutalistCard
                key={fu.id}
                style={styles.fuCard}
                borderColor={fu.status === 'overdue' ? Colors.red : undefined}
              >
                <View style={styles.fuRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.fuType}>{followUpTypeLabel(fu.type)}</Text>
                      <StatusBadge status={fu.status} small />
                    </View>
                    <Text style={styles.fuNotes}>{fu.notes}</Text>
                    <Text style={styles.fuDate}>
                      {formatDate(fu.date)} {fu.time ? `at ${formatTime(fu.time)}` : ''}
                    </Text>
                  </View>
                  {fu.status !== 'done' && (
                    <Pressable onPress={() => handleMarkFollowUpDone(fu.id)} style={styles.doneCircle}>
                      <Feather name="check" size={16} color={Colors.green} />
                    </Pressable>
                  )}
                </View>
              </BrutalistCard>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader title="Activity Timeline" count={activities.length} />
          {activities.length === 0 ? (
            <BrutalistCard>
              <EmptyState icon="clock" title="No activity yet" />
            </BrutalistCard>
          ) : (
            <View style={styles.timeline}>
              {activities.map((act, i) => (
                <View key={act.id} style={styles.timelineItem}>
                  <View style={styles.timelineLine}>
                    <View style={[styles.timelineDot, {
                      backgroundColor: act.type === 'status_change' ? Colors.primaryYellow
                        : act.type === 'offer' ? Colors.green
                        : Colors.charcoal,
                    }]} />
                    {i < activities.length - 1 && <View style={styles.timelineConnector} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineDate}>
                      {new Date(act.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      {' '}
                      {new Date(act.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text style={styles.timelineDesc}>{act.description}</Text>
                    {act.agent && <Text style={styles.timelineAgent}>{act.agent}</Text>}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

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
  actionBtn: {
    width: 36,
    height: 36,
    borderWidth: 2,
    borderColor: Colors.black,
    backgroundColor: Colors.primaryYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  profileCard: { marginBottom: 16 },
  profileHeader: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  avatar: {
    width: 56,
    height: 56,
    borderWidth: 2,
    borderColor: Colors.black,
    backgroundColor: Colors.primaryYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 24,
    color: Colors.black,
  },
  profileName: {
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 22,
    color: Colors.black,
    letterSpacing: -0.5,
  },
  profilePhone: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.charcoal,
  },
  profileEmail: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.gray,
  },
  profileMeta: { marginTop: 16, gap: 10 },
  metaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.gray,
  },
  metaValue: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: Colors.black,
  },
  contactActions: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  section: { marginBottom: 20 },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: Colors.black,
    backgroundColor: Colors.white,
  },
  statusChipActive: { backgroundColor: Colors.charcoal },
  statusChipText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    color: Colors.black,
  },
  statusChipTextActive: { color: Colors.white },
  notesText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.charcoal,
    lineHeight: 20,
  },
  fuCard: { marginBottom: 8 },
  fuRow: { flexDirection: 'row', alignItems: 'flex-start' },
  fuType: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: Colors.black,
  },
  fuNotes: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.gray,
    marginTop: 2,
  },
  fuDate: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.charcoal,
    marginTop: 4,
  },
  doneCircle: {
    width: 36,
    height: 36,
    borderWidth: 2,
    borderColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeline: { paddingLeft: 4 },
  timelineItem: { flexDirection: 'row', minHeight: 60 },
  timelineLine: { alignItems: 'center', width: 20, marginRight: 12 },
  timelineDot: {
    width: 12,
    height: 12,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 6,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  timelineContent: { flex: 1, paddingBottom: 16 },
  timelineDate: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: Colors.gray,
  },
  timelineDesc: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.black,
    marginTop: 2,
  },
  timelineAgent: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.gray,
    marginTop: 2,
  },
});
