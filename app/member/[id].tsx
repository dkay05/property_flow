import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { BrutalistCard } from '@/components/ui';
import { useData } from '@/lib/data-context';
import { formatCurrency, formatDate } from '@/lib/format';
import { LeadStatus } from '@/lib/types';

const ROLE_COLORS: Record<string, string> = {
  owner: Colors.red,
  team_lead: Colors.primaryYellow,
  agent: Colors.sage,
  custom: Colors.blue,
};

const STATUS_META: Record<LeadStatus, { label: string; color: string }> = {
  inquiry:     { label: 'Inquiry',     color: Colors.blue },
  site_visit:  { label: 'Site Visit',  color: Colors.primaryYellow },
  negotiation: { label: 'Negotiation', color: '#FF9800' },
  offer:       { label: 'Offer',       color: Colors.sage },
  deal_done:   { label: 'Deal Done',   color: Colors.green },
  lost:        { label: 'Lost',        color: Colors.red },
};

const ACTIVITY_ICONS: Record<string, string> = {
  created: 'user-plus',
  status_change: 'refresh-cw',
  call: 'phone',
  site_visit: 'map-pin',
  note: 'file-text',
  offer: 'tag',
  follow_up: 'clock',
};

function getDateRange(period: 'today' | 'week' | 'month') {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  if (period === 'today') return { start: today, end: today };
  if (period === 'week') {
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
    return { start: weekAgo, end: today };
  }
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  return { start: monthStart, end: today };
}

function inRange(dateStr: string, start: string, end: string) {
  const d = dateStr.split('T')[0];
  return d >= start && d <= end;
}

type TabKey = 'overview' | 'leads' | 'activity';

export default function MemberAnalyticsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const { teamMembers, leads, followUps, activities, deals } = useData();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [activityPeriod, setActivityPeriod] = useState<'today' | 'week' | 'month'>('week');

  const member = teamMembers.find(m => m.id === id);

  const myLeads = useMemo(() =>
    leads.filter(l => l.assignedMemberId === id || l.assignedTo === member?.name),
    [leads, id, member]);

  const today = new Date().toISOString().split('T')[0];
  const weekRange = getDateRange('week');
  const monthRange = getDateRange('month');

  const myFollowUps = useMemo(() =>
    followUps.filter(f => f.assignedTo === member?.name),
    [followUps, member]);

  const myActivities = useMemo(() =>
    activities.filter(a => a.agent === member?.name),
    [activities, member]);

  const myDeals = useMemo(() =>
    deals.filter(d => myLeads.some(l => l.id === d.leadId)),
    [deals, myLeads]);

  const closedDeals = myDeals.filter(d => d.status === 'deal_done');
  const totalCommission = closedDeals.reduce((s, d) => s + d.commissionAmount, 0);

  // Follow-up stats
  const fuThisMonth = myFollowUps.filter(f => inRange(f.date, monthRange.start, monthRange.end));
  const fuDoneThisMonth = fuThisMonth.filter(f => f.status === 'done');
  const fuToday = myFollowUps.filter(f => f.date === today);
  const fuDoneToday = fuToday.filter(f => f.status === 'done');
  const fuThisWeek = myFollowUps.filter(f => inRange(f.date, weekRange.start, weekRange.end));
  const fuDoneThisWeek = fuThisWeek.filter(f => f.status === 'done');
  const completionRate = fuThisMonth.length > 0
    ? Math.round((fuDoneThisMonth.length / fuThisMonth.length) * 100) : 0;

  // Activity stats for selected period
  const actRange = getDateRange(activityPeriod);
  const periodActivities = myActivities.filter(a => inRange(a.timestamp, actRange.start, actRange.end));

  // Pipeline breakdown
  const pipelineCounts = useMemo(() => {
    const c: Partial<Record<LeadStatus, number>> = {};
    myLeads.forEach(l => { c[l.status] = (c[l.status] || 0) + 1; });
    return c;
  }, [myLeads]);

  // Leads grouped by status for leads tab
  const activeLeads = myLeads.filter(l => l.status !== 'deal_done' && l.status !== 'lost');
  const closedLeads = myLeads.filter(l => l.status === 'deal_done');
  const lostLeads = myLeads.filter(l => l.status === 'lost');

  // Activity grouped into buckets
  const todayActivities = myActivities.filter(a => inRange(a.timestamp, today, today));
  const weekActivities = myActivities.filter(a =>
    inRange(a.timestamp, weekRange.start, weekRange.end) && !inRange(a.timestamp, today, today));
  const monthActivities = myActivities.filter(a =>
    inRange(a.timestamp, monthRange.start, monthRange.end) && !inRange(a.timestamp, weekRange.start, weekRange.end));
  const olderActivities = myActivities.filter(a => a.timestamp.split('T')[0] < monthRange.start);

  if (!member) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={Colors.black} />
          </Pressable>
          <Text style={styles.headerTitle}>Member not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.black} />
        </Pressable>
        <Text style={styles.headerTitle}>Performance</Text>
        <View style={[styles.rolePill, { backgroundColor: ROLE_COLORS[member.role] || Colors.sage }]}>
          <Text style={styles.rolePillText}>{member.role.replace('_', ' ').toUpperCase()}</Text>
        </View>
      </View>

      {/* Member card */}
      <View style={styles.memberCard}>
        <View style={[styles.avatar, { backgroundColor: member.isBlocked ? '#FFD0D0' : (ROLE_COLORS[member.role] || Colors.sage) }]}>
          <Text style={styles.avatarText}>{member.name.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.memberName}>{member.name}</Text>
          <Text style={styles.memberSub}>{member.phone}{member.email ? `  ·  ${member.email}` : ''}</Text>
          <Text style={[styles.memberStatus, { color: member.isActive ? Colors.green : Colors.gray }]}>
            {member.isActive ? '● Active' : '○ Inactive'}
          </Text>
        </View>
      </View>

      {/* Quick stats */}
      <View style={styles.quickStats}>
        <View style={[styles.statChip, { backgroundColor: Colors.primaryYellow }]}>
          <Text style={styles.statChipVal}>{myLeads.length}</Text>
          <Text style={styles.statChipLabel}>Leads</Text>
        </View>
        <View style={[styles.statChip, { backgroundColor: Colors.sage }]}>
          <Text style={styles.statChipVal}>{fuDoneThisWeek.length}</Text>
          <Text style={styles.statChipLabel}>Done / Wk</Text>
        </View>
        <View style={[styles.statChip, { backgroundColor: '#B8E4C9' }]}>
          <Text style={styles.statChipVal}>{closedDeals.length}</Text>
          <Text style={styles.statChipLabel}>Deals</Text>
        </View>
        <View style={[styles.statChip, { backgroundColor: Colors.blue }]}>
          <Text style={styles.statChipVal}>{completionRate}%</Text>
          <Text style={styles.statChipLabel}>F/U Rate</Text>
        </View>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        {(['overview', 'leads', 'activity'] as TabKey[]).map(t => (
          <Pressable key={t} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(t); }}
            style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]}>
            <Text style={[styles.tabBtnText, activeTab === t && styles.tabBtnTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'web' ? 50 : 100 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ────────────── OVERVIEW ────────────── */}
        {activeTab === 'overview' && (
          <>
            {/* Commission earned */}
            {totalCommission > 0 && (
              <BrutalistCard style={[styles.commissionCard, { backgroundColor: Colors.primaryYellow }]}>
                <Feather name="trending-up" size={20} color={Colors.black} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.commissionLabel}>Total Commission Earned</Text>
                  <Text style={styles.commissionVal}>₹{formatCurrency(totalCommission)}</Text>
                </View>
                <Text style={styles.commissionSub}>{closedDeals.length} deals</Text>
              </BrutalistCard>
            )}

            {/* This month breakdown */}
            <Text style={styles.sectionTitle}>THIS MONTH</Text>
            <View style={styles.grid2}>
              <BrutalistCard style={styles.gridCard}>
                <Text style={styles.gridVal}>{myLeads.filter(l => inRange(l.createdAt, monthRange.start, monthRange.end)).length}</Text>
                <Text style={styles.gridLabel}>New Leads</Text>
              </BrutalistCard>
              <BrutalistCard style={styles.gridCard}>
                <Text style={styles.gridVal}>{fuDoneThisMonth.length}</Text>
                <Text style={styles.gridLabel}>Follow-ups Done</Text>
              </BrutalistCard>
              <BrutalistCard style={styles.gridCard}>
                <Text style={styles.gridVal}>{myLeads.filter(l => l.status === 'site_visit' && inRange(l.updatedAt, monthRange.start, monthRange.end)).length}</Text>
                <Text style={styles.gridLabel}>Site Visits</Text>
              </BrutalistCard>
              <BrutalistCard style={[styles.gridCard, { backgroundColor: closedDeals.filter(d => inRange(d.createdAt, monthRange.start, monthRange.end)).length > 0 ? '#B8E4C9' : Colors.white }]}>
                <Text style={styles.gridVal}>{closedDeals.filter(d => inRange(d.createdAt, monthRange.start, monthRange.end)).length}</Text>
                <Text style={styles.gridLabel}>Deals Closed</Text>
              </BrutalistCard>
            </View>

            {/* Today's snapshot */}
            <Text style={styles.sectionTitle}>TODAY</Text>
            <View style={styles.todayRow}>
              <BrutalistCard style={[styles.todayCard, { backgroundColor: fuDoneToday.length > 0 ? Colors.sage : Colors.white }]}>
                <Text style={styles.todayVal}>{fuDoneToday.length}/{fuToday.length}</Text>
                <Text style={styles.todayLabel}>Follow-ups</Text>
              </BrutalistCard>
              <BrutalistCard style={styles.todayCard}>
                <Text style={styles.todayVal}>{todayActivities.length}</Text>
                <Text style={styles.todayLabel}>Activities</Text>
              </BrutalistCard>
              <BrutalistCard style={[styles.todayCard, { backgroundColor: myFollowUps.filter(f => f.status === 'pending' && f.date < today).length > 0 ? '#FFE0E0' : Colors.white }]}>
                <Text style={[styles.todayVal, { color: myFollowUps.filter(f => f.status === 'pending' && f.date < today).length > 0 ? Colors.red : Colors.black }]}>
                  {myFollowUps.filter(f => f.status === 'pending' && f.date < today).length}
                </Text>
                <Text style={styles.todayLabel}>Overdue</Text>
              </BrutalistCard>
            </View>

            {/* Pipeline breakdown */}
            <Text style={styles.sectionTitle}>PIPELINE BREAKDOWN</Text>
            {myLeads.length === 0 ? (
              <BrutalistCard style={styles.emptyCard}>
                <Text style={styles.emptyText}>No leads assigned yet</Text>
              </BrutalistCard>
            ) : (
              <BrutalistCard style={styles.pipelineCard}>
                {(Object.keys(STATUS_META) as LeadStatus[]).map(status => {
                  const count = pipelineCounts[status] || 0;
                  const pct = myLeads.length > 0 ? (count / myLeads.length) * 100 : 0;
                  if (count === 0) return null;
                  return (
                    <View key={status} style={styles.pipelineRow}>
                      <View style={[styles.statusDot, { backgroundColor: STATUS_META[status].color }]} />
                      <Text style={styles.pipelineLabel}>{STATUS_META[status].label}</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: STATUS_META[status].color }]} />
                      </View>
                      <Text style={styles.pipelineCount}>{count}</Text>
                    </View>
                  );
                })}
              </BrutalistCard>
            )}

            {/* Follow-up completion */}
            <Text style={styles.sectionTitle}>FOLLOW-UP COMPLETION (MONTH)</Text>
            <BrutalistCard style={styles.completionCard}>
              <View style={styles.completionRow}>
                <View>
                  <Text style={styles.completionPct}>{completionRate}%</Text>
                  <Text style={styles.completionSub}>{fuDoneThisMonth.length} of {fuThisMonth.length} done</Text>
                </View>
                <View style={styles.completionBarWrap}>
                  <View style={styles.completionTrack}>
                    <View style={[styles.completionFill, { width: `${completionRate}%`, backgroundColor: completionRate >= 70 ? Colors.green : completionRate >= 40 ? Colors.primaryYellow : Colors.red }]} />
                  </View>
                  <View style={styles.completionLabels}>
                    <Text style={styles.completionMeta}>Today: {fuDoneToday.length}/{fuToday.length}</Text>
                    <Text style={styles.completionMeta}>Week: {fuDoneThisWeek.length}/{fuThisWeek.length}</Text>
                  </View>
                </View>
              </View>
            </BrutalistCard>
          </>
        )}

        {/* ────────────── LEADS ────────────── */}
        {activeTab === 'leads' && (
          <>
            {myLeads.length === 0 ? (
              <BrutalistCard style={styles.emptyCard}>
                <Feather name="users" size={28} color={Colors.lightGray} />
                <Text style={styles.emptyText}>No leads assigned</Text>
              </BrutalistCard>
            ) : (
              <>
                {activeLeads.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>ACTIVE ({activeLeads.length})</Text>
                    {activeLeads.map(lead => (
                      <Pressable key={lead.id} onPress={() => router.push(`/lead/${lead.id}`)}>
                        <BrutalistCard style={styles.leadCard}>
                          <View style={styles.leadRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.leadName}>{lead.name}</Text>
                              <Text style={styles.leadPhone}>{lead.phone}</Text>
                              {lead.budgetMax && (
                                <Text style={styles.leadBudget}>Budget: ₹{formatCurrency(lead.budgetMax)}</Text>
                              )}
                            </View>
                            <View style={styles.leadRight}>
                              <View style={[styles.statusPill, { backgroundColor: STATUS_META[lead.status].color }]}>
                                <Text style={styles.statusPillText}>{STATUS_META[lead.status].label}</Text>
                              </View>
                              <Text style={styles.leadDate}>{formatDate(lead.updatedAt)}</Text>
                              <Feather name="chevron-right" size={16} color={Colors.gray} />
                            </View>
                          </View>
                          {lead.city && (
                            <View style={styles.leadMeta}>
                              <Feather name="map-pin" size={11} color={Colors.gray} />
                              <Text style={styles.leadMetaText}>{lead.city}</Text>
                              {lead.preferredPropertyType && (
                                <Text style={styles.leadMetaText}> · {lead.preferredPropertyType}</Text>
                              )}
                            </View>
                          )}
                        </BrutalistCard>
                      </Pressable>
                    ))}
                  </>
                )}

                {closedLeads.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>DEALS DONE ({closedLeads.length})</Text>
                    {closedLeads.map(lead => (
                      <Pressable key={lead.id} onPress={() => router.push(`/lead/${lead.id}`)}>
                        <BrutalistCard style={[styles.leadCard, { backgroundColor: '#EDFFF5' }]}>
                          <View style={styles.leadRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.leadName}>{lead.name}</Text>
                              <Text style={styles.leadPhone}>{lead.phone}</Text>
                            </View>
                            <View style={styles.leadRight}>
                              <View style={[styles.statusPill, { backgroundColor: Colors.green }]}>
                                <Text style={styles.statusPillText}>Deal Done</Text>
                              </View>
                              <Text style={styles.leadDate}>{formatDate(lead.updatedAt)}</Text>
                            </View>
                          </View>
                        </BrutalistCard>
                      </Pressable>
                    ))}
                  </>
                )}

                {lostLeads.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>LOST ({lostLeads.length})</Text>
                    {lostLeads.map(lead => (
                      <Pressable key={lead.id} onPress={() => router.push(`/lead/${lead.id}`)}>
                        <BrutalistCard style={[styles.leadCard, { opacity: 0.7 }]}>
                          <View style={styles.leadRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.leadName}>{lead.name}</Text>
                              <Text style={styles.leadPhone}>{lead.phone}</Text>
                            </View>
                            <View style={styles.leadRight}>
                              <View style={[styles.statusPill, { backgroundColor: Colors.red }]}>
                                <Text style={styles.statusPillText}>Lost</Text>
                              </View>
                              <Text style={styles.leadDate}>{formatDate(lead.updatedAt)}</Text>
                            </View>
                          </View>
                        </BrutalistCard>
                      </Pressable>
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ────────────── ACTIVITY ────────────── */}
        {activeTab === 'activity' && (
          <>
            {/* Period selector */}
            <View style={styles.periodRow}>
              {(['today', 'week', 'month'] as const).map(p => (
                <Pressable key={p} onPress={() => setActivityPeriod(p)}
                  style={[styles.periodBtn, activityPeriod === p && styles.periodBtnActive]}>
                  <Text style={[styles.periodBtnText, activityPeriod === p && styles.periodBtnTextActive]}>
                    {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Summary counts */}
            <View style={styles.actSummaryRow}>
              {[
                { label: 'Follow-ups', val: myFollowUps.filter(f => inRange(f.date, actRange.start, actRange.end)).length, icon: 'clock' },
                { label: 'Done', val: myFollowUps.filter(f => inRange(f.date, actRange.start, actRange.end) && f.status === 'done').length, icon: 'check-circle' },
                { label: 'Logged', val: periodActivities.length, icon: 'activity' },
              ].map(s => (
                <BrutalistCard key={s.label} style={styles.actSummaryCard}>
                  <Feather name={s.icon as any} size={16} color={Colors.charcoal} />
                  <Text style={styles.actSummaryVal}>{s.val}</Text>
                  <Text style={styles.actSummaryLabel}>{s.label}</Text>
                </BrutalistCard>
              ))}
            </View>

            {/* Follow-ups for period */}
            {myFollowUps.filter(f => inRange(f.date, actRange.start, actRange.end)).length > 0 && (
              <>
                <Text style={styles.sectionTitle}>FOLLOW-UPS</Text>
                {myFollowUps
                  .filter(f => inRange(f.date, actRange.start, actRange.end))
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map(f => (
                    <BrutalistCard key={f.id} style={[styles.actCard, f.status === 'done' && styles.actCardDone]}>
                      <View style={[styles.actIcon, { backgroundColor: f.status === 'done' ? Colors.green : f.date < today ? Colors.red : Colors.primaryYellow }]}>
                        <Feather name={f.type === 'call' ? 'phone' : f.type === 'site_visit' ? 'map-pin' : f.type === 'whatsapp' ? 'message-circle' : 'mail'} size={14} color={Colors.black} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.actTitle}>{f.leadName}</Text>
                        <Text style={styles.actDesc}>{f.type.replace('_', ' ')} · {f.notes || 'No notes'}</Text>
                      </View>
                      <View style={styles.actRight}>
                        <Text style={styles.actDate}>{formatDate(f.date)}</Text>
                        <View style={[styles.actStatus, { backgroundColor: f.status === 'done' ? Colors.green : f.status === 'overdue' ? Colors.red : Colors.lightGray }]}>
                          <Text style={styles.actStatusText}>{f.status.toUpperCase()}</Text>
                        </View>
                      </View>
                    </BrutalistCard>
                  ))}
              </>
            )}

            {/* Activity log */}
            {activityPeriod !== 'today' && (
              <>
                {todayActivities.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>TODAY</Text>
                    {todayActivities.map(a => <ActivityRow key={a.id} activity={a} />)}
                  </>
                )}
                {weekActivities.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>EARLIER THIS WEEK</Text>
                    {weekActivities.map(a => <ActivityRow key={a.id} activity={a} />)}
                  </>
                )}
                {activityPeriod === 'month' && monthActivities.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>EARLIER THIS MONTH</Text>
                    {monthActivities.map(a => <ActivityRow key={a.id} activity={a} />)}
                  </>
                )}
              </>
            )}
            {activityPeriod === 'today' && todayActivities.length === 0 && myFollowUps.filter(f => f.date === today).length === 0 && (
              <BrutalistCard style={styles.emptyCard}>
                <Feather name="sun" size={28} color={Colors.lightGray} />
                <Text style={styles.emptyText}>No activity logged today</Text>
              </BrutalistCard>
            )}
            {activityPeriod !== 'today' && periodActivities.length === 0 && myFollowUps.filter(f => inRange(f.date, actRange.start, actRange.end)).length === 0 && (
              <BrutalistCard style={styles.emptyCard}>
                <Feather name="inbox" size={28} color={Colors.lightGray} />
                <Text style={styles.emptyText}>No activity in this period</Text>
              </BrutalistCard>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ActivityRow({ activity }: { activity: { id: string; type: string; description: string; timestamp: string; agent?: string } }) {
  return (
    <BrutalistCard style={styles.actCard}>
      <View style={[styles.actIcon, { backgroundColor: Colors.lightGray }]}>
        <Feather name={(ACTIVITY_ICONS[activity.type] || 'circle') as any} size={14} color={Colors.charcoal} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actTitle}>{activity.description}</Text>
        <Text style={styles.actDesc}>{activity.type.replace('_', ' ')}</Text>
      </View>
      <Text style={styles.actDate}>{formatDate(activity.timestamp)}</Text>
    </BrutalistCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: Colors.black, gap: 10,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontFamily: 'DMSans_800ExtraBold', fontSize: 20, color: Colors.black },
  rolePill: { paddingHorizontal: 10, paddingVertical: 4, borderWidth: 2, borderColor: Colors.black, borderRadius: 20 },
  rolePillText: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: Colors.black },
  memberCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 2, borderBottomColor: Colors.black,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: Colors.black,
  },
  avatarText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 22, color: Colors.black },
  memberName: { fontFamily: 'DMSans_800ExtraBold', fontSize: 18, color: Colors.black },
  memberSub: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.gray, marginTop: 2 },
  memberStatus: { fontFamily: 'DMSans_500Medium', fontSize: 12, marginTop: 4 },
  quickStats: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.lightGray,
  },
  statChip: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderWidth: 2, borderColor: Colors.black, borderRadius: 12,
    shadowColor: Colors.black, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0,
  },
  statChipVal: { fontFamily: 'DMSans_800ExtraBold', fontSize: 18, color: Colors.black },
  statChipLabel: { fontFamily: 'DMSans_400Regular', fontSize: 9, color: Colors.charcoal, marginTop: 2 },
  tabRow: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 12,
    borderWidth: 2, borderColor: Colors.black, borderRadius: 10, overflow: 'hidden',
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: Colors.lightGray },
  tabBtnActive: { backgroundColor: Colors.charcoal },
  tabBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.gray },
  tabBtnTextActive: { color: Colors.white },
  scroll: { paddingHorizontal: 16, paddingTop: 12 },
  sectionTitle: {
    fontFamily: 'DMSans_800ExtraBold', fontSize: 11, color: Colors.gray,
    letterSpacing: 1.5, marginTop: 16, marginBottom: 8,
  },
  // Commission
  commissionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4,
  },
  commissionLabel: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.charcoal },
  commissionVal: { fontFamily: 'DMSans_800ExtraBold', fontSize: 22, color: Colors.black },
  commissionSub: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.charcoal },
  // Grid
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCard: { width: '47%', alignItems: 'center', paddingVertical: 16 },
  gridVal: { fontFamily: 'DMSans_800ExtraBold', fontSize: 28, color: Colors.black },
  gridLabel: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.gray, marginTop: 4, textAlign: 'center' },
  // Today row
  todayRow: { flexDirection: 'row', gap: 8 },
  todayCard: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  todayVal: { fontFamily: 'DMSans_800ExtraBold', fontSize: 22, color: Colors.black },
  todayLabel: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.gray, marginTop: 4 },
  // Pipeline
  pipelineCard: { gap: 10 },
  pipelineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  pipelineLabel: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.charcoal, width: 90 },
  barTrack: { flex: 1, height: 8, backgroundColor: Colors.lightGray, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  pipelineCount: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.black, width: 24, textAlign: 'right' },
  // Completion
  completionCard: {},
  completionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  completionPct: { fontFamily: 'DMSans_800ExtraBold', fontSize: 32, color: Colors.black },
  completionSub: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.gray },
  completionBarWrap: { flex: 1, justifyContent: 'center', gap: 8 },
  completionTrack: { height: 12, backgroundColor: Colors.lightGray, borderRadius: 6, overflow: 'hidden' },
  completionFill: { height: 12, borderRadius: 6 },
  completionLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  completionMeta: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.gray },
  // Leads
  leadCard: { marginBottom: 8 },
  leadRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  leadName: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.black },
  leadPhone: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.gray, marginTop: 2 },
  leadBudget: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: Colors.charcoal, marginTop: 3 },
  leadRight: { alignItems: 'flex-end', gap: 4 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.black },
  statusPillText: { fontFamily: 'DMSans_700Bold', fontSize: 10, color: Colors.black },
  leadDate: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.gray },
  leadMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: Colors.lightGray },
  leadMetaText: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.gray },
  // Activity
  periodRow: {
    flexDirection: 'row', gap: 6, marginBottom: 12,
    borderWidth: 2, borderColor: Colors.black, borderRadius: 10, overflow: 'hidden',
  },
  periodBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: Colors.lightGray },
  periodBtnActive: { backgroundColor: Colors.charcoal },
  periodBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: Colors.gray },
  periodBtnTextActive: { color: Colors.white },
  actSummaryRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  actSummaryCard: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12 },
  actSummaryVal: { fontFamily: 'DMSans_800ExtraBold', fontSize: 20, color: Colors.black },
  actSummaryLabel: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: Colors.gray },
  actCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  actCardDone: { backgroundColor: '#F5FFF9' },
  actIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.black },
  actTitle: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.black },
  actDesc: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.gray, marginTop: 2 },
  actRight: { alignItems: 'flex-end', gap: 4 },
  actDate: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.gray },
  actStatus: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  actStatusText: { fontFamily: 'DMSans_700Bold', fontSize: 9, color: Colors.black },
  emptyCard: { alignItems: 'center', paddingVertical: 36, gap: 10, marginTop: 8 },
  emptyText: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.gray },
});
