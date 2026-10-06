import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from './theme';

export async function runAction(action: () => Promise<void>) {
  try {
    await action();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        'Bu cihazda en fazla 64 program hatırlatıcısı kurulabilir.'
    ) {
      Alert.alert(
        'Hatırlatıcı sınırına ulaşıldı',
        'Yeni bir hatırlatıcı kurmak için mevcut hatırlatıcılardan birini kapatın.',
      );
      return;
    }
    if (
      error instanceof Error &&
      /bildirim izni|bildirimler için/i.test(error.message)
    ) {
      Alert.alert('Bildirim izni gerekli', error.message);
      return;
    }
    // Native hata ayrıntıları kullanıcıya gösterilmez.
    Alert.alert(
      'İşlem tamamlanamadı',
      'Bildirim iznini ve program hatırlatıcıları kanalını cihaz ayarlarından kontrol edip tekrar deneyin.',
    );
  }
}
export function Screen({ children }: { children: React.ReactNode }) {
  const colors = useTheme();
  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={styles.screen}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Label({
  children,
  large = false,
  muted = false,
}: {
  children: React.ReactNode;
  large?: boolean;
  muted?: boolean;
}) {
  const colors = useTheme();
  return (
    <Text
      style={{
        color: muted ? colors.muted : colors.text,
        fontSize: large ? 26 : 16,
        fontWeight: large ? '700' : '400',
        lineHeight: large ? 34 : 24,
      }}
    >
      {children}
    </Text>
  );
}
export function Card({ children }: { children: React.ReactNode }) {
  const colors = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {children}
    </View>
  );
}
export function Action({
  title,
  onPress,
  selected = false,
  disabled = false,
  label,
}: {
  title: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: selected ? colors.soft : colors.card,
          borderColor: selected ? colors.accent : colors.border,
          opacity: pressed || disabled ? 0.6 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: selected ? colors.accent : colors.text,
          fontSize: 15,
          fontWeight: '600',
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export const styles = StyleSheet.create({
  screen: { padding: 24, gap: 20, flexGrow: 1 },
  card: { padding: 20, borderRadius: 20, borderWidth: 1, gap: 10 },
  action: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 14,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
});
