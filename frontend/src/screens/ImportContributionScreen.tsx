import React, { useMemo, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Button, Field } from "@/components/UI";
import { ConsentCheckbox, IMPORT_CONSENT_TEXT } from "@/components/ConsentCheckbox";
import { ContributionsApi } from "@/api/endpoints";
import type { BatchItemResult, ImportEntry, ImportImage } from "@/types";
import { font, radius, spacing, ThemeColors, useThemeColors } from "@/theme";

const PARTS_OF_SPEECH = ["nom", "verbe", "adjectif", "pronom", "adverbe", "interjection"];
const MAX_IMAGES = 5;
const SUPPORTED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

interface PendingImage extends ImportImage {
  uri: string;
}

interface Row {
  entry: ImportEntry;
  selected: boolean;
}

export default function ImportContributionScreen({ navigation }: any) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [text, setText] = useState("");
  const [images, setImages] = useState<PendingImage[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [notes, setNotes] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [consent, setConsent] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BatchItemResult[] | null>(null);

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission requise", "Autorise l'accès aux photos pour choisir des captures d'écran.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      quality: 0.8,
      base64: true,
    });
    if (result.canceled) return;
    const added = result.assets
      .filter((a) => a.base64)
      .map((a) => ({
        uri: a.uri,
        data: a.base64!,
        // Format renvoyé par le sélecteur ; JPEG par défaut (compression) si inconnu ou non pris en charge.
        media_type: (SUPPORTED.includes(a.mimeType ?? "") ? a.mimeType : "image/jpeg") as ImportImage["media_type"],
      }));
    setImages((imgs) => [...imgs, ...added].slice(0, MAX_IMAGES));
  };

  const extract = async () => {
    setExtracting(true);
    setError(null);
    setNotes(null);
    try {
      const res = await ContributionsApi.importExtract({
        text,
        images: images.map(({ media_type, data }) => ({ media_type, data })),
      });
      setRows(res.entries.map((entry) => ({ entry, selected: entry.existing !== "exists" })));
      setNotes(res.notes);
      if (res.entries.length === 0) setError("Aucun mot koulango trouvé dans cette publication.");
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Analyse impossible. Vérifiez votre connexion et réessayez.");
    } finally {
      setExtracting(false);
    }
  };

  const update = (i: number, patch: Partial<ImportEntry>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, entry: { ...r.entry, ...patch } } : r)));
  const toggle = (i: number) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, selected: !r.selected } : r)));
  const selected = rows.filter((r) => r.selected && r.entry.term.trim());

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await ContributionsApi.proposeBatch(
        selected.map(({ entry }) => ({
          term: entry.term.trim(),
          fr_translation: entry.fr_translation || undefined,
          en_translation: entry.en_translation || undefined,
          part_of_speech: entry.part_of_speech || undefined,
          definition: entry.definition || undefined,
          example: entry.example || undefined,
          example_translation: entry.example_translation || undefined,
          pronunciation: entry.pronunciation || undefined,
          source: source.trim() || undefined,
          ai_consent: consent,
        })),
      );
      setResults(res);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Envoi impossible. Réessayez.");
    } finally {
      setSending(false);
    }
  };

  const restart = () => {
    setText("");
    setImages([]);
    setRows([]);
    setNotes(null);
    setResults(null);
    setError(null);
  };

  if (results) {
    const created = results.filter((r) => r.status === "created");
    const skipped = results.filter((r) => r.status === "skipped");
    return (
      <View style={[styles.container, styles.done]}>
        <Text style={styles.doneTitle}>Merci pour votre contribution ❤️</Text>
        <Text style={styles.doneText}>
          {created.length} mot(s) envoyé(s) : ils seront vérifiés par un modérateur avant publication.
          {skipped.length > 0 && ` ${skipped.length} ignoré(s) : ${skipped.map((s) => `${s.term} (${s.detail})`).join(", ")}.`}
        </Text>
        <Button title="Importer une autre publication" onPress={restart} />
        <Button title="Retour à l'accueil" variant="ghost" onPress={() => navigation.navigate("Tabs", { screen: "Accueil" })} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled">
      <Text style={styles.intro}>
        Vous avez vu des mots koulango dans une publication, par exemple dans un groupe Facebook ? Collez son texte ou
        ajoutez des captures d'écran : nous repérons les mots et leurs traductions, vous vérifiez, puis vous envoyez.
      </Text>

      <Field
        label="Texte de la publication"
        value={text}
        onChangeText={setText}
        multiline
        placeholder={"Mál = riz\nDígô = la nourriture\n…"}
        style={styles.multiline}
      />

      <Text style={styles.label}>Captures d'écran ({images.length}/{MAX_IMAGES})</Text>
      {images.length > 0 && (
        <View style={styles.thumbs}>
          {images.map((img, i) => (
            <View key={i}>
              <Image source={{ uri: img.uri }} style={styles.thumb} />
              <TouchableOpacity
                style={styles.thumbRemove}
                onPress={() => setImages((imgs) => imgs.filter((_, idx) => idx !== i))}
                accessibilityLabel="Retirer la capture"
              >
                <Ionicons name="close-circle" size={22} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      {images.length < MAX_IMAGES && <Button title="🖼️ Ajouter des captures" variant="ghost" onPress={pickImages} />}

      <View style={{ height: spacing.sm }} />
      <Button
        title={extracting ? "Analyse en cours… (jusqu'à 1 min)" : "Trouver les mots"}
        onPress={extract}
        loading={extracting}
        disabled={!text.trim() && images.length === 0}
      />

      {error && <Text style={styles.error}>{error}</Text>}
      {notes && <Text style={styles.hint}>💡 {notes}</Text>}

      {rows.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{rows.length} mot(s) trouvé(s) — vérifiez avant d'envoyer</Text>
          {rows.map((r, i) => (
            <View key={i} style={[styles.row, !r.selected && { opacity: 0.55 }]}>
              <TouchableOpacity style={styles.rowHead} onPress={() => toggle(i)}>
                <Ionicons name={r.selected ? "checkbox" : "square-outline"} size={22} color={colors.primary} />
                <Text style={styles.rowTerm}>{r.entry.term || "—"}</Text>
              </TouchableOpacity>
              {r.entry.existing === "exists" && <Text style={[styles.badge, styles.badgeExists]}>Déjà dans le dictionnaire</Text>}
              {r.entry.existing === "similar" && (
                <Text style={[styles.badge, styles.badgeSimilar]}>Proche de : {r.entry.matches.join(", ")}</Text>
              )}
              <TextInput style={styles.input} placeholder="Mot koulango" placeholderTextColor={colors.textMuted}
                value={r.entry.term} onChangeText={(v) => update(i, { term: v })} />
              <TextInput style={styles.input} placeholder="Traduction française" placeholderTextColor={colors.textMuted}
                value={r.entry.fr_translation ?? ""} onChangeText={(v) => update(i, { fr_translation: v || null })} />
              <View style={styles.chips}>
                {PARTS_OF_SPEECH.map((p) => {
                  const active = r.entry.part_of_speech === p;
                  return (
                    <TouchableOpacity key={p} style={[styles.chip, active && styles.chipActive]}
                      onPress={() => update(i, { part_of_speech: active ? null : p })}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{p}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput style={styles.input} placeholder="Exemple en koulango" placeholderTextColor={colors.textMuted}
                value={r.entry.example ?? ""} onChangeText={(v) => update(i, { example: v || null })} />
              <TextInput style={[styles.input, { marginBottom: 0 }]} placeholder="Traduction de l'exemple" placeholderTextColor={colors.textMuted}
                value={r.entry.example_translation ?? ""} onChangeText={(v) => update(i, { example_translation: v || null })} />
            </View>
          ))}

          <Field
            label="D'où viennent ces mots ?"
            value={source}
            onChangeText={setSource}
            maxLength={200}
            placeholder="Ex : groupe Facebook « Parlons koulango »"
          />
          <ConsentCheckbox checked={consent} onChange={setConsent} text={IMPORT_CONSENT_TEXT} />
          <Button
            title={`Envoyer ${selected.length} mot(s)`}
            onPress={send}
            loading={sending}
            disabled={!consent || selected.length === 0}
          />
          <Text style={styles.hint}>Chaque mot sera vérifié par un modérateur avant d'être publié.</Text>
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  intro: { fontSize: font.small + 1, color: colors.textMuted, lineHeight: 22, marginBottom: spacing.md },
  label: { fontSize: font.small, color: colors.textMuted, marginBottom: 6, fontWeight: "500" },
  multiline: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: font.body, color: colors.text,
    minHeight: 120, textAlignVertical: "top",
  },
  thumbs: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.xs },
  thumb: { width: 80, height: 104, borderRadius: radius.md, backgroundColor: colors.border },
  thumbRemove: { position: "absolute", top: 2, right: 2, backgroundColor: colors.surface, borderRadius: 12 },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.sm },
  hint: { fontSize: font.tiny + 1, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 18 },
  sectionTitle: { fontSize: font.body, fontWeight: "800", color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  row: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.sm + 4, marginBottom: spacing.sm,
  },
  rowHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs },
  rowTerm: { fontSize: font.body, fontWeight: "700", color: colors.text },
  badge: {
    alignSelf: "flex-start", fontSize: 11.5, fontWeight: "700", paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: radius.full, overflow: "hidden", marginBottom: spacing.xs,
  },
  badgeExists: { color: colors.danger, backgroundColor: colors.bg },
  badgeSimilar: { color: colors.accent, backgroundColor: colors.bg },
  input: {
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: font.small + 1, color: colors.text, marginBottom: spacing.xs,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: spacing.xs },
  chip: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  done: { padding: spacing.lg, justifyContent: "center" },
  doneTitle: { fontSize: font.h3 + 2, fontWeight: "800", color: colors.text, textAlign: "center", marginBottom: spacing.sm },
  doneText: { fontSize: font.small + 1, color: colors.textMuted, textAlign: "center", marginBottom: spacing.lg, lineHeight: 22 },
});
