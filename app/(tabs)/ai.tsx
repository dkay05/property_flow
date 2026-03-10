import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Platform,
  FlatList, Modal, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useData } from '@/lib/data-context';
import { BrutalistCard, BrutalistButton, EmptyState } from '@/components/ui';
import { formatCurrency } from '@/lib/format';
import { AIMatch } from '@/lib/types';

type ChatMessage = {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: string;
};

function AIMatchingSection() {
  const { leads, properties, getAIMatchesForLead, calculateAndSaveMatches, updateAIMatchResponse } = useData();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [matches, setMatches] = useState<AIMatch[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showLeadPicker, setShowLeadPicker] = useState(false);

  const activeLeads = leads.filter(l => l.status !== 'closed' && l.status !== 'dead');
  const selectedLead = leads.find(l => l.id === selectedLeadId);

  const handleSelectLead = useCallback(async (leadId: string) => {
    setSelectedLeadId(leadId);
    setShowLeadPicker(false);
    setIsCalculating(true);
    const existing = getAIMatchesForLead(leadId);
    if (existing.length > 0) {
      setMatches(existing);
      setIsCalculating(false);
    } else {
      const result = await calculateAndSaveMatches(leadId);
      setMatches(result);
      setIsCalculating(false);
    }
  }, [getAIMatchesForLead, calculateAndSaveMatches]);

  const handleRefresh = useCallback(async () => {
    if (!selectedLeadId) return;
    setIsCalculating(true);
    const result = await calculateAndSaveMatches(selectedLeadId);
    setMatches(result);
    setIsCalculating(false);
  }, [selectedLeadId, calculateAndSaveMatches]);

  const handleResponse = async (matchId: string, response: AIMatch['clientResponse']) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateAIMatchResponse(matchId, response);
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, clientResponse: response } : m));
  };

  const getConfidenceColor = (level: string) => {
    if (level === 'high') return Colors.green;
    if (level === 'medium') return Colors.yellowWarning;
    return Colors.gray;
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return Colors.green;
    if (score >= 40) return Colors.yellowWarning;
    return Colors.gray;
  };

  return (
    <View>
      <BrutalistCard style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="sparkles" size={20} color={Colors.black} />
          <Text style={styles.sectionTitle}>AI Property Matcher</Text>
        </View>
        <Text style={styles.sectionDesc}>
          Automatically match leads with best-fit properties based on budget, location, type and amenities.
        </Text>

        <Pressable onPress={() => setShowLeadPicker(true)} style={styles.leadSelector}>
          <Feather name="user" size={16} color={Colors.charcoal} />
          <Text style={[styles.leadSelectorText, !selectedLead && { color: Colors.gray }]}>
            {selectedLead ? selectedLead.name : 'Select a lead to match...'}
          </Text>
          <Feather name="chevron-down" size={16} color={Colors.gray} />
        </Pressable>

        {selectedLeadId && (
          <BrutalistButton
            title={isCalculating ? 'Calculating...' : 'Refresh Matches'}
            icon="refresh-cw"
            onPress={handleRefresh}
            variant="secondary"
            small
            style={{ marginTop: 10 }}
            loading={isCalculating}
          />
        )}
      </BrutalistCard>

      {selectedLead && !isCalculating && (
        <View>
          <Text style={styles.matchHeader}>
            {matches.length > 0 ? `${matches.length} Properties Matched` : 'No matches found'}
          </Text>
          {matches.length === 0 && (
            <EmptyState icon="search" title="No matches yet" subtitle="Try refreshing or add more properties" />
          )}
          {matches.map(match => {
            const property = properties.find(p => p.id === match.propertyId);
            if (!property) return null;
            return (
              <BrutalistCard key={match.id} style={styles.matchCard}>
                <View style={styles.matchHeader2}>
                  <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(match.matchScore) }]}>
                    <Text style={styles.scoreText}>{match.matchScore}%</Text>
                  </View>
                  <View style={[styles.confidenceDot, { backgroundColor: getConfidenceColor(match.confidenceLevel) }]} />
                  <Text style={styles.confidenceText}>{match.confidenceLevel} confidence</Text>
                </View>

                <Text style={styles.matchPropName}>{property.address}</Text>
                <Text style={styles.matchPropSub}>{property.area}, {property.city}</Text>
                <Text style={styles.matchPrice}>{formatCurrency(property.price)}</Text>
                {property.bedrooms && <Text style={styles.matchDetails}>{property.bedrooms} BHK · {property.carpetArea} sq ft</Text>}

                <View style={styles.reasonsRow}>
                  {match.matchReasons.map((r, i) => (
                    <View key={i} style={styles.reasonTag}>
                      <Feather name="check" size={10} color={Colors.green} />
                      <Text style={styles.reasonText}>{r}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.responseRow}>
                  {(['interested', 'maybe', 'not_interested'] as AIMatch['clientResponse'][]).map(resp => (
                    <Pressable
                      key={resp}
                      onPress={() => handleResponse(match.id, resp)}
                      style={[
                        styles.respBtn,
                        match.clientResponse === resp && styles.respBtnActive,
                        resp === 'interested' && { borderColor: Colors.green },
                        resp === 'not_interested' && { borderColor: Colors.red },
                        resp === 'maybe' && { borderColor: Colors.yellowWarning },
                      ]}
                    >
                      <Text style={[
                        styles.respBtnText,
                        match.clientResponse === resp && { color: Colors.white },
                        resp === 'interested' && match.clientResponse === resp && { backgroundColor: Colors.green },
                      ]}>
                        {resp === 'interested' ? 'Interested' : resp === 'maybe' ? 'Maybe' : 'Not Int.'}
                      </Text>
                    </Pressable>
                  ))}
                  <Pressable
                    onPress={() => router.push({ pathname: '/property/[id]', params: { id: property.id } })}
                    style={styles.viewBtn}
                  >
                    <Feather name="eye" size={14} color={Colors.white} />
                  </Pressable>
                </View>
              </BrutalistCard>
            );
          })}
        </View>
      )}

      <Modal visible={showLeadPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Lead</Text>
              <Pressable onPress={() => setShowLeadPicker(false)}>
                <Feather name="x" size={22} color={Colors.black} />
              </Pressable>
            </View>
            <FlatList
              data={activeLeads}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <Pressable onPress={() => handleSelectLead(item.id)} style={styles.leadPickerItem}>
                  <View style={styles.leadPickerAvatar}>
                    <Text style={styles.leadPickerInitial}>{item.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.leadPickerName}>{item.name}</Text>
                    <Text style={styles.leadPickerSub}>
                      {item.city} · {item.budgetMin && item.budgetMax ? `${formatCurrency(item.budgetMin)}–${formatCurrency(item.budgetMax)}` : 'Budget TBD'}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={Colors.gray} />
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function AIChatSection() {
  const { properties, leads } = useData();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'ai',
      text: "Hi! I'm your PropertyFlow AI assistant. Ask me anything about properties, leads, or get recommendations. Try: 'Show 2BHK under 40L in Bangalore' or 'Which leads need follow-up today?'",
      timestamp: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const processQuery = useCallback((query: string): string => {
    const q = query.toLowerCase();

    if (q.includes('available') || q.includes('show') || q.includes('find') || q.includes('properties')) {
      let filtered = properties.filter(p => p.status === 'available');

      const bhkMatch = q.match(/(\d)\s*bhk/);
      if (bhkMatch) {
        filtered = filtered.filter(p => p.bedrooms === parseInt(bhkMatch[1]));
      }

      const priceMatch = q.match(/under\s+(\d+)\s*l/);
      if (priceMatch) {
        const limit = parseInt(priceMatch[1]) * 100000;
        filtered = filtered.filter(p => p.price <= limit);
      }

      const cityMatch = ['bangalore', 'mumbai', 'pune', 'hyderabad', 'delhi'].find(c => q.includes(c));
      if (cityMatch) {
        filtered = filtered.filter(p => p.city.toLowerCase().includes(cityMatch));
      }

      if (filtered.length === 0) {
        return "No properties match your criteria. Try adjusting your filters or check the Properties tab.";
      }

      const list = filtered.slice(0, 3).map(p =>
        `• ${p.address} — ${formatCurrency(p.price)}${p.bedrooms ? ` (${p.bedrooms} BHK)` : ''}`
      ).join('\n');
      return `Found ${filtered.length} matching properties:\n\n${list}${filtered.length > 3 ? `\n\n...and ${filtered.length - 3} more. Check Properties tab for full list.` : ''}`;
    }

    if (q.includes('lead') || q.includes('client')) {
      const activeLeads = leads.filter(l => l.status !== 'closed' && l.status !== 'dead');
      const today = new Date().toISOString().split('T')[0];

      if (q.includes('follow-up') || q.includes('followup')) {
        const urgent = leads.filter(l => {
          const daysSinceUpdate = Math.floor((Date.now() - new Date(l.updatedAt).getTime()) / 86400000);
          return daysSinceUpdate > 3 && l.status !== 'closed' && l.status !== 'dead';
        });
        if (urgent.length === 0) return "All leads are up to date! Great job.";
        const list = urgent.slice(0, 3).map(l => `• ${l.name} (${l.status.replace('_', ' ')}) - ${Math.floor((Date.now() - new Date(l.updatedAt).getTime()) / 86400000)} days ago`).join('\n');
        return `${urgent.length} leads need follow-up:\n\n${list}`;
      }

      if (q.includes('hot') || q.includes('negotiation') || q.includes('offer')) {
        const hot = leads.filter(l => l.status === 'negotiation' || l.status === 'offer');
        if (hot.length === 0) return "No hot leads right now. Focus on converting site visit leads.";
        const list = hot.map(l => `• ${l.name} — ${l.status.replace('_', ' ')}`).join('\n');
        return `${hot.length} hot leads:\n\n${list}`;
      }

      return `You have ${activeLeads.length} active leads. ${leads.filter(l => l.status === 'negotiation').length} in negotiation, ${leads.filter(l => l.status === 'offer').length} at offer stage.`;
    }

    if (q.includes('budget') || q.includes('price')) {
      const avgPrice = properties.filter(p => p.status === 'available').reduce((sum, p) => sum + p.price, 0) / properties.filter(p => p.status === 'available').length;
      return `Average available property price: ${formatCurrency(Math.round(avgPrice))}. Properties range from ${formatCurrency(Math.min(...properties.map(p => p.price)))} to ${formatCurrency(Math.max(...properties.map(p => p.price)))}.`;
    }

    if (q.includes('sold') || q.includes('closed')) {
      const closed = leads.filter(l => l.status === 'closed').length;
      const sold = properties.filter(p => p.status === 'sold').length;
      return `${closed} deals closed and ${sold} properties sold. Check the Pipeline tab for detailed conversion analytics.`;
    }

    const responses = [
      "I can help you find properties, analyze leads, or get market insights. Try asking:\n• 'Show 3BHK under 60L'\n• 'Which leads need follow-up?'\n• 'How many properties are available?'",
      "Try asking me about:\n• Property searches (type, budget, location)\n• Lead status summaries\n• Follow-up reminders\n• Deal pipeline stats",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }, [properties, leads]);

  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const userMsg: ChatMessage = {
      id: Date.now().toString(), role: 'user', text: input.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const response = processQuery(userMsg.text);
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(), role: 'ai', text: response,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 800);
  }, [input, processQuery]);

  return (
    <BrutalistCard style={styles.chatCard}>
      <View style={styles.sectionTitleRow}>
        <Ionicons name="chatbubbles" size={20} color={Colors.black} />
        <Text style={styles.sectionTitle}>AI Assistant</Text>
      </View>

      <View style={styles.chatMessages}>
        {messages.map(msg => (
          <View key={msg.id} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={[styles.bubbleText, msg.role === 'user' ? styles.userBubbleText : styles.aiBubbleText]}>
              {msg.text}
            </Text>
          </View>
        ))}
        {isTyping && (
          <View style={[styles.bubble, styles.aiBubble]}>
            <Text style={styles.aiBubbleText}>Thinking...</Text>
          </View>
        )}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.chatInput}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about properties or leads..."
            placeholderTextColor={Colors.gray}
            style={styles.chatTextInput}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <Pressable onPress={sendMessage} style={styles.sendBtn}>
            <Feather name="send" size={18} color={Colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </BrutalistCard>
  );
}

export default function AIScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'matching' | 'chat'>('matching');
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={24} color={Colors.black} />
          <Text style={styles.title}>AI Tools</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        {[
          { key: 'matching', label: 'Property Matcher', icon: 'target' as const },
          { key: 'chat', label: 'AI Chat', icon: 'message-circle' as const },
        ].map(tab => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key as 'matching' | 'chat')}
            style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
          >
            <Feather name={tab.icon} size={14} color={activeTab === tab.key ? Colors.white : Colors.black} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'web' ? 34 : 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'matching' ? <AIMatchingSection /> : <AIChatSection />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, marginTop: 12, marginBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontFamily: 'DMSans_800ExtraBold', fontSize: 28, color: Colors.black, letterSpacing: -1 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderWidth: 2, borderColor: Colors.black, backgroundColor: Colors.white,
  },
  tabBtnActive: { backgroundColor: Colors.charcoal },
  tabText: { fontFamily: 'DMSans_700Bold', fontSize: 12, color: Colors.black },
  tabTextActive: { color: Colors.white },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },
  sectionCard: { marginBottom: 16 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 16, color: Colors.black },
  sectionDesc: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: Colors.gray, marginBottom: 14, lineHeight: 18 },
  leadSelector: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 2, borderColor: Colors.black, padding: 12, backgroundColor: Colors.lightGray,
  },
  leadSelectorText: { flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 14, color: Colors.black },
  matchHeader: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.gray, marginBottom: 10 },
  matchCard: { marginBottom: 12 },
  matchHeader2: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  scoreBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: Colors.black,
  },
  scoreText: { fontFamily: 'DMSans_800ExtraBold', fontSize: 14, color: Colors.white },
  confidenceDot: { width: 8, height: 8, borderRadius: 4 },
  confidenceText: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: Colors.gray },
  matchPropName: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: Colors.black },
  matchPropSub: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.gray, marginTop: 2 },
  matchPrice: { fontFamily: 'DMSans_800ExtraBold', fontSize: 18, color: Colors.black, marginTop: 6 },
  matchDetails: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.charcoal, marginTop: 2 },
  reasonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  reasonTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.lightGray, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.black,
  },
  reasonText: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: Colors.black },
  responseRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  respBtn: {
    flex: 1, paddingVertical: 8, borderWidth: 2, borderColor: Colors.black,
    alignItems: 'center', justifyContent: 'center',
  },
  respBtnActive: { backgroundColor: Colors.charcoal },
  respBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 11, color: Colors.black },
  viewBtn: {
    width: 36, height: 36, backgroundColor: Colors.charcoal, alignItems: 'center',
    justifyContent: 'center', borderWidth: 2, borderColor: Colors.black,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.white, borderTopWidth: 2, borderTopColor: Colors.black,
    maxHeight: '70%', paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 2, borderBottomColor: Colors.black,
  },
  modalTitle: { fontFamily: 'DMSans_800ExtraBold', fontSize: 18, color: Colors.black },
  leadPickerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.lightGray,
  },
  leadPickerAvatar: {
    width: 40, height: 40, backgroundColor: Colors.primaryYellow,
    borderWidth: 2, borderColor: Colors.black, alignItems: 'center', justifyContent: 'center',
  },
  leadPickerInitial: { fontFamily: 'DMSans_800ExtraBold', fontSize: 16, color: Colors.black },
  leadPickerName: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: Colors.black },
  leadPickerSub: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: Colors.gray, marginTop: 2 },
  chatCard: { marginBottom: 16 },
  chatMessages: { gap: 10, marginBottom: 12, minHeight: 120 },
  bubble: { maxWidth: '85%', padding: 12, borderWidth: 2, borderColor: Colors.black },
  userBubble: { alignSelf: 'flex-end', backgroundColor: Colors.charcoal },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: Colors.primaryYellow },
  bubbleText: { fontFamily: 'DMSans_400Regular', fontSize: 13, lineHeight: 18 },
  userBubbleText: { color: Colors.white },
  aiBubbleText: { color: Colors.black },
  chatInput: { flexDirection: 'row', gap: 8 },
  chatTextInput: {
    flex: 1, borderWidth: 2, borderColor: Colors.black, padding: 12,
    fontFamily: 'DMSans_500Medium', fontSize: 13, color: Colors.black,
    backgroundColor: Colors.lightGray,
  },
  sendBtn: {
    width: 48, backgroundColor: Colors.charcoal, borderWidth: 2, borderColor: Colors.black,
    alignItems: 'center', justifyContent: 'center',
  },
});
