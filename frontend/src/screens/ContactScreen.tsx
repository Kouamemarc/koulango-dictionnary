import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, Field } from "@/components/UI";
import { MessagesApi } from "@/api/endpoints";
import { font, radius, spacing, ThemeColors, useThemeColors } from "@/theme";

export default function ContactScreen({ navigation }: any) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      await MessagesApi.send({ kind: "contact", name, contact, body });
      setSent(true);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Envoi impossible. Réessayez.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <View style={[styles.container, styles.done]}>
        <Text style={styles.doneTitle}>Message envoyé, merci ! 🙏🏾</Text>
        <Text style={styles.doneText}>Chaque retour aide à améliorer le dictionnaire.</Text>
        <Button title="Retour à l'accueil" onPress={() => navigation.navigate("Tabs", { screen: "Accueil" })} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled">
      <Text style={styles.intro}>
        Une idée d'amélioration, un problème rencontré, une erreur dans un mot ? Écrivez-nous : chaque message est lu.
      </Text>
      <Field label="Votre message *" value={body} onChangeText={setBody} multiline maxLength={3000} style={styles.multiline} autoFocus />
      <Field label="Votre nom" value={name} onChangeText={setName} maxLength={120} />
      <Field
        label="Téléphone / WhatsApp ou e-mail"
        value={contact}
        onChangeText={setContact}
        maxLength={200}
        placeholder="Facultatif, si vous souhaitez une réponse"
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button title="Envoyer" onPress={submit} loading={sending} disabled={!body.trim()} />
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  intro: { fontSize: font.small + 1, color: colors.textMuted, lineHeight: 22, marginBottom: spacing.md },
  multiline: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: font.body, color: colors.text,
    minHeight: 130, textAlignVertical: "top",
  },
  error: { color: colors.danger, fontSize: 13, marginBottom: spacing.xs },
  done: { padding: spacing.lg, justifyContent: "center" },
  doneTitle: { fontSize: font.h3 + 2, fontWeight: "800", color: colors.text, textAlign: "center", marginBottom: spacing.sm },
  doneText: { fontSize: font.small + 1, color: colors.textMuted, textAlign: "center", marginBottom: spacing.lg, lineHeight: 22 },
});
