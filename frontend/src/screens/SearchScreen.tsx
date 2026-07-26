import React, { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Field, Loading } from "@/components/UI";
import { WordListItem } from "@/components/WordListItem";
import { WordsApi } from "@/api/endpoints";
import { colors, spacing } from "@/theme";

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
        renderItem={({ item }) => <WordListItem item={item} navigation={navigation} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, backgroundColor: colors.bg },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: spacing.lg },
});
