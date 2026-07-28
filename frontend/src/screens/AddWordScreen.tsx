import React, { useMemo, useState } from "react";
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { Button, Field } from "@/components/UI";
import { ContributionsApi, MediaApi } from "@/api/endpoints";
import type { Suggestion, TranslationLang, WordCreate } from "@/types";
import { font, radius, spacing, ThemeColors, useThemeColors } from "@/theme";

type EntryType = "mot" | "expression";

const PARTS_OF_SPEECH = ["nom", "verbe", "adjectif", "pronom", "adverbe", "interjection"] as const;

/** Audio choisi/enregistré localement, pas encore envoyé au serveur. */
interface PendingAudio {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
}

export default function AddWordScreen({ navigation }: any) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [entryType, setEntryType] = useState<EntryType>("mot");
  const [form, setForm] = useState<WordCreate>({ term: "" });
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [pendingAudio, setPendingAudio] = useState<PendingAudio | null>(null);
  const [translations, setTranslations] = useState<
    { language: TranslationLang; text: string; example: string; example_translation: string }[]
  >([]);

  const set = (k: keyof WordCreate) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const updateTranslation = (
    i: number,
    patch: Partial<{ language: TranslationLang; text: string; example: string; example_translation: string }>
  ) => setTranslations((t) => t.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  const busy = uploadingImage || loading || isRecording;

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

  /** Enregistre la prononciation avec le micro (garde le fichier en local pour l'instant). */
  const startRecording = async () => {
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission requise", "Autorise l'accès au micro pour enregistrer.");
      return;
    }
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
    } catch {
      Alert.alert("Erreur", "Impossible de démarrer l'enregistrement.");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    if (uri) setPendingAudio({ uri, mimeType: "audio/m4a", fileName: "prononciation.m4a" });
  };

  /** Choisit un fichier audio existant sur l'appareil (garde-le en local pour l'instant). */
  const pickAudioFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "audio/*" });
    if (result.canceled) return;
    const asset = result.assets[0];
    setPendingAudio({ uri: asset.uri, mimeType: asset.mimeType, fileName: asset.name });
  };

  const playPendingAudio = async () => {
    if (!pendingAudio) return;
    const { sound } = await Audio.Sound.createAsync({ uri: pendingAudio.uri });
    await sound.playAsync();
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

  /** Étape 2 : envoie l'audio en attente (s'il y en a un) puis enregistre la proposition. */
  const submit = async (force: boolean) => {
    setLoading(true);
    try {
      let audio_url = form.audio_url;
      if (pendingAudio) {
        try {
          const uploaded = await MediaApi.upload(pendingAudio);
          audio_url = uploaded.url;
        } catch {
          Alert.alert("Erreur", "Envoi de l'audio impossible.");
          return;
        }
      }
      const validTranslations = translations
        .filter((t) => t.text.trim())
        .map((t) => ({
          ...t,
          example: t.example.trim() || undefined,
          example_translation: t.example_translation.trim() || undefined,
        }));
      await ContributionsApi.propose({ ...form, audio_url, translations: validTranslations, force_create: force });
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

      <View style={{ marginBottom: spacing.md }}>
        <Text style={styles.label}>Nature du mot</Text>
        <View style={styles.posRow}>
          {PARTS_OF_SPEECH.map((pos) => (
            <TouchableOpacity
              key={pos}
              style={[styles.posBtn, form.part_of_speech === pos && styles.posBtnActive]}
              onPress={() => setForm((f) => ({ ...f, part_of_speech: f.part_of_speech === pos ? undefined : pos }))}
            >
              <Text style={[styles.posBtnText, form.part_of_speech === pos && styles.posBtnTextActive]}>{pos}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ marginBottom: spacing.md }}>
        <Text style={styles.label}>Autres traductions (un mot peut avoir plusieurs sens)</Text>
        {translations.map((t, i) => (
          <View key={i} style={styles.translationBlock}>
            <View style={styles.row}>
              <TouchableOpacity
                style={styles.langBtn}
                onPress={() => updateTranslation(i, { language: t.language === "fr" ? "en" : "fr" })}
              >
                <Text style={styles.langBtnText}>{t.language.toUpperCase()}</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Field value={t.text} onChangeText={(v) => updateTranslation(i, { text: v })} placeholder="Traduction" />
              </View>
              <TouchableOpacity
                hitSlop={8}
                onPress={() => setTranslations((ts) => ts.filter((_, idx) => idx !== i))}
              >
                <Ionicons name="close-circle" size={22} color={colors.danger} />
              </TouchableOpacity>
            </View>
            <Field
              value={t.example}
              onChangeText={(v) => updateTranslation(i, { example: v })}
              placeholder="Exemple d'utilisation (facultatif)"
            />
            <Field
              value={t.example_translation}
              onChangeText={(v) => updateTranslation(i, { example_translation: v })}
              placeholder="Traduction de l'exemple (facultatif)"
            />
          </View>
        ))}
        <Button
          title="+ Ajouter une traduction"
          variant="ghost"
          onPress={() => setTranslations((t) => [...t, { language: "fr", text: "", example: "", example_translation: "" }])}
        />
      </View>

      <Field label="Définition" value={form.definition} onChangeText={set("definition")} multiline />
      <Field label="Exemple" value={form.example} onChangeText={set("example")} multiline />
      <Field label="Traduction de l'exemple" value={form.example_translation} onChangeText={set("example_translation")} multiline />
      <Field label="Prononciation" value={form.pronunciation} onChangeText={set("pronunciation")} />

      <View style={{ marginBottom: spacing.md }}>
        <Text style={styles.label}>Prononciation audio</Text>

        {pendingAudio && !isRecording && (
          <View style={[styles.row, { marginBottom: spacing.sm }]}>
            <View style={{ flex: 1 }}>
              <Button title="▶ Écouter" variant="ghost" onPress={playPendingAudio} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Supprimer" variant="danger" onPress={() => setPendingAudio(null)} />
            </View>
          </View>
        )}

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Button
              title={isRecording ? "Arrêter l'enregistrement" : pendingAudio ? "Réenregistrer" : "Enregistrer"}
              variant={isRecording ? "danger" : "ghost"}
              onPress={isRecording ? stopRecording : startRecording}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Choisir un fichier"
              variant="ghost"
              onPress={pickAudioFile}
              disabled={isRecording}
            />
          </View>
        </View>
        {pendingAudio && <Text style={styles.hint}>Sera envoyé avec la proposition.</Text>}
      </View>

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

      <Field label="Votre nom" placeholder="Ex : Marc BK" value={form.source} onChangeText={set("source")} />
      <Field label="Traduction anglaise" value={form.en_translation} onChangeText={set("en_translation")} />

      <Button title="Proposer" onPress={handleCheck} loading={loading} disabled={busy} />

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

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  label: { fontSize: font.small, color: colors.textMuted, marginBottom: 6, fontWeight: "500" },
  hint: { fontSize: font.small, color: colors.textMuted, marginTop: 6 },
  row: { flexDirection: "row", gap: spacing.sm },
  translationBlock: { marginBottom: spacing.sm },
  langBtn: {
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  langBtnText: { fontSize: font.tiny, fontWeight: "700", color: colors.text },
  posRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  posBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  posBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  posBtnText: { fontSize: font.small, fontWeight: "600", color: colors.textMuted },
  posBtnTextActive: { color: "#fff" },
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
