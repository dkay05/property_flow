import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, Platform,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth-context';
import { useData } from '@/lib/data-context';
import Colors from '@/constants/colors';

const DEMO_ACCOUNTS = [
  { label: 'Owner (Rajesh)', phone: '9876543210', password: 'owner123', role: 'owner', color: Colors.primaryYellow },
  { label: 'Team Lead (Vikram)', phone: '9876543211', password: 'agent123', role: 'team_lead', color: Colors.sage },
  { label: 'Agent (Meera)', phone: '9876543212', password: 'agent123', role: 'agent', color: Colors.blue },
  { label: 'Agent (Sunil)', phone: '9876543213', password: 'agent123', role: 'agent', color: '#E8E8E8' },
];

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { refreshData } = useData();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (p?: string, pw?: string) => {
    const ph = p || phone.trim();
    const pass = pw || password;
    if (!ph || !pass) { setError('Enter phone and password'); return; }
    setLoading(true);
    setError('');
    try {
      await login(ph, pass);
      await refreshData();
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.primaryYellow }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 30 }]} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoIcon}>🏠</Text>
          </View>
          <Text style={styles.title}>PropertyFlow</Text>
          <Text style={styles.subtitle}>Real Estate CRM</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter your phone"
            keyboardType="phone-pad"
            placeholderTextColor="#999"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            secureTextEntry
            placeholderTextColor="#999"
          />

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={() => handleLogin()}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.loginBtnText}>LOGIN</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>Quick Demo Login</Text>
          {DEMO_ACCOUNTS.map(acc => (
            <TouchableOpacity
              key={acc.phone}
              style={[styles.demoCard, { backgroundColor: acc.color }]}
              onPress={() => handleLogin(acc.phone, acc.password)}
              activeOpacity={0.85}
            >
              <View>
                <Text style={styles.demoLabel}>{acc.label}</Text>
                <Text style={styles.demoPhone}>{acc.phone}</Text>
              </View>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{acc.role.replace('_', ' ').toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 20 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 80, height: 80, backgroundColor: '#000', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 2, borderColor: '#000' },
  logoIcon: { fontSize: 40 },
  title: { fontFamily: 'DMSans_800ExtraBold', fontSize: 32, color: '#000' },
  subtitle: { fontFamily: 'DMSans_400Regular', fontSize: 16, color: '#333', marginTop: 4 },
  card: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#000', borderRadius: 16, padding: 24, marginBottom: 28, shadowColor: '#000', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 1, shadowRadius: 0, elevation: 8 },
  cardTitle: { fontFamily: 'DMSans_700Bold', fontSize: 22, color: '#000', marginBottom: 20 },
  errorBox: { backgroundColor: '#FFE0E0', borderWidth: 1.5, borderColor: '#FF4444', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { fontFamily: 'DMSans_400Regular', color: '#CC0000', fontSize: 14 },
  label: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#000', marginBottom: 6 },
  input: { borderWidth: 2, borderColor: '#000', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontFamily: 'DMSans_400Regular', marginBottom: 16, backgroundColor: '#FAFAFA' },
  loginBtn: { backgroundColor: '#000', borderWidth: 2, borderColor: '#000', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4, shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: '#fff', letterSpacing: 1.5 },
  demoSection: { marginBottom: 20 },
  demoTitle: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: '#000', marginBottom: 12 },
  demoCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: '#000', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
  demoLabel: { fontFamily: 'DMSans_700Bold', fontSize: 14, color: '#000' },
  demoPhone: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#444', marginTop: 2 },
  roleBadge: { backgroundColor: '#000', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  roleText: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: '#fff', letterSpacing: 0.5 },
});
