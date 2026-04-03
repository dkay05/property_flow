import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Switch, Modal, TextInput, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { BrutalistCard, BrutalistButton } from '@/components/ui';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth-context';
import { TeamMember, TeamPermissions, ROLE_PERMISSIONS } from '@/lib/types';

const ROLE_COLORS: Record<string, string> = {
  owner: Colors.red,
  team_lead: Colors.primaryYellow,
  agent: Colors.sage,
  custom: Colors.blue,
};

const PERMISSION_GROUPS = [
  {
    group: 'Leads',
    perms: [
      { key: 'canViewLeads', label: 'View Leads' },
      { key: 'canCreateLeads', label: 'Create Leads' },
      { key: 'canEditLeads', label: 'Edit Leads' },
      { key: 'canDeleteLeads', label: 'Delete Leads' },
    ],
  },
  {
    group: 'Properties',
    perms: [
      { key: 'canViewProperties', label: 'View Properties' },
      { key: 'canCreateProperties', label: 'Create Properties' },
      { key: 'canEditProperties', label: 'Edit Properties' },
      { key: 'canTogglePropertyStatus', label: 'Change Status' },
    ],
  },
  {
    group: 'Deals',
    perms: [
      { key: 'canViewDeals', label: 'View Deals' },
      { key: 'canCreateDeals', label: 'Create Deals' },
      { key: 'canCloseDeals', label: 'Close Deals' },
    ],
  },
  {
    group: 'Admin',
    perms: [
      { key: 'canViewAllTeamData', label: 'View All Data' },
      { key: 'canManageTeam', label: 'Manage Team' },
      { key: 'canAccessReports', label: 'Access Reports' },
    ],
  },
  {
    group: 'AI & Tools',
    perms: [
      { key: 'canUseAIMatching', label: 'AI Matching' },
      { key: 'canUseWhatsappAutomation', label: 'WhatsApp Bot' },
    ],
  },
];

function MemberCard({ member, onEdit, onBlock, onUnblock, isCurrentUser }: {
  member: TeamMember;
  onEdit: () => void;
  onBlock: () => void;
  onUnblock: () => Promise<void>;
  isCurrentUser: boolean;
}) {
  const { updateTeamMember } = useData();

  return (
    <BrutalistCard style={[styles.memberCard, member.isBlocked && styles.memberCardBlocked]}>
      <View style={styles.memberHeader}>
        <View style={[styles.avatar, { backgroundColor: member.isBlocked ? '#FFD0D0' : (ROLE_COLORS[member.role] || Colors.sage) }]}>
          <Text style={styles.avatarText}>{member.name.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.memberName}>{member.name}</Text>
            {isCurrentUser && (
              <View style={styles.youBadge}><Text style={styles.youBadgeText}>YOU</Text></View>
            )}
          </View>
          <Text style={styles.memberPhone}>{member.phone}</Text>
          {member.isBlocked && (
            <Text style={styles.blockedReason}>🚫 {member.blockedReason || 'Blocked by admin'}</Text>
          )}
        </View>
        <View style={styles.memberRight}>
          <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[member.role] || Colors.sage }]}>
            <Text style={styles.roleText}>{member.role.replace('_', ' ').toUpperCase()}</Text>
          </View>
          {!member.isBlocked && !isCurrentUser && (
            <Switch
              value={member.isActive}
              onValueChange={val => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                updateTeamMember(member.id, { isActive: val });
              }}
              trackColor={{ false: Colors.lightGray, true: Colors.green }}
              thumbColor={Colors.white}
            />
          )}
        </View>
      </View>

      <View style={styles.memberActions}>
        <Pressable onPress={onEdit} style={styles.actionBtn}>
          <Feather name="settings" size={14} color={Colors.charcoal} />
          <Text style={styles.actionBtnText}>Permissions</Text>
        </Pressable>
        {!isCurrentUser && !member.isBlocked && (
          <Pressable onPress={onBlock} style={[styles.actionBtn, styles.blockBtn]}>
            <Feather name="user-x" size={14} color={Colors.red} />
            <Text style={[styles.actionBtnText, { color: Colors.red }]}>Block Member</Text>
          </Pressable>
        )}
        {!isCurrentUser && member.isBlocked && (
          <Pressable onPress={onUnblock} style={[styles.actionBtn, styles.unblockBtn]}>
            <Feather name="user-check" size={14} color={Colors.green} />
            <Text style={[styles.actionBtnText, { color: Colors.green }]}>Unblock</Text>
          </Pressable>
        )}
      </View>
    </BrutalistCard>
  );
}

function PermissionsModal({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  const { updateTeamMember, updateTeamPermissions } = useData();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({ ...(member.permissions as Record<string, boolean>) });
  const [saving, setSaving] = useState(false);

  const handleToggle = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const applyRole = (role: 'owner' | 'team_lead' | 'agent') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const rp = ROLE_PERMISSIONS[role] as unknown as Record<string, boolean>;
    const mapped: Record<string, boolean> = {
      view_all_leads: rp.canViewAllTeamData,
      edit_leads: rp.canEditLeads,
      delete_leads: rp.canDeleteLeads,
      manage_properties: rp.canCreateProperties,
      view_reports: rp.canAccessReports,
      manage_blacklist: rp.canManageTeam,
      manage_filters: true,
      manage_deals: rp.canCreateDeals,
      access_admin: role === 'owner',
      manage_team: rp.canManageTeam,
      canViewLeads: rp.canViewLeads,
      canCreateLeads: rp.canCreateLeads,
      canEditLeads: rp.canEditLeads,
      canDeleteLeads: rp.canDeleteLeads,
      canViewProperties: rp.canViewProperties,
      canCreateProperties: rp.canCreateProperties,
      canEditProperties: rp.canEditProperties,
      canTogglePropertyStatus: rp.canTogglePropertyStatus,
      canViewDeals: rp.canViewDeals,
      canCreateDeals: rp.canCreateDeals,
      canCloseDeals: rp.canCloseDeals,
      canViewAllTeamData: rp.canViewAllTeamData,
      canManageTeam: rp.canManageTeam,
      canAccessReports: rp.canAccessReports,
      canUseAIMatching: rp.canUseAIMatching,
      canUseWhatsappAutomation: rp.canUseWhatsappAutomation,
    };
    setPermissions(mapped);
    updateTeamMember(member.id, { role });
  };

  const handleSave = async () => {
    setSaving(true);
    await updateTeamPermissions(member.id, permissions as any);
    setSaving(false);
    onClose();
  };

  return (
    <Modal visible animationType="slide">
      <View style={[styles.modalContainer, { paddingTop: Platform.OS === 'web' ? 67 : 60 }]}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={22} color={Colors.black} />
          </Pressable>
          <Text style={styles.modalTitle}>{member.name}'s Permissions</Text>
        </View>

        <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.groupHeader}>ROLE PRESETS</Text>
          <View style={styles.rolePresetsRow}>
            {(['owner', 'team_lead', 'agent'] as const).map(role => (
              <Pressable key={role} onPress={() => applyRole(role)} style={[styles.presetBtn, { backgroundColor: ROLE_COLORS[role] }]}>
                <Text style={styles.presetBtnText}>{role.replace('_', ' ').toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>

          {PERMISSION_GROUPS.map(({ group, perms }) => (
            <View key={group} style={styles.permGroup}>
              <Text style={styles.groupHeader}>{group.toUpperCase()}</Text>
              {perms.map(p => (
                <View key={p.key} style={styles.permRow}>
                  <Text style={styles.permLabel}>{p.label}</Text>
                  <Switch
                    value={!!permissions[p.key]}
                    onValueChange={() => handleToggle(p.key)}
                    trackColor={{ false: Colors.lightGray, true: Colors.green }}
                    thumbColor={Colors.white}
                  />
                </View>
              ))}
            </View>
          ))}

          <BrutalistButton
            title={saving ? 'Saving...' : 'Save Changes'}
            onPress={handleSave}
            variant="charcoal"
            icon="check"
            loading={saving}
            style={{ marginTop: 16, marginBottom: 40 }}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

function BlockMemberModal({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  const { blockTeamMember } = useData();
  const [reason, setReason] = useState('');
  const [blocking, setBlocking] = useState(false);

  const REASONS = [
    'Misconduct', 'Policy violation', 'Data breach', 'Unauthorized access', 'Client complaints', 'Fraud', 'Other',
  ];

  const handleBlock = async () => {
    if (!reason) { Alert.alert('Reason required', 'Please select or enter a reason'); return; }
    setBlocking(true);
    await blockTeamMember(member.id, reason);
    setBlocking(false);
    onClose();
  };

  return (
    <Modal visible animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.blockModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Block {member.name}</Text>
            <Pressable onPress={onClose}>
              <Feather name="x" size={22} color={Colors.black} />
            </Pressable>
          </View>

          <View style={[styles.warningBox]}>
            <Feather name="alert-triangle" size={18} color={Colors.red} />
            <Text style={styles.warningText}>
              This will immediately revoke {member.name}'s access. They won't be able to log in until unblocked.
            </Text>
          </View>

          <Text style={styles.fieldLabel}>Reason for blocking</Text>
          <View style={styles.reasonChips}>
            {REASONS.map(r => (
              <Pressable key={r} onPress={() => setReason(r)} style={[styles.reasonChip, reason === r && styles.reasonChipSelected]}>
                <Text style={[styles.reasonChipText, reason === r && styles.reasonChipTextSelected]}>{r}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={styles.reasonInput}
            value={reason}
            onChangeText={setReason}
            placeholder="Or type a custom reason..."
            placeholderTextColor={Colors.gray}
            multiline
          />

          <BrutalistButton
            title={blocking ? 'Blocking...' : 'Block Member'}
            onPress={handleBlock}
            variant="danger"
            icon="user-x"
            loading={blocking}
            style={{ marginTop: 16 }}
          />
        </View>
      </View>
    </Modal>
  );
}

function AddMemberModal({ onClose }: { onClose: () => void }) {
  const { addTeamMember } = useData();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'team_lead' | 'agent'>('agent');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!name.trim() || !phone.trim()) return;
    setAdding(true);
    await addTeamMember({ name: name.trim(), phone: phone.trim(), email: email.trim() || undefined, role, isActive: true, permissions: ROLE_PERMISSIONS[role] });
    setAdding(false);
    onClose();
  };

  return (
    <Modal visible animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.addModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Team Member</Text>
            <Pressable onPress={onClose}><Feather name="x" size={22} color={Colors.black} /></Pressable>
          </View>
          <Text style={styles.fieldLabel}>Full Name *</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Enter name" placeholderTextColor={Colors.gray} style={styles.fieldInput} />
          <Text style={styles.fieldLabel}>Phone *</Text>
          <TextInput value={phone} onChangeText={setPhone} placeholder="10-digit mobile number" placeholderTextColor={Colors.gray} keyboardType="phone-pad" style={styles.fieldInput} />
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput value={email} onChangeText={setEmail} placeholder="email@company.com" placeholderTextColor={Colors.gray} keyboardType="email-address" style={styles.fieldInput} />
          <Text style={styles.fieldLabel}>Role</Text>
          <View style={styles.rolePresetsRow}>
            {(['team_lead', 'agent'] as const).map(r => (
              <Pressable key={r} onPress={() => setRole(r)} style={[styles.presetBtn, { backgroundColor: role === r ? ROLE_COLORS[r] : Colors.lightGray }]}>
                <Text style={styles.presetBtnText}>{r.replace('_', ' ').toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.hintText}>Default password: agent123 (member can change it)</Text>
          <BrutalistButton title={adding ? 'Adding...' : 'Add Member'} onPress={handleAdd} variant="charcoal" icon="user-plus" loading={adding} style={{ marginTop: 16 }} />
        </View>
      </View>
    </Modal>
  );
}

export default function TeamPermissionsScreen() {
  const insets = useSafeAreaInsets();
  const { teamMembers, unblockTeamMember } = useData();
  const { member: currentMember, isOwner } = useAuth();

  const unblockHandler = async (id: string) => {
    await unblockTeamMember(id);
  };
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [blockTarget, setBlockTarget] = useState<TeamMember | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'blocked'>('active');
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const activeMembers = teamMembers.filter(m => !m.isBlocked);
  const blockedMembers = teamMembers.filter(m => m.isBlocked);
  const shownMembers = activeTab === 'active' ? activeMembers : blockedMembers;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="arrow-left" size={22} color={Colors.black} />
        </Pressable>
        <Text style={styles.screenTitle}>Team & Permissions</Text>
        {isOwner() && (
          <Pressable style={styles.addMemberBtn} onPress={() => setShowAddModal(true)}>
            <Feather name="user-plus" size={18} color={Colors.black} />
          </Pressable>
        )}
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <BrutalistCard style={[styles.statCard, { backgroundColor: Colors.primaryYellow }]}>
          <Text style={styles.statValue}>{activeMembers.length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </BrutalistCard>
        <BrutalistCard style={[styles.statCard, { backgroundColor: '#FFD0D0' }]}>
          <Text style={styles.statValue}>{blockedMembers.length}</Text>
          <Text style={styles.statLabel}>Blocked</Text>
        </BrutalistCard>
        <BrutalistCard style={[styles.statCard, { backgroundColor: Colors.sage }]}>
          <Text style={styles.statValue}>{activeMembers.filter(m => m.role === 'agent').length}</Text>
          <Text style={styles.statLabel}>Agents</Text>
        </BrutalistCard>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabs}>
        <Pressable onPress={() => setActiveTab('active')} style={[styles.tab, activeTab === 'active' && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>Active ({activeMembers.length})</Text>
        </Pressable>
        <Pressable onPress={() => setActiveTab('blocked')} style={[styles.tab, activeTab === 'blocked' && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === 'blocked' && styles.tabTextActive]}>Blocked ({blockedMembers.length})</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'web' ? 34 : 100 }]} showsVerticalScrollIndicator={false}>
        {shownMembers.length === 0 && (
          <BrutalistCard style={styles.emptyCard}>
            <Text style={styles.emptyText}>{activeTab === 'blocked' ? 'No blocked members' : 'No team members yet'}</Text>
          </BrutalistCard>
        )}
        {shownMembers.map(m => (
          <MemberCard
            key={m.id}
            member={m}
            onEdit={() => setSelectedMember(m)}
            onBlock={() => setBlockTarget(m)}
            onUnblock={async () => {
              Alert.alert('Unblock Member', `Allow ${m.name} to access the system again?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Unblock', onPress: () => unblockHandler(m.id) },
              ]);
            }}
            isCurrentUser={m.id === currentMember?.id}
          />
        ))}
      </ScrollView>

      {selectedMember && <PermissionsModal member={selectedMember} onClose={() => setSelectedMember(null)} />}
      {blockTarget && <BlockMemberModal member={blockTarget} onClose={() => setBlockTarget(null)} />}
      {showAddModal && <AddMemberModal onClose={() => setShowAddModal(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: Colors.black },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  screenTitle: { flex: 1, fontFamily: 'DMSans_800ExtraBold', fontSize: 20, color: Colors.black, marginLeft: 4 },
  addMemberBtn: { width: 40, height: 40, backgroundColor: Colors.primaryYellow, borderWidth: 2, borderColor: Colors.black, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  statCard: { flex: 1, alignItems: 'center', padding: 12, gap: 2 },
  statValue: { fontFamily: 'DMSans_800ExtraBold', fontSize: 22, color: Colors.black },
  statLabel: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.charcoal },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, borderWidth: 2, borderColor: Colors.black, borderRadius: 10, overflow: 'hidden' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: Colors.lightGray },
  tabActive: { backgroundColor: Colors.charcoal },
  tabText: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.gray },
  tabTextActive: { color: Colors.white },
  scroll: { paddingHorizontal: 16, paddingTop: 12 },
  memberCard: { marginBottom: 12 },
  memberCardBlocked: { backgroundColor: '#FFF5F5', borderColor: Colors.red },
  memberHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.black },
  avatarText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 20, color: Colors.black },
  memberName: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.black },
  memberPhone: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.gray, marginTop: 2 },
  blockedReason: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.red, marginTop: 3 },
  youBadge: { backgroundColor: Colors.blue, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  youBadgeText: { fontFamily: 'DMSans_700Bold', fontSize: 9, color: '#fff' },
  memberRight: { alignItems: 'flex-end', gap: 6 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1.5, borderColor: Colors.black, borderRadius: 6 },
  roleText: { fontFamily: 'DMSans_700Bold', fontSize: 10, color: Colors.black, letterSpacing: 0.3 },
  memberActions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: Colors.lightGray, paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: Colors.lightGray, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.black },
  actionBtnText: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.charcoal },
  blockBtn: { backgroundColor: '#FFE8E8', borderColor: Colors.red },
  unblockBtn: { backgroundColor: '#E8FFE8', borderColor: Colors.green },
  emptyCard: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: Colors.gray },
  // Modal styles
  modalContainer: { flex: 1, backgroundColor: Colors.white },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: Colors.black, gap: 12 },
  modalTitle: { flex: 1, fontFamily: 'DMSans_800ExtraBold', fontSize: 18, color: Colors.black },
  modalScroll: { paddingHorizontal: 16, paddingTop: 16 },
  groupHeader: { fontFamily: 'DMSans_800ExtraBold', fontSize: 11, color: Colors.gray, letterSpacing: 1.5, marginBottom: 10, marginTop: 16 },
  rolePresetsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  presetBtn: { paddingHorizontal: 14, paddingVertical: 9, borderWidth: 2, borderColor: Colors.black, borderRadius: 8 },
  presetBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.black },
  permGroup: { marginBottom: 8 },
  permRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.lightGray },
  permLabel: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.charcoal },
  // Block modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  blockModalContent: { backgroundColor: '#fff', borderTopWidth: 3, borderTopColor: Colors.black, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  warningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FFE8E8', borderWidth: 2, borderColor: Colors.red, borderRadius: 10, padding: 12, marginBottom: 16 },
  warningText: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.red },
  fieldLabel: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.charcoal, marginBottom: 8 },
  reasonChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  reasonChip: { paddingHorizontal: 12, paddingVertical: 7, borderWidth: 2, borderColor: Colors.black, borderRadius: 20, backgroundColor: Colors.lightGray },
  reasonChipSelected: { backgroundColor: Colors.red },
  reasonChipText: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.black },
  reasonChipTextSelected: { color: Colors.white },
  reasonInput: { borderWidth: 2, borderColor: Colors.black, borderRadius: 10, padding: 12, fontFamily: 'DMSans_400Regular', fontSize: 14, minHeight: 70 },
  // Add modal
  addModalContent: { backgroundColor: '#fff', borderTopWidth: 3, borderTopColor: Colors.black, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  fieldInput: { borderWidth: 2, borderColor: Colors.black, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontFamily: 'DMSans_400Regular', fontSize: 15, marginBottom: 12, backgroundColor: '#FAFAFA' },
  hintText: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.gray, marginTop: 4, fontStyle: 'italic' },
});
