import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Button, Field } from "@/components/UI";
import { MessagesApi } from "@/api/endpoints";
import { font, radius, spacing, ThemeColors, useThemeColors } from "@/theme";

const LEVELS = ["Langue maternelle", "Je le parle couramment", "Je le comprends bien", "Je l'apprends"];

export default function ModeratorScreen({ navigation }: any) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [region, setRegion] = useState("");
  const [level, setLevel] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const canSend = name.trim() && contact.trim() && body.trim();

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      await MessagesApi.send({ kind: "moderateur", name, contact, region, koulango_level: level, body });
      setSent(true);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Envoi impossible. Vérifiez les champs et réessayez.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <View style={[styles.container, styles.done]}>
        <Text style={styles.doneTitle}>Merci {name.trim()} ! 🙏🏾</Text>
        <Text style={styles.doneText}>Votre candidature a bien été envoyée. Nous vous recontacterons rapidement.</Text>
        <Button title="Retour à l'accueil" onPress={() => navigation.navigate("Tabs", { screen: "Accueil" })} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled">
      <Text style={styles.intro}>
        Les modérateurs relisent les mots proposés par la communauté : ils les valident, les corrigent ou les refusent
        avant publication. C'est grâce à eux que le dictionnaire reste fiable.
      </Text>
      {[
        "Il faut bien connaître le koulango.",
        "Tout se fait à distance, depuis un téléphone ou un ordinateur.",
        "Vous y consacrez le temps que vous voulez, quand vous le pouvez.",
      ].map((t) => (
        <Text key={t} style={styles.point}>•  {t}</Text>
      ))}

      <View style={{ height: spacing.md }} />
      <Field label="Nom et prénom *" value={name} onChangeText={setName} maxLength={120} />
      <Field
        label="Téléphone / WhatsApp ou e-mail *"
        value={contact}
        onChangeText={setContact}
        maxLength={200}
        placeholder="Pour vous recontacter"
      />
      <Field label="Ville ou région" value={region} onChangeText={setRegion} maxLength={120} placeholder="Ex : Bouna, Bondoukou, Abidjan…" />

      <Text style={styles.label}>Votre niveau en koulango</Text>
      <View style={styles.chips}>
        {LEVELS.map((l) => (
          <TouchableOpacity key={l} style={[styles.chip, level === l && styles.chipActive]} onPress={() => setLevel(level === l ? "" : l)}>
            <Text style={[styles.chipText, level === l && styles.chipTextActive]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Field
        label="Pourquoi souhaitez-vous devenir modérateur ? *"
        value={body}
        onChangeText={setBody}
        multiline
        maxLength={3000}
        style={styles.multiline}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button title="Envoyer ma candidature" onPress={submit} loading={sending} disabled={!canSend} />
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  intro: { fontSize: font.small + 1, color: colors.textMuted, lineHeight: 22, marginBottom: spacing.sm },
  point: { fontSize: font.small, color: colors.text, lineHeight: 22 },
  label: { fontSize: font.small, color: colors.textMuted, marginBottom: 6, fontWeight: "500" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
  chip: {
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 8,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  multiline: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: font.body, color: colors.text,
    minHeight: 110, textAlignVertical: "top",
  },
  error: { color: colors.danger, fontSize: 13, marginBottom: spacing.xs },
  done: { padding: spacing.lg, justifyContent: "center" },
  doneTitle: { fontSize: font.h3 + 2, fontWeight: "800", color: colors.text, textAlign: "center", marginBottom: spacing.sm },
  doneText: { fontSize: font.small + 1, color: colors.textMuted, textAlign: "center", marginBottom: spacing.lg, lineHeight: 22 },
});
