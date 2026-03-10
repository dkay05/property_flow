import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { BrutalistCard } from '@/components/ui';
import { useData } from '@/lib/data-context';

const ADMIN_MENU = [
  {
    id: 'team',
    icon: 'users' as const,
    title: 'Team & Permissions',
    desc: 'Manage team members and control access',
    route: '/admin/team-permissions',
    color: Colors.primaryYellow,
  },
  {
    id: 'blacklist',
    icon: 'slash' as const,
    title: 'Blacklist Manager',
    desc: 'Block spam calls, fraud, and difficult clients',
    route: '/admin/blacklist',
    color: Colors.red,
  },
  {
    id: 'whatsapp',
    icon: 'message-circle' as const,
    title: 'WhatsApp AI Agent',
    desc: 'Automate WhatsApp follow-ups and lead qualification',
    route: '/admin/whatsapp-ai',
    color: Colors.green,
  },
  {
    id: 'filters',
    icon: 'filter' as const,
    title: 'Saved Filters',
    desc: 'Manage your saved property and lead search filters',
    route: '/advanced-filters',
    color: Colors.sage,
  },
];

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const { teamMembers, blacklist, leads, properties } = useData();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const activeTeam = teamMembers.filter(m => m.isActive).length;
  const activeBlacklist = blacklist.filter(b => b.isActive).length;
  const activePipeline = leads.filter(l => l.status !== 'closed' && l.status !== 'dead').length;
  const availableProps = properties.filter(p => p.status === 'available').length;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.black} />
        </Pressable>
        <Text style={styles.title}>Admin Panel</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'web' ? 34 : 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsRow}>
          {[
            { label: 'Team Members', value: activeTeam, icon: 'users' as const, color: Colors.primaryYellow },
            { label: 'Blocked', value: activeBlacklist, icon: 'slash' as const, color: Colors.red },
            { label: 'Active Leads', value: activePipeline, icon: 'trending-up' as const, color: Colors.green },
            { label: 'Available Props', value: availableProps, icon: 'home' as const, color: Colors.blue },
          ].map(stat => (
            <BrutalistCard key={stat.label} style={[styles.statCard, { backgroundColor: stat.color }]}>
              <Feather name={stat.icon} size={16} color={Colors.black} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </BrutalistCard>
          ))}
        </View>

        <Text style={styles.menuTitle}>MANAGEMENT</Text>

        {ADMIN_MENU.map(item => (
          <Pressable
            key={item.id}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(item.route as any);
            }}
          >
            <BrutalistCard style={styles.menuCard}>
              <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
                <Feather name={item.icon} size={22} color={Colors.black} />
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuItemTitle}>{item.title}</Text>
                <Text style={styles.menuItemDesc}>{item.desc}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={Colors.gray} />
            </BrutalistCard>
          </Pressable>
        ))}

        <Text style={styles.menuTitle}>QUICK ACTIONS</Text>

        <BrutalistCard style={styles.quickCard}>
          <Text style={styles.quickTitle}>Property Status Overview</Text>
          <View style={styles.statusGrid}>
            {[
              { label: 'Available', count: properties.filter(p => p.status === 'available').length, color: Colors.green },
              { label: 'Sold', count: properties.filter(p => p.status === 'sold').length, color: Colors.charcoal },
              { label: 'Rented Out', count: properties.filter(p => p.status === 'rented_out').length, color: Colors.blue },
              { label: 'On Hold', count: properties.filter(p => p.status === 'on_hold').length, color: Colors.yellowWarning },
              { label: 'Inactive', count: properties.filter(p => p.status === 'inactive').length, color: Colors.gray },
            ].map(s => (
              <View key={s.label} style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: s.color }]} />
                <Text style={styles.statusCount}>{s.count}</Text>
                <Text style={styles.statusLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/properties')}
            style={styles.viewAllBtn}
          >
            <Text style={styles.viewAllText}>View All Properties</Text>
            <Feather name="arrow-right" size={14} color={Colors.charcoal} />
          </Pressable>
        </BrutalistCard>

        <BrutalistCard style={styles.quickCard}>
          <Text style={styles.quickTitle}>Pipeline Health</Text>
          {[
            { label: 'Inquiry', count: leads.filter(l => l.status === 'inquiry').length },
            { label: 'Site Visit', count: leads.filter(l => l.status === 'site_visit').length },
            { label: 'Negotiation', count: leads.filter(l => l.status === 'negotiation').length },
            { label: 'Offer', count: leads.filter(l => l.status === 'offer').length },
          ].map(stage => (
            <View key={stage.label} style={styles.pipelineRow}>
              <Text style={styles.pipelineLabel}>{stage.label}</Text>
              <View style={styles.pipelineBarBg}>
                <View style={[styles.pipelineBar, { width: `${Math.min(100, stage.count * 20)}%` }]} />
              </View>
              <Text style={styles.pipelineCount}>{stage.count}</Text>
            </View>
          ))}
        </BrutalistCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: Colors.black,
  },
  backBtn: { padding: 4 },
  title: { fontFamily: 'DMSans_800ExtraBold', fontSize: 22, color: Colors.black },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  statCard: { flex: 1, minWidth: '45%', alignItems: 'center', padding: 12, gap: 4 },
  statValue: { fontFamily: 'DMSans_800ExtraBold', fontSize: 24, color: Colors.black },
  statLabel: { fontFamily: 'DMSans_500Medium', fontSize: 10, color: Colors.charcoal, textAlign: 'center' },
  menuTitle: {
    fontFamily: 'DMSans_800ExtraBold', fontSize: 11, color: Colors.gray,
    letterSpacing: 1.5, marginBottom: 10,
  },
  menuCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 10, paddingVertical: 14,
  },
  menuIcon: {
    width: 48, height: 48, borderWidth: 2, borderColor: Colors.black,
    alignItems: 'center', justifyContent: 'center',
  },
  menuText: { flex: 1 },
  menuItemTitle: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.black },
  menuItemDesc: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.gray, marginTop: 2 },
  quickCard: { marginBottom: 14 },
  quickTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 14, color: Colors.black, marginBottom: 14 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  statusItem: { alignItems: 'center', gap: 4, minWidth: '18%' },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusCount: { fontFamily: 'DMSans_800ExtraBold', fontSize: 18, color: Colors.black },
  statusLabel: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: Colors.gray, textAlign: 'center' },
  viewAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.lightGray,
  },
  viewAllText: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.charcoal },
  pipelineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  pipelineLabel: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.charcoal, width: 80 },
  pipelineBarBg: { flex: 1, height: 8, backgroundColor: Colors.lightGray, borderWidth: 1, borderColor: Colors.black },
  pipelineBar: { height: '100%', backgroundColor: Colors.charcoal },
  pipelineCount: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.black, width: 20, textAlign: 'right' },
});
