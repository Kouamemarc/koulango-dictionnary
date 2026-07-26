import React, { useState } from "react";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Card, Field, Loading } from "@/components/UI";
import { WordsApi } from "@/api/endpoints";
import { colors, font, radius, spacing } from "@/theme";
import type { WordSummary } from "@/types";

export default function SearchScreen({ navigation }: any) {
  const [q, setQ] = useState("");
  const isSearching = q.length >= 1;

  // Sans saisie : liste alphabétique complète des mots publiés (écran d'accueil).
  const list = useQuery({ queryKey: ["words", "list"], queryFn: WordsApi.list, enabled: !isSearching });
  // Dès la première lettre : recherche instantanée (préfixe + similarité).
  const search = useQuery({ queryKey: ["words", "search", q], queryFn: () => WordsApi.search(q), enabled: isSearching });

  const { data, isFetching } = isSearching ? search : list;

  return (
    <View style={styles.container}>
      <Field placeholder="Rechercher un mot koulango…" value={q} onChangeText={setQ} autoFocus />
      {isFetching && <Loading />}
      <FlatList
        data={data ?? []}
        keyExtractor={(w) => String(w.id)}
        ListEmptyComponent={
          !isFetching ? (
            <Text style={styles.empty}>
              {isSearching ? `Aucun résultat pour « ${q} ».` : "Aucun mot publié pour l'instant."}
            </Text>
          ) : null
        }
        renderItem={({ item }) => <WordRow item={item} navigation={navigation} />}
      />
    </View>
  );
}

function WordRow({ item, navigation }: { item: WordSummary; navigation: any }) {
  return (
    <TouchableOpacity onPress={() => navigation.navigate("WordDetail", { id: item.id })}>
      <Card style={styles.row}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Text style={styles.thumbInitial}>{item.term.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.term}>{item.term}</Text>
          {item.fr_translation ? <Text style={styles.tr}>{item.fr_translation}</Text> : null}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, backgroundColor: colors.bg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  thumb: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.border },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  thumbInitial: { fontSize: font.h3, fontWeight: "700", color: colors.primaryDark },
  term: { fontSize: font.h3, fontWeight: "700", color: colors.text },
  tr: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: spacing.lg },
});
