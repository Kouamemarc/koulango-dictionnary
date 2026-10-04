/** Case de consentement obligatoire avant d'envoyer une contribution. */
import React from "react";
import { Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { font, spacing, useThemeColors } from "@/theme";

export const CONSENT_TEXT =
  "J'accepte que ma contribution (textes, enregistrement audio et image) soit publiée librement dans le " +
  "Dictionnaire Koulango et serve à développer une IA koulango.";

export function ConsentCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginVertical: spacing.sm }}
    >
      <Ionicons name={checked ? "checkbox" : "square-outline"} size={22} color={colors.primary} />
      <Text style={{ flex: 1, fontSize: font.small - 1, lineHeight: 19, color: colors.textMuted }}>{CONSENT_TEXT}</Text>
    </Pressable>
  );
}
