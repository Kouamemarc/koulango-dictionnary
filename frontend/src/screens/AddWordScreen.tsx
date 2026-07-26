import React, { useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, Field } from "@/components/UI";
import { ContributionsApi } from "@/api/endpoints";
import type { Suggestion, WordCreate } from "@/types";
import { colors, font, radius, spacing } from "@/theme";

export default function AddWordScreen({ navigation }: any) {
  const [form, setForm] = useState<WordCreate>({ term: "" });
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof WordCreate) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  /** Étape 1 : vérification intelligente avant l'enregistrement. */
  const handleCheck = async () => {
    if (!form.term.trim()) return Alert.alert("Le mot est requis.");
    setLoading(true);
    try {
      const res = await ContributionsApi.check(form.term);
      if (res.exists) {
        return Alert.alert("Mot déjà présent", res.message);
      }
      if (res.suggestions.length > 0) {
        setSuggestions(res.suggestions);
        setShowModal(true); // « Avez-vous voulu dire… ? »
      } else {
        await submit(false);
      }
    } catch {
      Alert.alert("Erreur", "Vérification impossible.");
    } finally {
      setLoading(false);
    }
  };

  /** Étape 2 : enregistrement au statut EN_ATTENTE_VALIDATION. */
  const submit = async (force: boolean) => {
    setLoading(true);
    try {
      await ContributionsApi.propose({ ...form, force_create: force });
      Alert.alert(
        "Merci !",
        "Votre proposition a été enregistrée et sera examinée par un administrateur.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      Alert.alert("Erreur", e?.response?.data?.detail?.message ?? "Enregistrement impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      <Field label="Mot *" value={form.term} onChangeText={set("term")} autoFocus />
      <Field label="Expression" value={form.expression} onChangeText={set("expression")} />
      <Field label="Traduction française" value={form.fr_translation} onChangeText={set("fr_translation")} />
      <Field label="Traduction anglaise" value={form.en_translation} onChangeText={set("en_translation")} />
      <Field label="Définition" value={form.definition} onChangeText={set("definition")} multiline />
      <Field label="Exemple" value={form.example} onChangeText={set("example")} multiline />
      <Field label="Prononciation" value={form.pronunciation} onChangeText={set("pronunciation")} />
      <Field label="URL audio" value={form.audio_url} onChangeText={set("audio_url")} autoCapitalize="none" />
      <Field label="URL image (illustration)" value={form.image_url} onChangeText={set("image_url")} autoCapitalize="none" />
      <Field label="Source" value={form.source} onChangeText={set("source")} />
      <Button title="Vérifier et proposer" onPress={handleCheck} loading={loading} />

      {/* Modale de la recherche intelligente */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.modalTitle}>Le mot n'existe pas.</Text>
            <Text style={styles.modalText}>Avez-vous voulu dire :</Text>
            {suggestions.map((s) => (
              <Text key={s.word_id} style={styles.sugg}>
                • {s.term}  <Text style={styles.simi}>(similarité {Math.round(s.similarity * 100)}%)</Text>
              </Text>
            ))}
            <Text style={[styles.modalText, { marginTop: spacing.sm }]}>Est-ce le même mot ?</Text>
            <View style={{ height: spacing.sm }} />
            <Button title="Oui — c'est le même, annuler"
              variant="ghost"
              onPress={() => { setShowModal(false); navigation.goBack(); }} />
            <Button title="Non — c'est un nouveau mot"
              onPress={() => { setShowModal(false); submit(true); }} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: spacing.lg },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  modalTitle: { fontSize: font.h3, fontWeight: "700", color: colors.text },
  modalText: { fontSize: font.body, color: colors.text, marginTop: 6 },
  sugg: { fontSize: font.body, color: colors.primaryDark, marginTop: 6, fontWeight: "600" },
  simi: { color: colors.textMuted, fontWeight: "400", fontSize: font.small },
});
