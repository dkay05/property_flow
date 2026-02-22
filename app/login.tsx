import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { BrutalistButton, BrutalistInput, BrutalistCard } from '@/components/ui';
import { useData } from '@/lib/data-context';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useData();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!name.trim() || !phone.trim()) return;
    setLoading(true);
    try {
      await login(name.trim(), phone.trim());
      router.replace('/(tabs)');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Feather name="home" size={32} color={Colors.black} />
            </View>
            <Text style={styles.appName}>PropertyFlow</Text>
            <Text style={styles.tagline}>Real Estate CRM Made Simple</Text>
          </View>

          <BrutalistCard large style={styles.formCard}>
            <Text style={styles.formTitle}>Welcome Back</Text>
            <Text style={styles.formSubtitle}>Sign in to manage your leads & deals</Text>

            <BrutalistInput
              label="Your Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Rajesh Kumar"
              style={{ marginTop: 20 }}
            />
            <BrutalistInput
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
              style={{ marginTop: 16 }}
            />

            <BrutalistButton
              title="Sign In"
              icon="log-in"
              onPress={handleLogin}
              variant="charcoal"
              disabled={!name.trim() || !phone.trim()}
              loading={loading}
              style={{ marginTop: 24 }}
            />
          </BrutalistCard>

          <View style={styles.footer}>
            <Text style={styles.footerText}>For demo, enter any name & phone</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryYellow,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 64,
    height: 64,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    marginBottom: 16,
  },
  appName: {
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 36,
    color: Colors.black,
    letterSpacing: -1.5,
  },
  tagline: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: Colors.charcoal,
    marginTop: 4,
  },
  formCard: {
    marginBottom: 24,
  },
  formTitle: {
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 24,
    color: Colors.black,
    letterSpacing: -0.5,
  },
  formSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.gray,
    marginTop: 4,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.charcoal,
  },
});
