import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useData } from '@/lib/data-context';
import { BrutalistCard, BrutalistButton, StatusBadge, SectionHeader, EmptyState } from '@/components/ui';
import { formatTime, formatBudget, formatDate, daysAgo, followUpTypeLabel } from '@/lib/format';

function FollowUpIcon({ type }: { type: string }) {
  const iconMap: Record<string, keyof typeof Feather.glyphMap> = {
    call: 'phone',
    site_visit: 'map-pin',
    whatsapp: 'message-circle',
    email: 'mail',
    sms: 'message-square',
  };
  return <Feather name={iconMap[type] || 'clock'} size={16} color={Colors.black} />;
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { leads, todayFollowUps, overdueFollowUps, pipelineCounts, updateFollowUp, user } = useData();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const newLeadsToday = leads.filter(l => {
    const d = l.createdAt.split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    return d === today;
  }).length;

  const handleMarkDone = async (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateFollowUp(id, { status: 'done' });
  };

  const handleSnooze = async (id: string) => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    await updateFollowUp(id, { date: tomorrow, status: 'pending' });
  };

  const recentLeads = leads.slice(0, 5);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Hey, {user?.name || 'Agent'}</Text>
            <Text style={styles.dateText}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
          </View>
          <Pressable
            onPress={() => {}}
            style={styles.avatarCircle}
          >
            <Feather name="user" size={20} color={Colors.black} />
          </Pressable>
        </View>

        <BrutalistCard style={styles.todayCard}>
          <Text style={styles.todayLabel}>TODAY</Text>
          <View style={styles.todayStats}>
            <View style={styles.todayStat}>
              <Text style={styles.todayNumber}>{newLeadsToday}</Text>
              <Text style={styles.todayStatLabel}>New Leads</Text>
            </View>
            <View style={styles.todayDivider} />
            <View style={styles.todayStat}>
              <Text style={styles.todayNumber}>{todayFollowUps.length}</Text>
              <Text style={styles.todayStatLabel}>Follow-ups</Text>
            </View>
            <View style={styles.todayDivider} />
            <View style={styles.todayStat}>
              <Text style={[styles.todayNumber, overdueFollowUps.length > 0 && { color: Colors.red }]}>
                {overdueFollowUps.length}
              </Text>
              <Text style={styles.todayStatLabel}>Overdue</Text>
            </View>
          </View>
        </BrutalistCard>

        <View style={styles.quickActions}>
          <BrutalistButton
            title="Add Lead"
            icon="user-plus"
            onPress={() => router.push('/add-lead')}
            variant="charcoal"
            style={{ flex: 1 }}
          />
          <BrutalistButton
            title="Add Property"
            icon="plus-square"
            onPress={() => router.push('/add-property')}
            variant="secondary"
            style={{ flex: 1 }}
          />
        </View>

        {overdueFollowUps.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Overdue" count={overdueFollowUps.length} />
            {overdueFollowUps.map(fu => (
              <BrutalistCard key={fu.id} style={styles.overdueCard} borderColor={Colors.red}>
                <View style={styles.fuRow}>
                  <View style={styles.fuIconCircle}>
                    <FollowUpIcon type={fu.type} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fuName}>{fu.leadName}</Text>
                    <Text style={styles.fuNotes}>{fu.notes}</Text>
                    <Text style={[styles.fuTime, { color: Colors.red }]}>
                      {daysAgo(fu.date)} days overdue
                    </Text>
                  </View>
                </View>
                <View style={styles.fuActions}>
                  <BrutalistButton title="Done" icon="check" onPress={() => handleMarkDone(fu.id)} small variant="primary" />
                  <BrutalistButton title="Snooze" icon="clock" onPress={() => handleSnooze(fu.id)} small variant="secondary" />
                </View>
              </BrutalistCard>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader title="Today's Follow-ups" count={todayFollowUps.length} />
          {todayFollowUps.length === 0 ? (
            <BrutalistCard>
              <EmptyState icon="check-circle" title="All caught up!" subtitle="No follow-ups due today" />
            </BrutalistCard>
          ) : (
            todayFollowUps.map(fu => (
              <BrutalistCard key={fu.id} style={styles.fuCard}>
                <View style={styles.fuRow}>
                  <View style={styles.fuIconCircle}>
                    <FollowUpIcon type={fu.type} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.fuName}>{fu.leadName}</Text>
                      <StatusBadge status={fu.type} small />
                    </View>
                    <Text style={styles.fuNotes}>{fu.notes}</Text>
                    {fu.time && <Text style={styles.fuTime}>{formatTime(fu.time)}</Text>}
                  </View>
                </View>
                <View style={styles.fuActions}>
                  <BrutalistButton title="Done" icon="check" onPress={() => handleMarkDone(fu.id)} small variant="primary" />
                  <BrutalistButton title="Snooze" icon="clock" onPress={() => handleSnooze(fu.id)} small variant="secondary" />
                </View>
              </BrutalistCard>
            ))
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Pipeline" action="View All" onAction={() => router.push('/(tabs)/pipeline')} />
          <View style={styles.pipelineRow}>
            {(['inquiry', 'site_visit', 'negotiation', 'offer', 'closed'] as const).map((status, i) => (
              <View key={status} style={styles.pipelineItem}>
                <View style={[styles.pipelineDot, {
                  backgroundColor: status === 'closed' ? Colors.green
                    : status === 'negotiation' ? Colors.yellowWarning
                    : status === 'offer' ? Colors.primaryYellow
                    : Colors.charcoal,
                }]}>
                  <Text style={[styles.pipelineCount, status !== 'closed' && status !== 'negotiation' && status !== 'offer' && { color: Colors.white }]}>
                    {pipelineCounts[status]}
                  </Text>
                </View>
                <Text style={styles.pipelineLabel}>
                  {status === 'site_visit' ? 'Visit' : status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
                {i < 4 && <Feather name="chevron-right" size={12} color={Colors.gray} style={{ position: 'absolute', right: -8, top: 8 }} />}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Recent Leads" action="View All" onAction={() => router.push('/(tabs)/leads')} count={leads.length} />
          {recentLeads.map(lead => (
            <Pressable
              key={lead.id}
              onPress={() => router.push({ pathname: '/lead/[id]', params: { id: lead.id } })}
            >
              <BrutalistCard style={styles.leadCard}>
                <View style={styles.leadRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.leadName}>{lead.name}</Text>
                    <Text style={styles.leadInfo}>{lead.propertyInterest} {lead.city && `| ${lead.city}`}</Text>
                    <Text style={styles.leadBudget}>{formatBudget(lead.budgetMin, lead.budgetMax)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <StatusBadge status={lead.status} small />
                    <Feather name="chevron-right" size={18} color={Colors.gray} />
                  </View>
                </View>
              </BrutalistCard>
            </Pressable>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Pressable
        style={styles.fab}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/add-lead');
        }}
      >
        <Feather name="plus" size={28} color={Colors.black} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  scroll: { paddingHorizontal: 16 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  greeting: {
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 28,
    color: Colors.black,
    letterSpacing: -1,
  },
  dateText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.gray,
    marginTop: 2,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderWidth: 2,
    borderColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryYellow,
  },
  todayCard: {
    backgroundColor: Colors.primaryYellow,
    marginBottom: 16,
  },
  todayLabel: {
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 13,
    color: Colors.black,
    letterSpacing: 1,
    marginBottom: 12,
  },
  todayStats: { flexDirection: 'row', alignItems: 'center' },
  todayStat: { flex: 1, alignItems: 'center' },
  todayNumber: {
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 32,
    color: Colors.black,
    letterSpacing: -1,
  },
  todayStatLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.charcoal,
  },
  todayDivider: { width: 2, height: 40, backgroundColor: Colors.black, opacity: 0.2 },
  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  section: { marginBottom: 24 },
  fuCard: { marginBottom: 10 },
  overdueCard: { marginBottom: 10 },
  fuRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  fuIconCircle: {
    width: 36,
    height: 36,
    borderWidth: 2,
    borderColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.lightGray,
  },
  fuName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: Colors.black,
  },
  fuNotes: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.gray,
    marginTop: 2,
  },
  fuTime: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.charcoal,
    marginTop: 4,
  },
  fuActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    justifyContent: 'flex-end',
  },
  pipelineRow: { flexDirection: 'row', justifyContent: 'space-between' },
  pipelineItem: { alignItems: 'center', flex: 1, position: 'relative' },
  pipelineDot: {
    width: 44,
    height: 44,
    borderWidth: 2,
    borderColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipelineCount: {
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 18,
    color: Colors.black,
  },
  pipelineLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    color: Colors.gray,
    marginTop: 4,
  },
  leadCard: { marginBottom: 8 },
  leadRow: { flexDirection: 'row', alignItems: 'center' },
  leadName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: Colors.black,
  },
  leadInfo: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.gray,
    marginTop: 2,
  },
  leadBudget: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.charcoal,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    backgroundColor: Colors.primaryYellow,
    borderWidth: 2,
    borderColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
});
