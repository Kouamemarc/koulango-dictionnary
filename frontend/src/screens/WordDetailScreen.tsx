import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Audio } from "expo-av";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Loading } from "@/components/UI";
import { MeApi, WordsApi } from "@/api/endpoints";
import { colors, font, spacing } from "@/theme";

export default function WordDetailScreen({ route }: any) {
  const { id } = route.params;
  const { data: word, isLoading } = useQuery({
    queryKey: ["word", id],
    queryFn: () => WordsApi.detail(id),
  });

  const playAudio = async (url: string) => {
    const { sound } = await Audio.Sound.createAsync({ uri: url });
    await sound.playAsync();
  };

  if (isLoading || !word) return <Loading />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      <Text style={styles.term}>{word.term}</Text>
      {word.pronunciations[0]?.ipa ? (
        <Text style={styles.ipa}>/{word.pronunciations[0].ipa}/</Text>
      ) : null}

      <View style={styles.badges}>
        {word.fr_translation ? <Text style={styles.badgeFr}>FR · {word.fr_translation}</Text> : null}
        {word.en_translation ? <Text style={styles.badgeEn}>EN · {word.en_translation}</Text> : null}
      </View>

      {word.audios.length > 0 && (
        <Button title="▶  Écouter la prononciation" variant="ghost"
          onPress={() => playAudio(word.audios[0].url)} />
      )}

      {word.definitions.length > 0 && (
        <Section title="Définitions">
          {word.definitions.map((d) => (
            <Card key={d.id}>
              <Text style={styles.body}>{d.text}</Text>
              {d.part_of_speech ? <Text style={styles.pos}>{d.part_of_speech}</Text> : null}
            </Card>
          ))}
        </Section>
      )}

      {word.examples.length > 0 && (
        <Section title="Exemples">
          {word.examples.map((e) => (
            <Card key={e.id}>
              <Text style={styles.body}>{e.sentence}</Text>
              {e.translation ? <Text style={styles.pos}>{e.translation}</Text> : null}
            </Card>
          ))}
        </Section>
      )}

      {word.source ? <Text style={styles.source}>Source : {word.source}</Text> : null}

      <View style={{ height: spacing.md }} />
      <Button title="★  Ajouter aux favoris"
        onPress={() => MeApi.addFavorite(word.id)} />
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: spacing.lg }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  term: { fontSize: font.h1, fontWeight: "800", color: colors.text },
  ipa: { fontSize: font.body, color: colors.textMuted, marginTop: 2 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: spacing.md },
  badgeFr: { backgroundColor: "#CCFBF1", color: colors.primaryDark, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, fontSize: font.small },
  badgeEn: { backgroundColor: "#FEF3C7", color: "#92400E", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, fontSize: font.small },
  sectionTitle: { fontSize: font.h3, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  body: { fontSize: font.body, color: colors.text },
  pos: { fontSize: font.small, color: colors.textMuted, marginTop: 4, fontStyle: "italic" },
  source: { fontSize: font.tiny, color: colors.textMuted, marginTop: spacing.lg },
});
