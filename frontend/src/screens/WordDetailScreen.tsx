import React, { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Card, Loading } from "@/components/UI";
import { WordsApi } from "@/api/endpoints";
import { useFavorites } from "@/store/favorites";
import { useHistory } from "@/store/history";
import { colors, font, spacing } from "@/theme";
import type { Definition, Example, Translation } from "@/types";

export default function WordDetailScreen({ route }: any) {
  const { id } = route.params;
  const [showMore, setShowMore] = useState(false);
  const { data: word, isLoading } = useQuery({
    queryKey: ["word", id],
    queryFn: () => WordsApi.detail(id),
  });

  const isFavorite = useFavorites((s) => s.isFavorite(id));
  const toggleFavorite = useFavorites((s) => s.toggle);
  const record = useHistory((s) => s.record);

  useEffect(() => {
    if (word) {
      record({ id: word.id, term: word.term, fr_translation: word.fr_translation, image_url: word.image_url, status: word.status });
    }
  }, [word]);

  const playAudio = async () => {
    if (!word?.audios.length) return;
    const { sound } = await Audio.Sound.createAsync({ uri: word.audios[0].url });
    await sound.playAsync();
  };

  if (isLoading || !word) return <Loading />;

  const hasAudio = word.audios.length > 0;
  const firstDefinition = word.definitions[0];
  const firstExample = word.examples[0];
  const hasMore = word.translations.length > 0 || word.definitions.length > 1 || word.examples.length > 1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      {word.image_url ? <Image source={{ uri: word.image_url }} style={styles.image} /> : null}

      <Card>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headline}>{word.term}</Text>
            {word.part_of_speech ? <Text style={styles.pos}>({word.part_of_speech})</Text> : null}
          </View>
          <TouchableOpacity onPress={playAudio} disabled={!hasAudio} hitSlop={8}>
            <Ionicons name="volume-medium-outline" size={22} color={hasAudio ? colors.primary : colors.border} />
          </TouchableOpacity>
        </View>

        {firstDefinition ? <Text style={styles.definition}>{firstDefinition.text}</Text> : null}

        {word.fr_translation ? (
          <>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.secondary}>
                <Text style={styles.secondaryLabel}>Français : </Text>
                {word.fr_translation}
              </Text>
              <TouchableOpacity onPress={playAudio} disabled={!hasAudio} hitSlop={8}>
                <Ionicons name="volume-medium-outline" size={20} color={hasAudio ? colors.primary : colors.border} />
              </TouchableOpacity>
            </View>
            {firstExample ? (
              <>
                <HighlightedSentence sentence={firstExample.sentence} term={word.term} style={styles.note} />
                {firstExample.translation ? <Text style={styles.note}>{firstExample.translation}</Text> : null}
              </>
            ) : null}
          </>
        ) : null}

        <View style={styles.footerRow}>
          <TouchableOpacity
            onPress={() => toggleFavorite({ id: word.id, term: word.term, fr_translation: word.fr_translation, image_url: word.image_url, status: word.status })}
            hitSlop={8}
          >
            <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={24} color={colors.favorite} />
          </TouchableOpacity>
          {hasMore && (
            <TouchableOpacity style={styles.moreButton} onPress={() => setShowMore((v) => !v)}>
              <Text style={styles.moreText}>{showMore ? "Voir moins" : "Voir plus"}</Text>
              <Ionicons name={showMore ? "chevron-up" : "chevron-forward"} size={14} color={colors.primaryDark} />
            </TouchableOpacity>
          )}
        </View>
      </Card>

      {showMore && (
        <>
          {word.translations.length > 0 && (
            <View style={styles.moreSection}>
              <Text style={styles.moreSectionTitle}>Autres traductions</Text>
              {word.translations.map((t: Translation) => (
                <Card key={t.id}>
                  <View style={styles.row}>
                    <Text style={styles.langTag}>{t.language.toUpperCase()}</Text>
                    <Text style={styles.definition}>{t.text}</Text>
                  </View>
                  {t.example ? (
                    <>
                      <HighlightedSentence sentence={t.example} term={word.term} style={styles.note} />
                      {t.example_translation ? <Text style={styles.note}>{t.example_translation}</Text> : null}
                    </>
                  ) : null}
                </Card>
              ))}
            </View>
          )}
          {word.definitions.length > 1 && (
            <View style={styles.moreSection}>
              <Text style={styles.moreSectionTitle}>Autres définitions</Text>
              {word.definitions.slice(1).map((d: Definition) => (
                <Card key={d.id}>
                  <Text style={styles.definition}>{d.text}</Text>
                </Card>
              ))}
            </View>
          )}
          {word.examples.length > 1 && (
            <View style={styles.moreSection}>
              <Text style={styles.moreSectionTitle}>Autres exemples</Text>
              {word.examples.slice(1).map((e: Example) => (
                <Card key={e.id}>
                  <HighlightedSentence sentence={e.sentence} term={word.term} style={styles.definition} />
                  {e.translation ? <Text style={styles.pos}>{e.translation}</Text> : null}
                </Card>
              ))}
            </View>
          )}
        </>
      )}

      {word.en_translation ? <Text style={styles.footerInfo}>Traduction anglaise : {word.en_translation}</Text> : null}
      {word.source ? <Text style={[styles.footerInfo, styles.italic]}>Ajouté par : {word.source}</Text> : null}
    </ScrollView>
  );
}

/** Affiche une phrase d'exemple en surlignant l'occurrence du mot/expression. */
function HighlightedSentence({ sentence, term, style }: { sentence: string; term: string; style: object }) {
  const idx = sentence.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return <Text style={style}>{sentence}</Text>;
  return (
    <Text style={style}>
      {sentence.slice(0, idx)}
      <Text style={styles.highlight}>{sentence.slice(idx, idx + term.length)}</Text>
      {sentence.slice(idx + term.length)}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  image: { width: "100%", height: 200, borderRadius: 16, marginBottom: spacing.md, backgroundColor: colors.border },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headline: { fontSize: font.h1, fontWeight: "800", color: colors.primaryDark },
  pos: { fontSize: font.small, color: colors.textMuted, fontStyle: "italic", marginTop: 1 },
  definition: { fontSize: font.body, color: colors.text, marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  secondary: { fontSize: font.body, color: colors.text, flex: 1 },
  secondaryLabel: { fontWeight: "700", color: colors.accent },
  note: { fontSize: font.small, color: colors.textMuted, fontStyle: "italic", marginTop: 4 },
  highlight: { color: colors.accent, fontWeight: "700" },
  moreSection: { marginTop: spacing.md },
  moreSectionTitle: { fontSize: font.small, fontWeight: "700", color: colors.textMuted, marginBottom: spacing.xs },
  langTag: {
    fontSize: font.tiny, fontWeight: "700", color: colors.textMuted,
    backgroundColor: colors.border, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  footerRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: spacing.md,
  },
  moreButton: { flexDirection: "row", alignItems: "center", gap: 2 },
  moreText: { fontSize: font.small, fontWeight: "600", color: colors.primaryDark },
  footerInfo: { fontSize: font.small, color: colors.textMuted, marginTop: spacing.sm },
  italic: { fontStyle: "italic" },
});
