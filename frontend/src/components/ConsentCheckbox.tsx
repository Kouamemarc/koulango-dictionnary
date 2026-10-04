/** Case de consentement obligatoire avant d'envoyer une contribution. */
import React from "react";
import { Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { font, spacing, useThemeColors } from "@/theme";

export const CONSENT_TEXT =
  "J'accepte que ma contribution (textes, enregistrement audio et image) soit publiée librement dans le " +
  "Dictionnaire Koulango et serve à développer une IA koulango.";

/** Pour l'import : la personne partage souvent les mots d'un autre auteur. */
export const IMPORT_CONSENT_TEXT =
  "J'ai le droit de partager ces mots (j'en suis l'auteur ou l'auteur est d'accord) et j'accepte qu'ils soient " +
  "publiés librement dans le Dictionnaire Koulango et servent à développer une IA koulango.";

export function ConsentCheckbox({
  checked, onChange, text = CONSENT_TEXT,
}: { checked: boolean; onChange: (v: boolean) => void; text?: string }) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginVertical: spacing.sm }}
    >
      <Ionicons name={checked ? "checkbox" : "square-outline"} size={22} color={colors.primary} />
      <Text style={{ flex: 1, fontSize: font.small - 1, lineHeight: 19, color: colors.textMuted }}>{text}</Text>
    </Pressable>
  );
}
