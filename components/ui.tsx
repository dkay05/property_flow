import React from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { LeadStatus } from '@/lib/types';

interface BrutalistCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  borderColor?: string;
  large?: boolean;
}

export function BrutalistCard({ children, style, borderColor, large }: BrutalistCardProps) {
  return (
    <View style={[
      styles.card,
      large && styles.cardLarge,
      borderColor ? { borderColor } : undefined,
      style,
    ]}>
      {children}
    </View>
  );
}

interface BrutalistButtonProps {
  title?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'charcoal' | 'danger';
  icon?: keyof typeof Feather.glyphMap;
  iconSize?: number;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  small?: boolean;
  children?: React.ReactNode;
  loading?: boolean;
}

export function BrutalistButton({
  title, onPress, variant = 'primary', icon, iconSize = 18, disabled, style, textStyle, small, children, loading,
}: BrutalistButtonProps) {
  const bg = variant === 'charcoal' ? Colors.charcoal
    : variant === 'secondary' ? Colors.sage
    : variant === 'danger' ? Colors.red
    : Colors.primaryYellow;
  const textColor = variant === 'charcoal' || variant === 'danger' ? Colors.white : Colors.black;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg, opacity: disabled ? 0.5 : 1 },
        pressed && { transform: [{ scale: 0.95 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon && <Feather name={icon} size={iconSize} color={textColor} />}
          {title && <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: textColor }, textStyle]}>{title}</Text>}
          {children}
        </>
      )}
    </Pressable>
  );
}

interface BrutalistInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  multiline?: boolean;
  keyboardType?: TextInput['props']['keyboardType'];
  secureTextEntry?: boolean;
  style?: ViewStyle;
  autoFocus?: boolean;
}

export function BrutalistInput({
  value, onChangeText, placeholder, label, multiline, keyboardType, secureTextEntry, style, autoFocus,
}: BrutalistInputProps) {
  return (
    <View style={style}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.gray}
        multiline={multiline}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoFocus={autoFocus}
        style={[styles.input, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

interface StatusBadgeProps {
  status: LeadStatus | string;
  small?: boolean;
}

export function StatusBadge({ status, small }: StatusBadgeProps) {
  const config: Record<string, { bg: string; text: string }> = {
    inquiry: { bg: Colors.white, text: Colors.black },
    site_visit: { bg: Colors.primaryYellow, text: Colors.black },
    negotiation: { bg: Colors.yellowWarning, text: Colors.black },
    offer: { bg: Colors.primaryYellow, text: Colors.black },
    closed: { bg: Colors.green, text: Colors.white },
    dead: { bg: Colors.gray, text: Colors.white },
    available: { bg: Colors.green, text: Colors.white },
    sold: { bg: Colors.charcoal, text: Colors.white },
    rented: { bg: Colors.blue, text: Colors.white },
    under_offer: { bg: Colors.yellowWarning, text: Colors.black },
    pending: { bg: Colors.primaryYellow, text: Colors.black },
    done: { bg: Colors.green, text: Colors.white },
    overdue: { bg: Colors.red, text: Colors.white },
    snoozed: { bg: Colors.sage, text: Colors.black },
  };

  const c = config[status] || { bg: Colors.lightGray, text: Colors.black };
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, small && styles.badgeSmall]}>
      <Text style={[styles.badgeText, { color: c.text }, small && styles.badgeTextSmall]}>{label}</Text>
    </View>
  );
}

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
  count?: number;
}

export function SectionHeader({ title, action, onAction, count }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {count !== undefined && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{count}</Text>
          </View>
        )}
      </View>
      {action && onAction && (
        <Pressable onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: keyof typeof Feather.glyphMap; title: string; subtitle?: string }) {
  return (
    <View style={styles.empty}>
      <Feather name={icon} size={48} color={Colors.gray} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
    </View>
  );
}

export function LoadingView() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={Colors.charcoal} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.black,
    padding: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  cardLarge: {
    padding: 24,
    shadowOffset: { width: 8, height: 8 },
    elevation: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: Colors.black,
    shadowColor: Colors.black,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  buttonSmall: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowOffset: { width: 2, height: 2 },
  },
  buttonText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
  },
  buttonTextSmall: {
    fontSize: 12,
  },
  input: {
    borderWidth: 2,
    borderColor: Colors.black,
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: Colors.black,
  },
  inputLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.black,
    marginBottom: 6,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderWidth: 1.5,
  },
  badgeText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  badgeTextSmall: {
    fontSize: 9,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'DMSans_800ExtraBold',
    fontSize: 18,
    color: Colors.black,
    letterSpacing: -0.5,
  },
  sectionAction: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    color: Colors.charcoal,
    textDecorationLine: 'underline',
  },
  countBadge: {
    backgroundColor: Colors.charcoal,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  countText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    color: Colors.white,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: Colors.black,
  },
  emptySubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
