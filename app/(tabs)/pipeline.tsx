import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useData } from '@/lib/data-context';
import { BrutalistCard, StatusBadge, SectionHeader, EmptyState } from '@/components/ui';
import { formatBudget, formatCurrency, daysAgo, statusLabel } from '@/lib/format';
import { Lead, LeadStatus } from '@/lib/types';

const PIPELINE_STAGES: { status: LeadStatus; color: string; icon: keyof typeof Feather.glyphMap }[] = [
  { status: 'inquiry', color: Colors.white, icon: 'inbox' },
  { status: 'site_visit', color: Colors.primaryYellow, icon: 'map-pin' },
  { status: 'negotiation', color: Colors.yellowWarning, icon: 'message-circle' },
  { status: 'offer', color: Colors.primaryYellow, icon: 'file-text' },
  { status: 'deal_done', color: Colors.green, icon: 'check-circle' },
];

export default function PipelineScreen() {
  const insets = useSafeAreaInsets();
  const { leads, deals, pipelineCounts, overdueFollowUps } = useData();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const totalDeals = leads.filter(l => l.status !== 'lost').length;
  const closedDeals = leads.filter(l => l.status === 'deal_done').length;
  const conversionRate = totalDeals > 0 ? Math.round((closedDeals / totalDeals) * 100) : 0;
  const totalPipelineValue = deals.reduce((sum, d) => d.status !== 'deal_done' ? sum + d.offerPrice : sum, 0);
  const totalCommission = deals.filter(d => d.status === 'deal_done').reduce((sum, d) => sum + d.commissionAmount, 0);

  const getLeadsForStage = (status: LeadStatus) => leads.filter(l => l.status === status);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Text style={styles.title}>Pipeline</Text>

        <View style={styles.metricsRow}>
          <BrutalistCard style={[styles.metricCard, { backgroundColor: Colors.primaryYellow }]}>
            <Text style={styles.metricNumber}>{totalDeals}</Text>
            <Text style={styles.metricLabel}>Total Deals</Text>
          </BrutalistCard>
          <BrutalistCard style={styles.metricCard}>
            <Text style={styles.metricNumber}>{conversionRate}%</Text>
            <Text style={styles.metricLabel}>Conversion</Text>
          </BrutalistCard>
        </View>
        <View style={styles.metricsRow}>
          <BrutalistCard style={styles.metricCard}>
            <Text style={styles.metricNumber}>{formatCurrency(totalPipelineValue)}</Text>
            <Text style={styles.metricLabel}>Pipeline Value</Text>
          </BrutalistCard>
          <BrutalistCard style={[styles.metricCard, { backgroundColor: Colors.green }]}>
            <Text style={[styles.metricNumber, { color: Colors.white }]}>{formatCurrency(totalCommission)}</Text>
            <Text style={[styles.metricLabel, { color: Colors.white }]}>Commission</Text>
          </BrutalistCard>
        </View>

        {PIPELINE_STAGES.map((stage, index) => {
          const stageLeads = getLeadsForStage(stage.status);
          return (
            <View key={stage.status} style={styles.stageSection}>
              <View style={styles.stageHeader}>
                <View style={[styles.stageIconCircle, { backgroundColor: stage.color }]}>
                  <Feather name={stage.icon} size={16} color={stage.status === 'deal_done' ? Colors.white : Colors.black} />
                </View>
                <Text style={styles.stageTitle}>{statusLabel(stage.status)}</Text>
                <View style={styles.stageCount}>
                  <Text style={styles.stageCountText}>{stageLeads.length}</Text>
                </View>
                {index < PIPELINE_STAGES.length - 1 && (
                  <View style={styles.stageArrow}>
                    <Feather name="arrow-down" size={14} color={Colors.gray} />
                  </View>
                )}
              </View>
              {stageLeads.length === 0 ? (
                <View style={styles.emptyStage}>
                  <Text style={styles.emptyStageText}>No deals at this stage</Text>
                </View>
              ) : (
                stageLeads.map(lead => {
                  const days = daysAgo(lead.updatedAt);
                  const isAtRisk = (stage.status === 'negotiation' || stage.status === 'offer') && days > 5;
                  return (
                    <Pressable
                      key={lead.id}
                      onPress={() => router.push({ pathname: '/lead/[id]', params: { id: lead.id } })}
                    >
                      <BrutalistCard
                        style={styles.dealCard}
                        borderColor={isAtRisk ? Colors.red : undefined}
                      >
                        <View style={styles.dealRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.dealName}>{lead.name}</Text>
                            <Text style={styles.dealInfo}>{lead.propertyInterest} | {lead.city}</Text>
                            <Text style={styles.dealBudget}>{formatBudget(lead.budgetMin, lead.budgetMax)}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 4 }}>
                            {isAtRisk && (
                              <View style={styles.atRiskBadge}>
                                <Feather name="alert-triangle" size={10} color={Colors.white} />
                                <Text style={styles.atRiskText}>At Risk</Text>
                              </View>
                            )}
                            <Text style={[styles.daysText, isAtRisk && { color: Colors.red }]}>
                              {days}d in stage
                            </Text>
                            {lead.assignedTo && <Text style={styles.agentText}>{lead.assignedTo}</Text>}
                          </View>
                        </View>
                      </BrutalistCard>
                    </Pressable>
                  );
                })
              )}
            </View>
          );
        })}

        {leads.some(l => l.status === 'lost') && (
          <View style={styles.stageSection}>
            <View style={styles.stageHeader}>
              <View style={[styles.stageIconCircle, { backgroundColor: Colors.gray }]}>
                <Feather name="x-circle" size={16} color={Colors.white} />
              </View>
              <Text style={styles.stageTitle}>Lost Leads</Text>
              <View style={styles.stageCount}>
                <Text style={styles.stageCountText}>{pipelineCounts.lost}</Text>
              </View>
            </View>
            {leads.filter(l => l.status === 'lost').map(lead => (
              <Pressable
                key={lead.id}
                onPress={() => router.push({ pathname: '/lead/[id]', params: { id: lead.id } })}
              >
                <BrutalistCard style={[styles.dealCard, { opacity: 0.6 }]}>
                  <Text style={styles.dealName}>{lead.name}</Text>
                  <Text style={styles.dealInfo}>{lead.notes || 'No reason specified'}</Text>
                </BrutalistCard>
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  scroll: { paddingHorizontal: 16 },
  title: {
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 28,
    color: Colors.black,
    letterSpacing: -1,
    marginTop: 12,
    marginBottom: 16,
  },
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  metricCard: { flex: 1, padding: 14 },
  metricNumber: {
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 24,
    color: Colors.black,
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.charcoal,
    marginTop: 2,
  },
  stageSection: { marginTop: 20 },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    position: 'relative',
  },
  stageIconCircle: {
    width: 32,
    height: 32,
    borderWidth: 2,
    borderColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageTitle: {
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 16,
    color: Colors.black,
    flex: 1,
  },
  stageCount: {
    backgroundColor: Colors.charcoal,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
  },
  stageCountText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 12,
    color: Colors.white,
  },
  stageArrow: {
    position: 'absolute',
    left: 13,
    bottom: -18,
  },
  emptyStage: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderStyle: 'dashed',
  },
  emptyStageText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.gray,
    textAlign: 'center',
  },
  dealCard: { marginBottom: 8 },
  dealRow: { flexDirection: 'row', alignItems: 'flex-start' },
  dealName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: Colors.black,
  },
  dealInfo: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.gray,
    marginTop: 2,
  },
  dealBudget: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.charcoal,
    marginTop: 2,
  },
  daysText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: Colors.gray,
  },
  agentText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: Colors.gray,
  },
  atRiskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.red,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  atRiskText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 10,
    color: Colors.white,
  },
});
