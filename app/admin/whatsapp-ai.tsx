import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Switch, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { BrutalistCard, BrutalistButton } from '@/components/ui';

const MOCK_AGENTS = [
  { id: '1', name: 'Lead Qualifier Bot', type: 'Lead Qualifier', status: true, interactions: 142, successRate: 68, lastActive: '2 mins ago' },
  { id: '2', name: 'Property Follow-up Agent', type: 'Follow-up Agent', status: false, interactions: 89, successRate: 74, lastActive: '1 day ago' },
];

const MOCK_CONVERSATIONS = [
  { id: '1', name: 'Rahul Gupta', preview: 'What is the price range for 2BHK?', time: '10 mins ago', status: 'replied' },
  { id: '2', name: 'Suman Rao', preview: 'I want to schedule a site visit...', time: '32 mins ago', status: 'pending' },
  { id: '3', name: 'Pooja Mehta', preview: 'The property looks good, I am...', time: '2 hrs ago', status: 'human_review' },
];

export default function WhatsAppAIScreen() {
  const insets = useSafeAreaInsets();
  const [agents, setAgents] = useState(MOCK_AGENTS);
  const [activeTab, setActiveTab] = useState<'agents' | 'conversations' | 'setup'>('agents');
  const [waNumber, setWaNumber] = useState('');
  const [apiKey, setApiKey] = useState('');
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const totalInteractions = agents.reduce((sum, a) => sum + a.interactions, 0);
  const avgSuccess = Math.round(agents.reduce((sum, a) => sum + a.successRate, 0) / agents.length);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.black} />
        </Pressable>
        <Text style={styles.title}>WhatsApp AI Agent</Text>
      </View>

      <View style={styles.integrationBanner}>
        <View style={styles.bannerIcon}>
          <Ionicons name="alert-circle" size={22} color={Colors.black} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Integration Required</Text>
          <Text style={styles.bannerText}>Connect WhatsApp Business API to enable automation</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        {[
          { label: 'Active Agents', value: agents.filter(a => a.status).length, icon: 'cpu' as const },
          { label: 'Total Msgs', value: totalInteractions, icon: 'message-circle' as const },
          { label: 'Success Rate', value: `${avgSuccess}%`, icon: 'trending-up' as const },
          { label: 'Pending Review', value: MOCK_CONVERSATIONS.filter(c => c.status === 'human_review').length, icon: 'eye' as const },
        ].map(stat => (
          <View key={stat.label} style={styles.statCard}>
            <Feather name={stat.icon} size={16} color={Colors.gray} />
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.tabRow}>
        {[
          { key: 'agents', label: 'AI Agents' },
          { key: 'conversations', label: 'Conversations' },
          { key: 'setup', label: 'Setup' },
        ].map(tab => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key as any)}
            style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'web' ? 34 : 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'agents' && (
          <View>
            {agents.map(agent => (
              <BrutalistCard key={agent.id} style={styles.agentCard}>
                <View style={styles.agentHeader}>
                  <View style={[styles.agentIcon, { backgroundColor: agent.status ? Colors.green : Colors.lightGray }]}>
                    <Feather name="cpu" size={20} color={agent.status ? Colors.white : Colors.gray} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.agentName}>{agent.name}</Text>
                    <Text style={styles.agentType}>{agent.type} · {agent.lastActive}</Text>
                  </View>
                  <Switch
                    value={agent.status}
                    onValueChange={val => setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, status: val } : a))}
                    trackColor={{ false: Colors.lightGray, true: Colors.green }}
                    thumbColor={Colors.white}
                  />
                </View>
                <View style={styles.agentStats}>
                  <View style={styles.agentStat}>
                    <Text style={styles.agentStatVal}>{agent.interactions}</Text>
                    <Text style={styles.agentStatLbl}>Interactions</Text>
                  </View>
                  <View style={styles.agentStat}>
                    <Text style={styles.agentStatVal}>{agent.successRate}%</Text>
                    <Text style={styles.agentStatLbl}>Success Rate</Text>
                  </View>
                  <Pressable style={styles.agentEditBtn}>
                    <Feather name="settings" size={14} color={Colors.charcoal} />
                    <Text style={styles.agentEditText}>Configure</Text>
                  </Pressable>
                </View>
              </BrutalistCard>
            ))}

            <BrutalistButton
              title="Add New Agent"
              icon="plus"
              onPress={() => {}}
              variant="secondary"
              style={{ marginTop: 8 }}
            />
          </View>
        )}

        {activeTab === 'conversations' && (
          <View>
            {MOCK_CONVERSATIONS.map(conv => (
              <BrutalistCard key={conv.id} style={styles.convCard}>
                <View style={styles.convHeader}>
                  <View style={styles.convAvatar}>
                    <Text style={styles.convInitial}>{conv.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.convName}>{conv.name}</Text>
                    <Text style={styles.convPreview} numberOfLines={1}>{conv.preview}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={styles.convTime}>{conv.time}</Text>
                    <View style={[styles.convStatus, {
                      backgroundColor: conv.status === 'replied' ? Colors.green :
                        conv.status === 'human_review' ? Colors.red : Colors.yellowWarning,
                    }]}>
                      <Text style={styles.convStatusText}>
                        {conv.status === 'replied' ? 'Replied' : conv.status === 'human_review' ? 'Review' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                </View>
              </BrutalistCard>
            ))}
          </View>
        )}

        {activeTab === 'setup' && (
          <View>
            <BrutalistCard style={styles.setupCard}>
              <Text style={styles.setupTitle}>WhatsApp Business API</Text>
              <Text style={styles.setupDesc}>
                Connect your WhatsApp Business account to enable automated messaging, lead qualification, and property suggestions via WhatsApp.
              </Text>

              <View style={styles.setupStep}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Get WhatsApp Business API</Text>
                  <Text style={styles.stepDesc}>Apply for Meta's WhatsApp Business API at business.facebook.com</Text>
                </View>
              </View>
              <View style={styles.setupStep}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Get Phone Number ID</Text>
                  <Text style={styles.stepDesc}>From your Meta Business dashboard, copy the Phone Number ID</Text>
                </View>
              </View>
              <View style={styles.setupStep}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Enter Credentials Below</Text>
                  <Text style={styles.stepDesc}>Paste your Phone ID and API key to activate</Text>
                </View>
              </View>
            </BrutalistCard>

            <BrutalistCard style={styles.setupCard}>
              <Text style={styles.setupTitle}>API Credentials</Text>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>WhatsApp Phone Number ID</Text>
                <TextInput
                  value={waNumber}
                  onChangeText={setWaNumber}
                  placeholder="e.g. 1234567890123456"
                  placeholderTextColor={Colors.gray}
                  style={styles.fieldInput}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>WhatsApp API Key</Text>
                <TextInput
                  value={apiKey}
                  onChangeText={setApiKey}
                  placeholder="EAAxxxxxxxxxx..."
                  placeholderTextColor={Colors.gray}
                  secureTextEntry
                  style={styles.fieldInput}
                />
              </View>
              <BrutalistButton
                title="Connect WhatsApp"
                icon="message-circle"
                onPress={() => {}}
                variant="charcoal"
                style={{ marginTop: 8 }}
              />
            </BrutalistCard>

            <BrutalistCard style={[styles.setupCard, { backgroundColor: Colors.primaryYellow }]}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <Feather name="info" size={18} color={Colors.black} />
                <Text style={styles.infoText}>
                  This feature requires a paid WhatsApp Business API subscription from Meta. Standard messaging rates apply.
                </Text>
              </View>
            </BrutalistCard>
          </View>
        )}
      </ScrollView>
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
  title: { fontFamily: 'DMSans_800ExtraBold', fontSize: 20, color: Colors.black },
  integrationBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.primaryYellow,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: Colors.black,
  },
  bannerIcon: {
    width: 36, height: 36, backgroundColor: Colors.white, borderWidth: 2, borderColor: Colors.black,
    alignItems: 'center', justifyContent: 'center',
  },
  bannerTitle: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.black },
  bannerText: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: Colors.charcoal, marginTop: 2 },
  statsRow: { flexDirection: 'row', backgroundColor: Colors.charcoal, paddingVertical: 12 },
  statCard: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontFamily: 'DMSans_800ExtraBold', fontSize: 18, color: Colors.white },
  statLabel: { fontFamily: 'DMSans_400Regular', fontSize: 9, color: Colors.gray, textAlign: 'center' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: Colors.black },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRightWidth: 1, borderRightColor: Colors.lightGray },
  tabBtnActive: { backgroundColor: Colors.charcoal },
  tabText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.black },
  tabTextActive: { color: Colors.white },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  agentCard: { marginBottom: 12 },
  agentHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  agentIcon: {
    width: 44, height: 44, borderWidth: 2, borderColor: Colors.black,
    alignItems: 'center', justifyContent: 'center',
  },
  agentName: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.black },
  agentType: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.gray, marginTop: 2 },
  agentStats: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.lightGray },
  agentStat: { flex: 1, alignItems: 'center' },
  agentStatVal: { fontFamily: 'DMSans_800ExtraBold', fontSize: 18, color: Colors.black },
  agentStatLbl: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: Colors.gray, marginTop: 2 },
  agentEditBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: Colors.black,
    backgroundColor: Colors.lightGray,
  },
  agentEditText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.charcoal },
  convCard: { marginBottom: 10 },
  convHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  convAvatar: {
    width: 40, height: 40, backgroundColor: Colors.sage, borderWidth: 2, borderColor: Colors.black,
    alignItems: 'center', justifyContent: 'center',
  },
  convInitial: { fontFamily: 'DMSans_800ExtraBold', fontSize: 16, color: Colors.black },
  convName: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.black },
  convPreview: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.gray, marginTop: 2 },
  convTime: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: Colors.gray },
  convStatus: { paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: Colors.black },
  convStatusText: { fontFamily: 'DMSans_700Bold', fontSize: 9, color: Colors.white },
  setupCard: { marginBottom: 14 },
  setupTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 15, color: Colors.black, marginBottom: 8 },
  setupDesc: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.gray, marginBottom: 16, lineHeight: 18 },
  setupStep: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  stepNum: {
    width: 28, height: 28, backgroundColor: Colors.charcoal, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.white },
  stepTitle: { fontFamily: 'DMSans_700Bold', fontSize: 13, color: Colors.black },
  stepDesc: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.gray, marginTop: 2 },
  formField: { marginBottom: 14 },
  fieldLabel: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.black, marginBottom: 6 },
  fieldInput: {
    borderWidth: 2, borderColor: Colors.black, padding: 12,
    fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.black,
  },
  infoText: { flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.black, lineHeight: 18 },
});
