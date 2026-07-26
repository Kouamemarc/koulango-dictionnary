import React, { useState } from "react";
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Button, Field } from "@/components/UI";
import { ContributionsApi, MediaApi } from "@/api/endpoints";
import type { Suggestion, WordCreate } from "@/types";
import { colors, font, radius, spacing } from "@/theme";

type EntryType = "mot" | "expression";

export default function AddWordScreen({ navigation }: any) {
  const [entryType, setEntryType] = useState<EntryType>("mot");
  const [form, setForm] = useState<WordCreate>({ term: "" });
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const set = (k: keyof WordCreate) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  /** Choisit une image dans la galerie de l'appareil et l'envoie au serveur. */
  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission requise", "Autorise l'accès aux photos pour choisir une image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    setImagePreview(asset.uri);
    setUploadingImage(true);
    try {
      const { url } = await MediaApi.upload({ uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName });
      setForm((f) => ({ ...f, image_url: url }));
    } catch {
      Alert.alert("Erreur", "Envoi de l'image impossible.");
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  /** Étape 1 : vérification intelligente avant l'enregistrement. */
  const handleCheck = async () => {
    if (!form.term.trim()) return Alert.alert(entryType === "mot" ? "Le mot est requis." : "L'expression est requise.");
    setLoading(true);
    try {
      const res = await ContributionsApi.check(form.term);
      if (res.exists) {
        return Alert.alert("Déjà présent", res.message);
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
        "Mot ou expression proposé avec succès, ce sera vérifié et validé, merci pour votre contribution ❤️",
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
      <View style={styles.typeRow}>
        <TouchableOpacity
          style={[styles.typeBtn, entryType === "mot" && styles.typeBtnActive]}
          onPress={() => setEntryType("mot")}
        >
          <Text style={[styles.typeText, entryType === "mot" && styles.typeTextActive]}>Mot</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeBtn, entryType === "expression" && styles.typeBtnActive]}
          onPress={() => setEntryType("expression")}
        >
          <Text style={[styles.typeText, entryType === "expression" && styles.typeTextActive]}>Expression</Text>
        </TouchableOpacity>
      </View>

      <Field
        label={entryType === "mot" ? "Mot *" : "Expression *"}
        placeholder={entryType === "mot" ? "Ex : bonjour" : "Ex : comment ça va ?"}
        value={form.term}
        onChangeText={set("term")}
        autoFocus
      />
      <Field label="Traduction française" value={form.fr_translation} onChangeText={set("fr_translation")} />
      <Field label="Définition" value={form.definition} onChangeText={set("definition")} multiline />
      <Field label="Exemple" value={form.example} onChangeText={set("example")} multiline />
      <Field label="Prononciation" value={form.pronunciation} onChangeText={set("pronunciation")} />
      <Field label="URL audio" value={form.audio_url} onChangeText={set("audio_url")} autoCapitalize="none" />

      <View style={{ marginBottom: spacing.md }}>
        <Text style={styles.label}>Illustration</Text>
        {imagePreview && <Image source={{ uri: imagePreview }} style={styles.preview} />}
        <Button
          title={uploadingImage ? "Envoi…" : imagePreview ? "Changer l'image" : "Choisir une image"}
          variant="ghost"
          onPress={pickImage}
          loading={uploadingImage}
        />
      </View>

      <Field label="Source" value={form.source} onChangeText={set("source")} />
      <Field label="Traduction anglaise" value={form.en_translation} onChangeText={set("en_translation")} />

      <Button title="Proposer" onPress={handleCheck} loading={loading} disabled={uploadingImage} />

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
  label: { fontSize: font.small, color: colors.textMuted, marginBottom: 6, fontWeight: "500" },
  preview: { width: 120, height: 120, borderRadius: radius.md, backgroundColor: colors.border, marginBottom: spacing.sm },
  typeRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  typeBtn: {
    flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  typeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeText: { fontSize: font.small, fontWeight: "600", color: colors.textMuted },
  typeTextActive: { color: "#fff" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: spacing.lg },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  modalTitle: { fontSize: font.h3, fontWeight: "700", color: colors.text },
  modalText: { fontSize: font.body, color: colors.text, marginTop: 6 },
  sugg: { fontSize: font.body, color: colors.primaryDark, marginTop: 6, fontWeight: "600" },
  simi: { color: colors.textMuted, fontWeight: "400", fontSize: font.small },
});
