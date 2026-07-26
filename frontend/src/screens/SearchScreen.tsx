import React, { useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Card, Field, Loading } from "@/components/UI";
import { WordsApi } from "@/api/endpoints";
import { colors, font, spacing } from "@/theme";

export default function SearchScreen({ navigation }: any) {
  const [q, setQ] = useState("");

  // Recherche instantanée : requête à chaque frappe (dès 1 caractère)
  const { data, isFetching } = useQuery({
    queryKey: ["search", q],
    queryFn: () => WordsApi.search(q),
    enabled: q.length >= 1,
  });

  return (
    <View style={styles.container}>
      <Field placeholder="Rechercher un mot koulango…" value={q} onChangeText={setQ} autoFocus />
      {isFetching && <Loading />}
      <FlatList
        data={data ?? []}
        keyExtractor={(w) => String(w.id)}
        ListEmptyComponent={
          q.length >= 1 && !isFetching ? (
            <Text style={styles.empty}>Aucun résultat pour « {q} ».</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate("WordDetail", { id: item.id })}>
            <Card>
              <Text style={styles.term}>{item.term}</Text>
              {item.fr_translation ? <Text style={styles.tr}>{item.fr_translation}</Text> : null}
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, backgroundColor: colors.bg },
  term: { fontSize: font.h3, fontWeight: "700", color: colors.text },
  tr: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: spacing.lg },
});
