import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Linking, Modal, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useData } from '@/lib/data-context';
import { BrutalistCard, BrutalistButton, StatusBadge, SectionHeader, EmptyState } from '@/components/ui';
import { formatPhone, formatBudget, formatDate, formatTime, statusLabel, sourceLabel, followUpTypeLabel } from '@/lib/format';
import { LeadStatus, AIMatch, BlacklistEntry } from '@/lib/types';
import { formatCurrency } from '@/lib/format';

const STATUSES: LeadStatus[] = ['inquiry', 'site_visit', 'negotiation', 'offer', 'closed', 'dead'];

function AIMatchCard({ match, property, onResponse }: {
  match: AIMatch;
  property: any;
  onResponse: (response: AIMatch['clientResponse']) => void;
}) {
  const getScoreColor = (score: number) => score >= 70 ? Colors.green : score >= 40 ? Colors.yellowWarning : Colors.gray;

  return (
    <BrutalistCard style={styles.matchCard}>
      <View style={styles.matchHeader}>
        <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(match.matchScore) }]}>
          <Text style={styles.scoreText}>{match.matchScore}%</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.matchPropName} numberOfLines={1}>{property.address}</Text>
          <Text style={styles.matchPropSub}>{property.area} · {formatCurrency(property.price)}</Text>
        </View>
        <Pressable
          onPress={() => router.push({ pathname: '/property/[id]', params: { id: property.id } })}
        >
          <Feather name="arrow-right" size={18} color={Colors.charcoal} />
        </Pressable>
      </View>

      {match.matchReasons.length > 0 && (
        <View style={styles.reasonsRow}>
          {match.matchReasons.slice(0, 3).map((r, i) => (
            <View key={i} style={styles.reasonTag}>
              <Feather name="check" size={10} color={Colors.green} />
              <Text style={styles.reasonText}>{r}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.matchResponseRow}>
        {(['interested', 'maybe', 'not_interested'] as AIMatch['clientResponse'][]).map(resp => (
          <Pressable
            key={resp}
            onPress={() => onResponse(resp)}
            style={[
              styles.respChip,
              match.clientResponse === resp && styles.respChipActive,
            ]}
          >
            <Text style={[styles.respChipText, match.clientResponse === resp && styles.respChipTextActive]}>
              {resp === 'interested' ? 'Interested' : resp === 'maybe' ? 'Maybe' : 'No'}
            </Text>
          </Pressable>
        ))}
      </View>
    </BrutalistCard>
  );
}

function BlacklistModal({ lead, onClose }: { lead: any; onClose: () => void }) {
  const { addToBlacklist } = useData();
  const [reason, setReason] = useState<BlacklistEntry['reason']>('spam');
  const [description, setDescription] = useState('');

  const handleBlock = async () => {
    await addToBlacklist({
      clientName: lead.name,
      phoneNumber: lead.phone,
      email: lead.email,
      leadId: lead.id,
      reason, reasonDescription: description,
      blockedBy: 'Agent', isActive: true,
    });
    onClose();
  };

  const reasons: { value: BlacklistEntry['reason']; label: string }[] = [
    { value: 'spam', label: 'Spam' },
    { value: 'fraud', label: 'Fraud' },
    { value: 'non_responsive', label: 'Non-Responsive' },
    { value: 'difficult_client', label: 'Difficult Client' },
    { value: 'competitive', label: 'Competitor' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <Modal visible animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Block {lead.name}</Text>
          <Text style={styles.modalSubtitle}>Select a reason for blocking this contact</Text>

          <View style={styles.reasonGrid}>
            {reasons.map(r => (
              <Pressable
                key={r.value}
                onPress={() => setReason(r.value)}
                style={[styles.reasonOption, reason === r.value && styles.reasonOptionActive]}
              >
                <Text style={[styles.reasonOptionText, reason === r.value && styles.reasonOptionTextActive]}>
                  {r.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Additional notes (optional)"
            placeholderTextColor={Colors.gray}
            multiline
            numberOfLines={2}
            style={styles.reasonNotes}
          />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <BrutalistButton title="Cancel" onPress={onClose} variant="secondary" style={{ flex: 1 }} />
            <BrutalistButton title="Block" onPress={handleBlock} variant="danger" icon="slash" style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const {
    getLeadById, getActivitiesForLead, getFollowUpsForLead, getDealsForLead,
    updateLead, updateFollowUp, properties,
    getAIMatchesForLead, calculateAndSaveMatches, updateAIMatchResponse,
    isPhoneBlacklisted,
  } = useData();

  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [localMatches, setLocalMatches] = useState<AIMatch[]>([]);
  const [matchesLoaded, setMatchesLoaded] = useState(false);
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);

  const lead = getLeadById(id);
  const activities = getActivitiesForLead(id);
  const followUps = getFollowUpsForLead(id);
  const deals = getDealsForLead(id);
  const isBlacklisted = lead ? isPhoneBlacklisted(lead.phone) : false;

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const handleLoadMatches = useCallback(async () => {
    if (!lead) return;
    setIsLoadingMatches(true);
    const existing = getAIMatchesForLead(id);
    if (existing.length > 0) {
      setLocalMatches(existing);
      setMatchesLoaded(true);
      setIsLoadingMatches(false);
      return;
    }
    const result = await calculateAndSaveMatches(id);
    setLocalMatches(result);
    setMatchesLoaded(true);
    setIsLoadingMatches(false);
  }, [lead, id, getAIMatchesForLead, calculateAndSaveMatches]);

  if (!lead) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <EmptyState icon="alert-circle" title="Lead not found" />
      </View>
    );
  }

  const handleCall = () => Linking.openURL(`tel:${lead.phone}`);
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

  const handleMatchResponse = async (matchId: string, response: AIMatch['clientResponse']) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateAIMatchResponse(matchId, response);
    setLocalMatches(prev => prev.map(m => m.id === matchId ? { ...m, clientResponse: response } : m));
  };

  const matchedProperties = localMatches.map(m => ({
    match: m,
    property: properties.find(p => p.id === m.propertyId),
  })).filter(item => item.property);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.black} />
        </Pressable>
        <Text style={styles.topTitle}>Lead Details</Text>
        {isBlacklisted && (
          <View style={styles.blacklistBadge}>
            <Feather name="slash" size={12} color={Colors.white} />
            <Text style={styles.blacklistBadgeText}>Blocked</Text>
          </View>
        )}
        <Pressable
          onPress={() => router.push({ pathname: '/add-followup', params: { leadId: lead.id, leadName: lead.name } })}
          style={styles.actionBtn}
        >
          <Feather name="clock" size={18} color={Colors.black} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BrutalistCard large style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatar, isBlacklisted && { backgroundColor: Colors.red }]}>
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

        {!isBlacklisted && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowBlacklistModal(true);
            }}
            style={styles.blockBtn}
          >
            <Feather name="slash" size={14} color={Colors.red} />
            <Text style={styles.blockBtnText}>Block this client</Text>
          </Pressable>
        )}

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

        <View style={styles.section}>
          <View style={styles.aiSectionHeader}>
            <Ionicons name="sparkles" size={16} color={Colors.black} />
            <Text style={styles.aiSectionTitle}>AI Property Matches</Text>
          </View>
          {!matchesLoaded ? (
            <BrutalistButton
              title={isLoadingMatches ? 'Finding matches...' : 'Find Matching Properties'}
              icon="target"
              onPress={handleLoadMatches}
              variant="primary"
              loading={isLoadingMatches}
            />
          ) : matchedProperties.length === 0 ? (
            <BrutalistCard>
              <EmptyState icon="search" title="No matches found" subtitle="Add more properties or update lead requirements" />
            </BrutalistCard>
          ) : (
            <View>
              <Text style={styles.matchCount}>{matchedProperties.length} properties matched</Text>
              {matchedProperties.slice(0, 4).map(({ match, property }) => (
                <AIMatchCard
                  key={match.id}
                  match={match}
                  property={property}
                  onResponse={(resp) => handleMatchResponse(match.id, resp)}
                />
              ))}
              {matchedProperties.length > 4 && (
                <Pressable
                  onPress={() => router.push('/(tabs)/ai')}
                  style={styles.viewMoreBtn}
                >
                  <Text style={styles.viewMoreText}>View all in AI Tools</Text>
                  <Feather name="arrow-right" size={14} color={Colors.charcoal} />
                </Pressable>
              )}
            </View>
          )}
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

        <View style={{ height: Platform.OS === 'web' ? 34 : 60 }} />
      </ScrollView>

      {showBlacklistModal && (
        <BlacklistModal lead={lead} onClose={() => setShowBlacklistModal(false)} />
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
  blacklistBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.red, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.black,
  },
  blacklistBadgeText: { fontFamily: 'DMSans_700Bold', fontSize: 10, color: Colors.white },
  actionBtn: {
    width: 36, height: 36, borderWidth: 2, borderColor: Colors.black,
    backgroundColor: Colors.primaryYellow, alignItems: 'center', justifyContent: 'center',
  },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  profileCard: { marginBottom: 16 },
  profileHeader: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  avatar: {
    width: 56, height: 56, borderWidth: 2, borderColor: Colors.black,
    backgroundColor: Colors.primaryYellow, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 24, color: Colors.black },
  profileName: { fontFamily: 'DMSans_800ExtraBold', fontSize: 22, color: Colors.black, letterSpacing: -0.5 },
  profilePhone: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.charcoal },
  profileEmail: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.gray },
  profileMeta: { marginTop: 16, gap: 10 },
  metaItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaLabel: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.gray },
  metaValue: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.black },
  contactActions: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  blockBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16,
    borderWidth: 1.5, borderColor: Colors.red, backgroundColor: '#fff5f5',
    alignSelf: 'flex-start',
  },
  blockBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.red },
  section: { marginBottom: 20 },
  aiSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  aiSectionTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 17, color: Colors.black },
  matchCount: {
    fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.gray, marginBottom: 10,
  },
  matchCard: { marginBottom: 10 },
  matchHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  scoreBadge: {
    width: 48, height: 48, borderWidth: 2, borderColor: Colors.black,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 14, color: Colors.white },
  matchPropName: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.black },
  matchPropSub: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.gray, marginTop: 2 },
  reasonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  reasonTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.lightGray, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.black,
  },
  reasonText: { fontFamily: 'DMSans_500Medium', fontSize: 10, color: Colors.black },
  matchResponseRow: { flexDirection: 'row', gap: 8 },
  respChip: {
    flex: 1, paddingVertical: 8, borderWidth: 2, borderColor: Colors.black,
    alignItems: 'center', backgroundColor: Colors.white,
  },
  respChipActive: { backgroundColor: Colors.charcoal },
  respChipText: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: Colors.black },
  respChipTextActive: { color: Colors.white },
  viewMoreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center',
    padding: 12, borderWidth: 2, borderColor: Colors.black, borderStyle: 'dashed',
  },
  viewMoreText: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.charcoal },
  statusChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderWidth: 2, borderColor: Colors.black,
    backgroundColor: Colors.white,
  },
  statusChipActive: { backgroundColor: Colors.charcoal },
  statusChipText: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.black },
  statusChipTextActive: { color: Colors.white },
  notesText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.charcoal, lineHeight: 20 },
  fuCard: { marginBottom: 8 },
  fuRow: { flexDirection: 'row', alignItems: 'flex-start' },
  fuType: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.black },
  fuNotes: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.gray, marginTop: 2 },
  fuDate: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.charcoal, marginTop: 4 },
  doneCircle: {
    width: 36, height: 36, borderWidth: 2, borderColor: Colors.green,
    alignItems: 'center', justifyContent: 'center',
  },
  timeline: { paddingLeft: 4 },
  timelineItem: { flexDirection: 'row', minHeight: 60 },
  timelineLine: { alignItems: 'center', width: 20, marginRight: 12 },
  timelineDot: {
    width: 12, height: 12, borderWidth: 2, borderColor: Colors.black, borderRadius: 6,
  },
  timelineConnector: { width: 2, flex: 1, backgroundColor: Colors.lightGray },
  timelineContent: { flex: 1, paddingBottom: 16 },
  timelineDate: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: Colors.gray },
  timelineDesc: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.black, marginTop: 2 },
  timelineAgent: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.gray, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.white, padding: 20, borderTopWidth: 2, borderTopColor: Colors.black,
    paddingBottom: Platform.OS === 'web' ? 34 : 40,
  },
  modalTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 18, color: Colors.black, marginBottom: 4 },
  modalSubtitle: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.gray, marginBottom: 16 },
  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  reasonOption: {
    paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: Colors.black, backgroundColor: Colors.white,
  },
  reasonOptionActive: { backgroundColor: Colors.red },
  reasonOptionText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.black },
  reasonOptionTextActive: { color: Colors.white },
  reasonNotes: {
    borderWidth: 2, borderColor: Colors.black, padding: 10, marginBottom: 16,
    fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.black,
    minHeight: 60, textAlignVertical: 'top',
  },
});
