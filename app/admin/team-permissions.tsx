import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Switch, Modal, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { BrutalistCard, BrutalistButton } from '@/components/ui';
import { useData } from '@/lib/data-context';
import { TeamMember, TeamPermissions, ROLE_PERMISSIONS } from '@/lib/types';

const PERMISSION_LABELS: { key: keyof TeamPermissions; label: string; group: string }[] = [
  { key: 'canViewLeads', label: 'View Leads', group: 'Leads' },
  { key: 'canCreateLeads', label: 'Create Leads', group: 'Leads' },
  { key: 'canEditLeads', label: 'Edit Leads', group: 'Leads' },
  { key: 'canDeleteLeads', label: 'Delete Leads', group: 'Leads' },
  { key: 'canViewProperties', label: 'View Properties', group: 'Properties' },
  { key: 'canCreateProperties', label: 'Create Properties', group: 'Properties' },
  { key: 'canEditProperties', label: 'Edit Properties', group: 'Properties' },
  { key: 'canDeleteProperties', label: 'Delete Properties', group: 'Properties' },
  { key: 'canTogglePropertyStatus', label: 'Toggle Status', group: 'Properties' },
  { key: 'canAddMedia', label: 'Add Media', group: 'Properties' },
  { key: 'canViewDeals', label: 'View Deals', group: 'Deals' },
  { key: 'canCreateDeals', label: 'Create Deals', group: 'Deals' },
  { key: 'canEditDeals', label: 'Edit Deals', group: 'Deals' },
  { key: 'canCloseDeals', label: 'Close Deals', group: 'Deals' },
  { key: 'canViewAllTeamData', label: 'View All Data', group: 'Admin' },
  { key: 'canAssignTasks', label: 'Assign Tasks', group: 'Admin' },
  { key: 'canManageTeam', label: 'Manage Team', group: 'Admin' },
  { key: 'canAccessReports', label: 'Access Reports', group: 'Admin' },
  { key: 'canManagePermissions', label: 'Manage Permissions', group: 'Admin' },
  { key: 'canUseAIMatching', label: 'AI Matching', group: 'AI' },
  { key: 'canManageAIAgents', label: 'Manage AI Agents', group: 'AI' },
  { key: 'canUseWhatsappAutomation', label: 'WhatsApp Bot', group: 'AI' },
];

const ROLE_COLORS: Record<string, string> = {
  owner: Colors.red,
  team_lead: Colors.primaryYellow,
  agent: Colors.sage,
  custom: Colors.blue,
};

function MemberCard({ member, onEdit }: { member: TeamMember; onEdit: () => void }) {
  const { updateTeamMember } = useData();

  return (
    <BrutalistCard style={styles.memberCard}>
      <View style={styles.memberHeader}>
        <View style={[styles.avatar, { backgroundColor: ROLE_COLORS[member.role] || Colors.sage }]}>
          <Text style={styles.avatarText}>{member.name.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.memberName}>{member.name}</Text>
          <Text style={styles.memberEmail}>{member.email || member.phone}</Text>
        </View>
        <View style={styles.memberRight}>
          <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[member.role] || Colors.sage }]}>
            <Text style={styles.roleText}>{member.role.replace('_', ' ').toUpperCase()}</Text>
          </View>
          <Switch
            value={member.isActive}
            onValueChange={val => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              updateTeamMember(member.id, { isActive: val });
            }}
            trackColor={{ false: Colors.lightGray, true: Colors.green }}
            thumbColor={Colors.white}
          />
        </View>
      </View>
      <Pressable onPress={onEdit} style={styles.permissionsBtn}>
        <Feather name="settings" size={14} color={Colors.charcoal} />
        <Text style={styles.permissionsBtnText}>Edit Permissions</Text>
        <Feather name="chevron-right" size={14} color={Colors.gray} />
      </Pressable>
    </BrutalistCard>
  );
}

function PermissionsModal({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  const { updateTeamMember, updateTeamPermissions } = useData();
  const [permissions, setPermissions] = useState<TeamPermissions>({ ...member.permissions });

  const groups = ['Leads', 'Properties', 'Deals', 'Admin', 'AI'];

  const handleToggle = (key: keyof TeamPermissions) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const applyRole = (role: 'owner' | 'team_lead' | 'agent') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPermissions({ ...ROLE_PERMISSIONS[role] });
    updateTeamMember(member.id, { role });
  };

  const handleSave = async () => {
    await updateTeamPermissions(member.id, permissions);
    onClose();
  };

  return (
    <Modal visible animationType="slide">
      <View style={[styles.modalContainer, { paddingTop: Platform.OS === 'web' ? 67 : 60 }]}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} style={styles.backBtn}>
            <Feather name="x" size={22} color={Colors.black} />
          </Pressable>
          <Text style={styles.modalTitle}>{member.name}'s Permissions</Text>
        </View>

        <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.rolePresetLabel}>ROLE PRESETS</Text>
          <View style={styles.rolePresetsRow}>
            {(['owner', 'team_lead', 'agent'] as const).map(role => (
              <Pressable
                key={role}
                onPress={() => applyRole(role)}
                style={[styles.presetBtn, { backgroundColor: ROLE_COLORS[role] }]}
              >
                <Text style={styles.presetBtnText}>{role.replace('_', ' ').toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>

          {groups.map(group => {
            const groupPerms = PERMISSION_LABELS.filter(p => p.group === group);
            return (
              <View key={group} style={styles.permGroup}>
                <Text style={styles.permGroupLabel}>{group.toUpperCase()}</Text>
                {groupPerms.map(perm => (
                  <View key={perm.key} style={styles.permRow}>
                    <Text style={styles.permLabel}>{perm.label}</Text>
                    <Switch
                      value={!!permissions[perm.key]}
                      onValueChange={() => handleToggle(perm.key)}
                      trackColor={{ false: Colors.lightGray, true: Colors.green }}
                      thumbColor={Colors.white}
                    />
                  </View>
                ))}
              </View>
            );
          })}

          <BrutalistButton
            title="Save Changes"
            onPress={handleSave}
            variant="charcoal"
            icon="check"
            style={{ marginTop: 16, marginBottom: 40 }}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

function AddMemberModal({ onClose }: { onClose: () => void }) {
  const { addTeamMember } = useData();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'owner' | 'team_lead' | 'agent'>('agent');

  const handleAdd = async () => {
    if (!name.trim() || !phone.trim()) return;
    await addTeamMember({
      name: name.trim(), phone: phone.trim(), email: email.trim() || undefined,
      role, isActive: true, permissions: ROLE_PERMISSIONS[role],
    });
    onClose();
  };

  return (
    <Modal visible animationType="slide" transparent>
      <View style={styles.addModalOverlay}>
        <View style={styles.addModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Team Member</Text>
            <Pressable onPress={onClose}>
              <Feather name="x" size={22} color={Colors.black} />
            </Pressable>
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Full Name *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter name"
              placeholderTextColor={Colors.gray}
              style={styles.fieldInput}
            />
          </View>
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Phone *</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 XXXXX XXXXX"
              placeholderTextColor={Colors.gray}
              keyboardType="phone-pad"
              style={styles.fieldInput}
            />
          </View>
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="email@company.com"
              placeholderTextColor={Colors.gray}
              keyboardType="email-address"
              style={styles.fieldInput}
            />
          </View>

          <Text style={styles.fieldLabel}>Role</Text>
          <View style={styles.roleRow}>
            {(['owner', 'team_lead', 'agent'] as const).map(r => (
              <Pressable
                key={r}
                onPress={() => setRole(r)}
                style={[styles.roleOption, role === r && styles.roleOptionActive]}
              >
                <Text style={[styles.roleOptionText, role === r && styles.roleOptionTextActive]}>
                  {r.replace('_', ' ')}
                </Text>
              </Pressable>
            ))}
          </View>

          <BrutalistButton
            title="Add Member"
            onPress={handleAdd}
            variant="charcoal"
            icon="user-plus"
            disabled={!name.trim() || !phone.trim()}
            style={{ marginTop: 20 }}
          />
        </View>
      </View>
    </Modal>
  );
}

export default function TeamPermissionsScreen() {
  const insets = useSafeAreaInsets();
  const { teamMembers } = useData();
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.black} />
        </Pressable>
        <Text style={styles.title}>Team & Permissions</Text>
        <Pressable
          style={styles.addBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowAddModal(true);
          }}
        >
          <Feather name="user-plus" size={18} color={Colors.black} />
        </Pressable>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{teamMembers.filter(m => m.isActive).length}</Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{teamMembers.filter(m => !m.isActive).length}</Text>
          <Text style={styles.summaryLabel}>Inactive</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{teamMembers.filter(m => m.role === 'owner').length}</Text>
          <Text style={styles.summaryLabel}>Owners</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{teamMembers.filter(m => m.role === 'agent').length}</Text>
          <Text style={styles.summaryLabel}>Agents</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'web' ? 34 : 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>TEAM MEMBERS</Text>
        {teamMembers.map(member => (
          <MemberCard key={member.id} member={member} onEdit={() => setEditingMember(member)} />
        ))}
      </ScrollView>

      {editingMember && (
        <PermissionsModal member={editingMember} onClose={() => setEditingMember(null)} />
      )}
      {showAddModal && <AddMemberModal onClose={() => setShowAddModal(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: Colors.black,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontFamily: 'DMSans_800ExtraBold', fontSize: 20, color: Colors.black },
  addBtn: {
    width: 40, height: 40, borderWidth: 2, borderColor: Colors.black,
    backgroundColor: Colors.primaryYellow, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.black, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row', backgroundColor: Colors.charcoal,
    paddingVertical: 14, paddingHorizontal: 16,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontFamily: 'DMSans_800ExtraBold', fontSize: 22, color: Colors.white },
  summaryLabel: { fontFamily: 'DMSans_500Medium', fontSize: 10, color: Colors.gray, marginTop: 2 },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  sectionLabel: {
    fontFamily: 'DMSans_800ExtraBold', fontSize: 11, color: Colors.gray,
    letterSpacing: 1.5, marginBottom: 12,
  },
  memberCard: { marginBottom: 12 },
  memberHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: {
    width: 44, height: 44, borderWidth: 2, borderColor: Colors.black,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 18, color: Colors.black },
  memberName: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.black },
  memberEmail: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.gray, marginTop: 2 },
  memberRight: { alignItems: 'flex-end', gap: 6 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1.5, borderColor: Colors.black },
  roleText: { fontFamily: 'DMSans_700Bold', fontSize: 9, color: Colors.black },
  permissionsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.lightGray,
  },
  permissionsBtnText: { flex: 1, fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.charcoal },
  modalContainer: { flex: 1, backgroundColor: Colors.white },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: Colors.black,
  },
  modalTitle: { flex: 1, fontFamily: 'DMSans_800ExtraBold', fontSize: 18, color: Colors.black },
  modalScroll: { paddingHorizontal: 16, paddingTop: 16 },
  rolePresetLabel: {
    fontFamily: 'DMSans_800ExtraBold', fontSize: 11, color: Colors.gray,
    letterSpacing: 1.5, marginBottom: 10,
  },
  rolePresetsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  presetBtn: {
    flex: 1, paddingVertical: 10, borderWidth: 2, borderColor: Colors.black,
    alignItems: 'center',
  },
  presetBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 10, color: Colors.black },
  permGroup: { marginBottom: 20 },
  permGroupLabel: {
    fontFamily: 'DMSans_800ExtraBold', fontSize: 11, color: Colors.gray,
    letterSpacing: 1.5, marginBottom: 10, paddingBottom: 6,
    borderBottomWidth: 1, borderBottomColor: Colors.lightGray,
  },
  permRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.lightGray,
  },
  permLabel: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.black },
  addModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  addModalContent: {
    backgroundColor: Colors.white, padding: 20,
    borderTopWidth: 2, borderTopColor: Colors.black, paddingBottom: 40,
  },
  formField: { marginBottom: 14 },
  fieldLabel: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.black, marginBottom: 6 },
  fieldInput: {
    borderWidth: 2, borderColor: Colors.black, padding: 12,
    fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.black,
  },
  roleRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  roleOption: {
    flex: 1, paddingVertical: 10, borderWidth: 2, borderColor: Colors.black,
    alignItems: 'center', backgroundColor: Colors.white,
  },
  roleOptionActive: { backgroundColor: Colors.charcoal },
  roleOptionText: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: Colors.black },
  roleOptionTextActive: { color: Colors.white },
});
