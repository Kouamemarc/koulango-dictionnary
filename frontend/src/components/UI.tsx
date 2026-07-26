/** Composants UI de base : bouton, champ, carte, chargement. */
import React from "react";
import {
  ActivityIndicator, Pressable, StyleSheet, Text, TextInput,
  TextInputProps, View, ViewStyle,
} from "react-native";
import { colors, font, radius, spacing } from "@/theme";

export function Button({
  title, onPress, loading, variant = "primary", disabled,
}: {
  title: string; onPress: () => void; loading?: boolean;
  variant?: "primary" | "ghost" | "danger"; disabled?: boolean;
}) {
  const bg = variant === "primary" ? colors.primary : variant === "danger" ? colors.danger : "transparent";
  const fg = variant === "ghost" ? colors.primary : "#fff";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: pressed || disabled ? 0.7 : 1 },
        variant === "ghost" && { borderWidth: 1, borderColor: colors.primary },
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.btnText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label?: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { paddingVertical: 14, borderRadius: radius.md, alignItems: "center", marginVertical: spacing.xs },
  btnText: { fontSize: font.body, fontWeight: "600" },
  label: { fontSize: font.small, color: colors.textMuted, marginBottom: 6, fontWeight: "500" },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12,
    fontSize: font.body, color: colors.text,
  },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
