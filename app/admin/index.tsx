import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { BrutalistCard } from '@/components/ui';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth-context';

const ADMIN_MENU = [
  { id: 'team', icon: 'users' as const, title: 'Team & Permissions', desc: 'Manage members, roles and access control', route: '/admin/team-permissions', color: Colors.primaryYellow },
  { id: 'blacklist', icon: 'slash' as const, title: 'Client Blacklist', desc: 'Block spam, fraud and difficult clients', route: '/admin/blacklist', color: Colors.red },
  { id: 'calendar', icon: 'calendar' as const, title: 'Follow-up Calendar', desc: 'Full calendar view of all scheduled follow-ups', route: '/calendar', color: Colors.blue },
  { id: 'whatsapp', icon: 'message-circle' as const, title: 'WhatsApp AI Agent', desc: 'Automate WhatsApp follow-ups and lead qualification', route: '/admin/whatsapp-ai', color: Colors.green },
  { id: 'filters', icon: 'filter' as const, title: 'Saved Filters', desc: 'Manage your saved property and lead search filters', route: '/advanced-filters', color: Colors.sage },
];

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const { teamMembers, blacklist, leads, properties } = useData();
  const { member, logout, isOwner } = useAuth();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const activeTeam = teamMembers.filter(m => m.isActive && !m.isBlocked).length;
  const blockedTeam = teamMembers.filter(m => m.isBlocked).length;
  const activeBlacklist = blacklist.filter(b => b.isActive).length;
  const activePipeline = leads.filter(l => l.status !== 'lost' && l.status !== 'deal_done').length;
  const availableProps = properties.filter(p => p.status === 'available').length;

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.black} />
        </Pressable>
        <Text style={styles.title}>Admin Panel</Text>
        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
          <Feather name="log-out" size={18} color={Colors.black} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'web' ? 34 : 100 }]} showsVerticalScrollIndicator={false}>

        {/* Logged-in user card */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>{member?.name?.charAt(0) || '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{member?.name || 'Unknown'}</Text>
            <Text style={styles.userRole}>{member?.role?.replace('_', ' ').toUpperCase() || 'AGENT'}</Text>
          </View>
          <View style={[styles.rolePill, { backgroundColor: member?.role === 'owner' ? Colors.primaryYellow : member?.role === 'team_lead' ? Colors.sage : Colors.blue }]}>
            <Text style={styles.rolePillText}>{member?.role === 'owner' ? '👑 Owner' : member?.role === 'team_lead' ? '⭐ Lead' : '🔹 Agent'}</Text>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsRow}>
          {[
            { label: 'Active Team', value: activeTeam, icon: 'users' as const, color: Colors.primaryYellow },
            { label: 'Blocked Members', value: blockedTeam, icon: 'user-x' as const, color: '#FFD0D0' },
            { label: 'Client Blacklist', value: activeBlacklist, icon: 'slash' as const, color: Colors.red },
            { label: 'Available Props', value: availableProps, icon: 'home' as const, color: Colors.sage },
          ].map(stat => (
            <BrutalistCard key={stat.label} style={[styles.statCard, { backgroundColor: stat.color }]}>
              <Feather name={stat.icon} size={16} color={Colors.black} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </BrutalistCard>
          ))}
        </View>

        <Text style={styles.sectionLabel}>MANAGEMENT</Text>
        {ADMIN_MENU.map(item => (
          <Pressable key={item.id} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(item.route as any); }}>
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

        <Text style={styles.sectionLabel}>PROPERTY STATUS</Text>
        <BrutalistCard style={styles.quickCard}>
          <View style={styles.statusGrid}>
            {[
              { label: 'Available', count: properties.filter(p => p.status === 'available').length, color: Colors.green },
              { label: 'Sold', count: properties.filter(p => p.status === 'sold').length, color: Colors.charcoal },
              { label: 'Rented', count: properties.filter(p => p.status === 'rented_out').length, color: Colors.blue },
              { label: 'On Hold', count: properties.filter(p => p.status === 'on_hold').length, color: '#FFC107' },
              { label: 'Inactive', count: properties.filter(p => p.status === 'inactive').length, color: Colors.gray },
            ].map(s => (
              <View key={s.label} style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: s.color }]} />
                <Text style={styles.statusCount}>{s.count}</Text>
                <Text style={styles.statusLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
          <Pressable onPress={() => router.push('/(tabs)/properties')} style={styles.viewAllBtn}>
            <Text style={styles.viewAllText}>View All Properties</Text>
            <Feather name="arrow-right" size={14} color={Colors.charcoal} />
          </Pressable>
        </BrutalistCard>

        <Text style={styles.sectionLabel}>PIPELINE HEALTH</Text>
        <BrutalistCard style={styles.quickCard}>
          {[
            { label: 'Inquiry', count: leads.filter(l => l.status === 'inquiry').length },
            { label: 'Site Visit', count: leads.filter(l => l.status === 'site_visit').length },
            { label: 'Negotiation', count: leads.filter(l => l.status === 'negotiation').length },
            { label: 'Deal Done', count: leads.filter(l => l.status === 'deal_done').length },
          ].map(stage => (
            <View key={stage.label} style={styles.pipelineRow}>
              <Text style={styles.pipelineLabel}>{stage.label}</Text>
              <View style={styles.pipelineBarBg}>
                <View style={[styles.pipelineBar, { width: `${Math.min(100, stage.count * 25)}%` }]} />
              </View>
              <Text style={styles.pipelineCount}>{stage.count}</Text>
            </View>
          ))}
        </BrutalistCard>

        {/* Sign out button */}
        <Pressable onPress={handleLogout} style={styles.signOutRow}>
          <Feather name="log-out" size={16} color={Colors.red} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: Colors.black },
  backBtn: { padding: 4, marginRight: 8 },
  title: { flex: 1, fontFamily: 'DMSans_800ExtraBold', fontSize: 22, color: Colors.black },
  logoutBtn: { padding: 8, backgroundColor: '#FFE0E0', borderWidth: 2, borderColor: Colors.black, borderRadius: 8 },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.primaryYellow, borderWidth: 2, borderColor: Colors.black, borderRadius: 14, padding: 16, margin: 16, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 },
  userAvatar: { width: 48, height: 48, backgroundColor: '#000', borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 22, color: '#fff' },
  userName: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: '#000' },
  userRole: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#333', marginTop: 2 },
  rolePill: { paddingHorizontal: 10, paddingVertical: 5, borderWidth: 2, borderColor: '#000', borderRadius: 20 },
  rolePillText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: '#000' },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  statCard: { flex: 1, minWidth: '45%', alignItems: 'center', padding: 12, gap: 4 },
  statValue: { fontFamily: 'DMSans_800ExtraBold', fontSize: 24, color: Colors.black },
  statLabel: { fontFamily: 'DMSans_500Medium', fontSize: 10, color: Colors.charcoal, textAlign: 'center' },
  sectionLabel: { fontFamily: 'DMSans_800ExtraBold', fontSize: 11, color: Colors.gray, letterSpacing: 1.5, marginBottom: 10, marginTop: 4 },
  menuCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10, paddingVertical: 14 },
  menuIcon: { width: 48, height: 48, borderWidth: 2, borderColor: Colors.black, alignItems: 'center', justifyContent: 'center' },
  menuText: { flex: 1 },
  menuItemTitle: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.black },
  menuItemDesc: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.gray, marginTop: 2 },
  quickCard: { marginBottom: 14 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  statusItem: { alignItems: 'center', gap: 4, minWidth: '18%' },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusCount: { fontFamily: 'DMSans_800ExtraBold', fontSize: 18, color: Colors.black },
  statusLabel: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: Colors.gray, textAlign: 'center' },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.lightGray },
  viewAllText: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.charcoal },
  pipelineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  pipelineLabel: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.charcoal, width: 80 },
  pipelineBarBg: { flex: 1, height: 8, backgroundColor: Colors.lightGray, borderWidth: 1, borderColor: Colors.black },
  pipelineBar: { height: '100%', backgroundColor: Colors.charcoal },
  pipelineCount: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.black, width: 20, textAlign: 'right' },
  signOutRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', paddingVertical: 16, marginTop: 8, borderWidth: 2, borderColor: Colors.red, borderRadius: 12 },
  signOutText: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.red },
});
