import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/UI";
import { AssistantApi, ContributionsApi, MediaApi } from "@/api/endpoints";
import type { ChatMessage, Suggestion, WordCreate } from "@/types";
import { font, radius, spacing, ThemeColors, useThemeColors } from "@/theme";

const GREETING = "Bonjour ! Quel mot ou quelle expression koulango voulez-vous ajouter ?";

/** Premier message envoyé automatiquement quand on arrive depuis une recherche sans résultat. */
function initialMessage(term: string, lang?: string): string {
  return lang === "francais"
    ? `J'ai cherché « ${term} » en français mais le dictionnaire n'a pas de résultat. Je voudrais ajouter le mot koulango qui correspond.`
    : `Je voudrais ajouter le mot koulango « ${term} » au dictionnaire.`;
}

const DRAFT_FIELDS: [keyof WordCreate, string][] = [
  ["fr_translation", "Français"],
  ["en_translation", "Anglais"],
  ["part_of_speech", "Nature"],
  ["definition", "Définition"],
  ["example", "Exemple"],
  ["example_translation", "Traduction de l'exemple"],
  ["pronunciation", "Prononciation"],
  ["source", "Proposé par"],
];

/** Audio choisi/enregistré localement, envoyé au serveur seulement avec la proposition. */
interface PendingAudio {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  /** URL renvoyée par le serveur une fois envoyé (évite un second envoi si on réessaie). */
  uploadedUrl?: string;
}

type SendState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "similar"; suggestions: Suggestion[] }
  | { kind: "error"; message: string }
  | { kind: "sent" };

export default function AssistantScreen({ navigation, route }: any) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [draft, setDraft] = useState<WordCreate | null>(null);
  const [sendState, setSendState] = useState<SendState>({ kind: "idle" });
  const scrollRef = useRef<ScrollView | null>(null);
  const [pendingAudio, setPendingAudio] = useState<PendingAudio | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const startedRef = useRef(false);

  const send = async (text: string, history: ChatMessage[] = messages) => {
    const next: ChatMessage[] = [...history, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setChatError(null);
    setThinking(true);
    try {
      const res = await AssistantApi.chat(next);
      setMessages([...next, { role: "assistant", content: res.reply }]);
      if (res.draft) {
        setDraft(res.draft);
        setSendState({ kind: "idle" });
      }
    } catch (e: any) {
      // On retire le message non traité et on le remet dans le champ pour pouvoir réessayer.
      setMessages(history);
      setInput(text);
      const detail = e?.response?.data?.detail;
      setChatError(
        e?.response?.status === 422
          ? "La conversation est devenue trop longue. Recommencez avec un nouveau mot."
          : typeof detail === "string" ? detail : "L'assistant ne répond pas. Vérifiez votre connexion et réessayez.",
      );
    } finally {
      setThinking(false);
    }
  };

  // Arrivée depuis une recherche sans résultat : la conversation démarre toute seule.
  useEffect(() => {
    const term: string | undefined = route.params?.term?.trim();
    if (!term || startedRef.current) return;
    startedRef.current = true;
    send(initialMessage(term, route.params?.lang), []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = () => {
    const text = input.trim();
    if (!text || thinking) return;
    send(text);
  };

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
    } catch {
      Alert.alert("Erreur", "Impossible de démarrer l'enregistrement.");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    if (uri) setPendingAudio({ uri, mimeType: "audio/m4a", fileName: "prononciation.m4a" });
  };

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
      setImageUrl(url);
    } catch {
      Alert.alert("Erreur", "Envoi de l'image impossible.");
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const submitDraft = async (force: boolean) => {
    if (!draft) return;
    setSendState({ kind: "sending" });
    try {
      let audio_url = pendingAudio?.uploadedUrl;
      if (pendingAudio && !audio_url) {
        try {
          audio_url = (await MediaApi.upload(pendingAudio)).url;
          setPendingAudio({ ...pendingAudio, uploadedUrl: audio_url });
        } catch {
          setSendState({ kind: "error", message: "Envoi de l'audio impossible. Réessayez ou supprimez-le." });
          return;
        }
      }
      await ContributionsApi.propose({
        ...draft,
        audio_url,
        image_url: imageUrl ?? undefined,
        force_create: force || draft.force_create,
      });
      setSendState({ kind: "sent" });
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (e?.response?.status === 409 && detail?.suggestions?.length) {
        setSendState({ kind: "similar", suggestions: detail.suggestions });
      } else {
        setSendState({ kind: "error", message: typeof detail === "string" ? detail : "Envoi impossible. Réessayez." });
      }
    }
  };

  const restart = () => {
    setMessages([]);
    setDraft(null);
    setPendingAudio(null);
    setImageUrl(null);
    setImagePreview(null);
    setSendState({ kind: "idle" });
    setChatError(null);
    setInput("");
  };

  const sent = sendState.kind === "sent";
  const isRecording = recording !== null;
  const mediaBusy = isRecording || uploadingImage;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      // Android : la fenêtre se redimensionne déjà (adjustResize) quand le clavier s'ouvre.
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.chat}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>
          Répondez simplement aux questions, l'assistant prépare la fiche pour vous.
        </Text>
        <View style={[styles.bubble, styles.bot]}><Text style={styles.botText}>{GREETING}</Text></View>
        {messages.map((m, i) => (
          <View key={i} style={[styles.bubble, m.role === "user" ? styles.user : styles.bot]}>
            <Text style={m.role === "user" ? styles.userText : styles.botText}>{m.content}</Text>
          </View>
        ))}
        {thinking && (
          <View style={[styles.bubble, styles.bot]}>
            <ActivityIndicator size="small" color={colors.textMuted} />
          </View>
        )}

        {draft && (
          <View style={styles.draft}>
            <Text style={styles.draftLabel}>RÉCAPITULATIF DE LA PROPOSITION</Text>
            <Text style={styles.draftTerm}>{draft.term}</Text>
            {DRAFT_FIELDS.filter(([k]) => draft[k]).map(([k, label]) => (
              <View key={k} style={styles.draftRow}>
                <Text style={styles.draftKey}>{label}</Text>
                <Text style={styles.draftValue}>{String(draft[k])}</Text>
              </View>
            ))}
            {(draft.translations ?? []).length > 0 && (
              <View style={styles.draftRow}>
                <Text style={styles.draftKey}>Autres sens</Text>
                <Text style={styles.draftValue}>
                  {draft.translations!.map((t) => `${t.text} (${t.language.toUpperCase()})`).join(", ")}
                </Text>
              </View>
            )}

            {!sent && (
              <View style={styles.media}>
                <View style={styles.mediaHead}>
                  <Text style={styles.mediaTitle}>Prononciation audio et illustration</Text>
                  <Text style={styles.badge}>Recommandé</Text>
                </View>
                <Text style={styles.hint}>Facultatif, mais cela aide beaucoup ceux qui découvrent le mot.</Text>

                {pendingAudio && !isRecording && (
                  <View style={styles.mediaRow}>
                    <View style={{ flex: 1 }}>
                      <Button title="▶ Écouter" variant="ghost" onPress={playPendingAudio} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button title="Supprimer" variant="danger" onPress={() => setPendingAudio(null)} />
                    </View>
                  </View>
                )}
                <View style={styles.mediaRow}>
                  <View style={{ flex: 1 }}>
                    <Button
                      title={isRecording ? "Arrêter" : pendingAudio ? "Réenregistrer" : "🎤 Enregistrer"}
                      variant={isRecording ? "danger" : "ghost"}
                      onPress={isRecording ? stopRecording : startRecording}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button title="Fichier audio" variant="ghost" onPress={pickAudioFile} disabled={isRecording} />
                  </View>
                </View>

                <View style={[styles.mediaRow, { alignItems: "center" }]}>
                  {imagePreview && <Image source={{ uri: imagePreview }} style={styles.imagePreview} />}
                  <View style={{ flex: 1 }}>
                    <Button
                      title={imagePreview ? "Changer l'image" : "🖼️ Choisir une image"}
                      variant="ghost"
                      onPress={pickImage}
                      loading={uploadingImage}
                    />
                  </View>
                </View>
              </View>
            )}

            <View style={{ marginTop: spacing.sm }}>
              {sent ? (
                <>
                  <Text style={styles.draftNote}>
                    Merci ❤️ Votre proposition a été envoyée. Elle sera vérifiée par un modérateur avant publication.
                  </Text>
                  <Button title="Ajouter un autre mot" onPress={restart} />
                  <Button title="Retour à l'accueil" variant="ghost" onPress={() => navigation.navigate("Tabs", { screen: "Accueil" })} />
                </>
              ) : sendState.kind === "similar" ? (
                <>
                  <Text style={styles.draftNote}>
                    Des mots proches existent déjà : {sendState.suggestions.map((s) => s.term).join(", ")}. Est-ce bien un mot différent ?
                  </Text>
                  <Button title="Oui, c'est un autre mot" onPress={() => submitDraft(true)} />
                  <Button title="Non, annuler" variant="ghost" onPress={() => setSendState({ kind: "idle" })} />
                </>
              ) : (
                <>
                  {sendState.kind === "error" && <Text style={styles.error}>{sendState.message}</Text>}
                  <Button
                    title="Envoyer la proposition"
                    onPress={() => submitDraft(false)}
                    loading={sendState.kind === "sending"}
                    disabled={thinking || mediaBusy}
                  />
                  <Text style={styles.hint}>Une erreur ? Écrivez à l'assistant ce qu'il faut corriger.</Text>
                </>
              )}
            </View>
          </View>
        )}

        {chatError && <Text style={styles.error}>{chatError}</Text>}
      </ScrollView>

      {!sent && (
        <View style={[styles.inputRow, { paddingBottom: spacing.sm + insets.bottom }]}>
          <TextInput
            style={styles.input}
            placeholder="Votre réponse…"
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={onSubmit}
            returnKeyType="send"
            maxLength={2000}
            autoFocus={!route.params?.term}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (thinking || !input.trim()) && { opacity: 0.5 }]}
            onPress={onSubmit}
            disabled={thinking || !input.trim()}
            accessibilityLabel="Envoyer"
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  chat: { padding: spacing.md, gap: spacing.sm },
  intro: { fontSize: font.small, color: colors.textMuted, marginBottom: spacing.xs },
  bubble: { maxWidth: "85%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bot: {
    alignSelf: "flex-start", backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 6,
  },
  user: { alignSelf: "flex-end", backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  botText: { fontSize: font.body - 1, color: colors.text, lineHeight: 21 },
  userText: { fontSize: font.body - 1, color: "#fff", lineHeight: 21 },
  draft: {
    backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.primary,
    borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.xs,
  },
  draftLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6, color: colors.primary },
  draftTerm: { fontSize: 22, fontWeight: "800", color: colors.primaryDark, marginTop: 4, marginBottom: spacing.sm },
  draftRow: { flexDirection: "row", gap: spacing.sm, marginBottom: 6 },
  draftKey: { width: 110, fontSize: font.small, color: colors.textMuted },
  draftValue: { flex: 1, fontSize: font.small, color: colors.text },
  draftNote: { fontSize: font.small, color: colors.text, marginBottom: spacing.sm, lineHeight: 20 },
  media: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm, paddingTop: spacing.sm },
  mediaHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  mediaTitle: { flex: 1, fontSize: font.small, fontWeight: "700", color: colors.text },
  badge: {
    fontSize: 11, fontWeight: "700", color: colors.accent, borderWidth: 1, borderColor: colors.accent,
    borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2, overflow: "hidden",
  },
  mediaRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  imagePreview: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.border },
  hint: { fontSize: font.tiny, color: colors.textMuted, textAlign: "center", marginTop: spacing.xs },
  error: { fontSize: 13, color: colors.danger, marginVertical: spacing.xs },
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg,
  },
  input: {
    flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 10,
    fontSize: font.body, color: colors.text,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
  },
});
