import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList,
  Modal, TextInput, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth-context';
import { FollowUp } from '@/lib/types';
import Colors from '@/constants/colors';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TYPE_COLORS: Record<string, string> = {
  call: Colors.sage, site_visit: Colors.blue, whatsapp: '#25D366',
  email: Colors.primaryYellow, sms: '#E8E8E8',
};
const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#FF4444', high: '#FF8800', normal: Colors.charcoal, low: Colors.gray,
};

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { followUps, updateFollowUp, leads, addFollowUp } = useData();
  const { member } = useAuth();

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newType, setNewType] = useState<'call' | 'site_visit' | 'whatsapp' | 'email' | 'sms'>('call');
  const [newTime, setNewTime] = useState('10:00');
  const [newNotes, setNewNotes] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');

  const daysInMonth = useMemo(() => {
    const days: { date: string; dayNum: number; isToday: boolean; isCurrent: boolean }[] = [];
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const todayStr = today.toISOString().split('T')[0];

    for (let i = 0; i < firstDay; i++) days.push({ date: '', dayNum: 0, isToday: false, isCurrent: false });
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ date: dateStr, dayNum: d, isToday: dateStr === todayStr, isCurrent: true });
    }
    return days;
  }, [currentYear, currentMonth]);

  const followUpsByDate = useMemo(() => {
    const map: Record<string, FollowUp[]> = {};
    followUps.forEach(fu => {
      if (!map[fu.date]) map[fu.date] = [];
      map[fu.date].push(fu);
    });
    return map;
  }, [followUps]);

  const selectedFollowUps = followUpsByDate[selectedDate] || [];

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentYear(y => y - 1); setCurrentMonth(11); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentYear(y => y + 1); setCurrentMonth(0); }
    else setCurrentMonth(m => m + 1);
  };

  const markDone = async (fu: FollowUp) => {
    await updateFollowUp(fu.id, { status: 'done' });
  };

  const handleAddFollowUp = async () => {
    if (!selectedLeadId) return;
    const lead = leads.find(l => l.id === selectedLeadId);
    if (!lead) return;
    await addFollowUp({ leadId: selectedLeadId, leadName: lead.name, type: newType, date: selectedDate, time: newTime, notes: newNotes, status: 'pending', priority: newPriority, assignedTo: member?.id });
    setShowAddModal(false);
    setNewNotes('');
    setSelectedLeadId('');
  };

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? insets.top + 67 : insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Follow-up Calendar</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Feather name="plus" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Month Navigator */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={22} color="#000" />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{MONTHS[currentMonth]} {currentYear}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={22} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Weekday headers */}
        <View style={styles.weekRow}>
          {WEEKDAYS.map(d => (
            <View key={d} style={styles.weekCell}>
              <Text style={styles.weekLabel}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calGrid}>
          {daysInMonth.map((item, idx) => {
            if (!item.isCurrent) return <View key={`empty-${idx}`} style={styles.dayCell} />;
            const hasFollowUps = !!(followUpsByDate[item.date]?.length);
            const isSelected = item.date === selectedDate;
            const overdueCount = (followUpsByDate[item.date] || []).filter(f => f.status === 'pending' && f.date < today.toISOString().split('T')[0]).length;
            return (
              <TouchableOpacity
                key={item.date}
                style={[styles.dayCell, isSelected && styles.dayCellSelected, item.isToday && !isSelected && styles.dayCellToday]}
                onPress={() => setSelectedDate(item.date)}
              >
                <Text style={[styles.dayNum, isSelected && styles.dayNumSelected, item.isToday && !isSelected && styles.dayNumToday]}>{item.dayNum}</Text>
                {hasFollowUps && (
                  <View style={[styles.dotRow]}>
                    {(followUpsByDate[item.date] || []).slice(0, 3).map((fu, i) => (
                      <View key={i} style={[styles.dot, { backgroundColor: overdueCount > 0 ? '#FF4444' : TYPE_COLORS[fu.type] || Colors.charcoal }]} />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected date follow-ups */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedDate === today.toISOString().split('T')[0] ? "Today's Follow-ups" : `${selectedDate}`}
            {selectedFollowUps.length > 0 && <Text style={styles.sectionCount}>  {selectedFollowUps.length}</Text>}
          </Text>
          {selectedFollowUps.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>No follow-ups scheduled</Text>
              <TouchableOpacity style={styles.addEmptyBtn} onPress={() => setShowAddModal(true)}>
                <Text style={styles.addEmptyText}>+ Schedule Follow-up</Text>
              </TouchableOpacity>
            </View>
          ) : (
            selectedFollowUps.map(fu => (
              <View key={fu.id} style={[styles.followUpCard, fu.status === 'done' && styles.followUpCardDone]}>
                <View style={styles.followUpLeft}>
                  <View style={[styles.typePill, { backgroundColor: TYPE_COLORS[fu.type] || '#eee' }]}>
                    <Text style={styles.typeText}>{fu.type.replace('_', ' ').toUpperCase()}</Text>
                  </View>
                  <Text style={styles.followUpName}>{fu.leadName}</Text>
                  {fu.time && <Text style={styles.followUpTime}>🕐 {fu.time}</Text>}
                  {fu.notes ? <Text style={styles.followUpNotes}>{fu.notes}</Text> : null}
                </View>
                <View style={styles.followUpRight}>
                  {fu.priority && (
                    <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[fu.priority] }]}>
                      <Text style={styles.priorityText}>{fu.priority}</Text>
                    </View>
                  )}
                  {fu.status !== 'done' && (
                    <TouchableOpacity style={styles.doneBtn} onPress={() => markDone(fu)}>
                      <Ionicons name="checkmark" size={18} color="#000" />
                    </TouchableOpacity>
                  )}
                  {fu.status === 'done' && (
                    <View style={styles.doneBadge}>
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Upcoming summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming (Next 7 Days)</Text>
          {(() => {
            const upcoming = followUps.filter(fu => {
              const fuDate = new Date(fu.date);
              const diff = (fuDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
              return diff > 0 && diff <= 7 && fu.status !== 'done';
            }).slice(0, 8);
            if (!upcoming.length) return <Text style={styles.emptyText}>No upcoming follow-ups this week</Text>;
            return upcoming.map(fu => (
              <TouchableOpacity key={fu.id} style={styles.upcomingRow} onPress={() => setSelectedDate(fu.date)}>
                <View style={[styles.upcomingDot, { backgroundColor: TYPE_COLORS[fu.type] || '#ccc' }]} />
                <View style={styles.upcomingInfo}>
                  <Text style={styles.upcomingName}>{fu.leadName}</Text>
                  <Text style={styles.upcomingDate}>{fu.date} {fu.time ? `at ${fu.time}` : ''}</Text>
                </View>
                <Text style={styles.upcomingType}>{fu.type.replace('_', ' ')}</Text>
              </TouchableOpacity>
            ));
          })()}
        </View>
        <View style={{ height: Platform.OS === 'web' ? insets.bottom + 34 : insets.bottom + 100 }} />
      </ScrollView>

      {/* Add Follow-up Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Follow-up</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>For date: {selectedDate}</Text>

            <Text style={styles.modalLabel}>Lead</Text>
            <ScrollView style={styles.leadPicker} horizontal showsHorizontalScrollIndicator={false}>
              {leads.slice(0, 8).map(l => (
                <TouchableOpacity key={l.id} style={[styles.leadChip, selectedLeadId === l.id && styles.leadChipSelected]} onPress={() => setSelectedLeadId(l.id)}>
                  <Text style={[styles.leadChipText, selectedLeadId === l.id && styles.leadChipTextSelected]}>{l.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Type</Text>
            <View style={styles.typeRow}>
              {(['call', 'site_visit', 'whatsapp', 'email'] as const).map(t => (
                <TouchableOpacity key={t} style={[styles.typeChip, newType === t && { backgroundColor: TYPE_COLORS[t] }]} onPress={() => setNewType(t)}>
                  <Text style={styles.typeChipText}>{t.replace('_', ' ')}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Time</Text>
            <TextInput style={styles.modalInput} value={newTime} onChangeText={setNewTime} placeholder="HH:MM" />

            <Text style={styles.modalLabel}>Priority</Text>
            <View style={styles.typeRow}>
              {(['normal', 'high', 'urgent'] as const).map(p => (
                <TouchableOpacity key={p} style={[styles.typeChip, newPriority === p && { backgroundColor: PRIORITY_COLORS[p] }]} onPress={() => setNewPriority(p)}>
                  <Text style={[styles.typeChipText, newPriority === p && { color: p === 'normal' ? '#fff' : '#fff' }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Notes</Text>
            <TextInput style={[styles.modalInput, { height: 70 }]} value={newNotes} onChangeText={setNewNotes} placeholder="What to discuss..." multiline />

            <TouchableOpacity style={styles.saveBtn} onPress={handleAddFollowUp} disabled={!selectedLeadId}>
              <Text style={styles.saveBtnText}>SCHEDULE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primaryYellow },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 2, borderColor: '#000', borderRadius: 10 },
  headerTitle: { flex: 1, fontFamily: 'DMSans_700Bold', fontSize: 20, color: '#000', textAlign: 'center' },
  addBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', borderWidth: 2, borderColor: '#000', borderRadius: 10 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 2, borderColor: '#000', borderRadius: 8 },
  monthTitle: { fontFamily: 'DMSans_700Bold', fontSize: 18, color: '#000' },
  weekRow: { flexDirection: 'row', paddingHorizontal: 8 },
  weekCell: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  weekLabel: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: '#666' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 0.85, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, borderRadius: 8 },
  dayCellSelected: { backgroundColor: '#000' },
  dayCellToday: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#000' },
  dayNum: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#000' },
  dayNumSelected: { color: '#fff', fontFamily: 'DMSans_700Bold' },
  dayNumToday: { fontFamily: 'DMSans_700Bold', color: '#000' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  section: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#000', borderRadius: 16, marginHorizontal: 16, marginTop: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 },
  sectionTitle: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: '#000', marginBottom: 12 },
  sectionCount: { color: Colors.blue, fontSize: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 20 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#666', textAlign: 'center' },
  addEmptyBtn: { marginTop: 12, backgroundColor: Colors.primaryYellow, borderWidth: 2, borderColor: '#000', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  addEmptyText: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: '#000' },
  followUpCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FAFAFA', borderWidth: 2, borderColor: '#000', borderRadius: 12, padding: 12, marginBottom: 10 },
  followUpCardDone: { opacity: 0.5 },
  followUpLeft: { flex: 1 },
  followUpRight: { alignItems: 'flex-end', gap: 6 },
  typePill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 6 },
  typeText: { fontFamily: 'DMSans_700Bold', fontSize: 10, color: '#000', letterSpacing: 0.5 },
  followUpName: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: '#000' },
  followUpTime: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#444', marginTop: 3 },
  followUpNotes: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#666', marginTop: 4 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priorityText: { fontFamily: 'DMSans_700Bold', fontSize: 10, color: '#fff', letterSpacing: 0.5 },
  doneBtn: { width: 32, height: 32, backgroundColor: Colors.primaryYellow, borderWidth: 2, borderColor: '#000', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  doneBadge: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  upcomingDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  upcomingInfo: { flex: 1 },
  upcomingName: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: '#000' },
  upcomingDate: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#666', marginTop: 1 },
  upcomingType: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: '#666' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopWidth: 3, borderTopColor: '#000', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: 'DMSans_700Bold', fontSize: 20, color: '#000' },
  modalLabel: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#555', marginBottom: 6, marginTop: 10 },
  modalInput: { borderWidth: 2, borderColor: '#000', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: 'DMSans_400Regular', fontSize: 15 },
  leadPicker: { maxHeight: 50, marginBottom: 4 },
  leadChip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: '#000', borderRadius: 20, marginRight: 8, backgroundColor: '#f5f5f5' },
  leadChipSelected: { backgroundColor: '#000' },
  leadChipText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#000' },
  leadChipTextSelected: { color: '#fff' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 2, borderColor: '#000', borderRadius: 20, backgroundColor: '#f5f5f5' },
  typeChipText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#000' },
  saveBtn: { backgroundColor: '#000', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: '#fff', letterSpacing: 1 },
});
