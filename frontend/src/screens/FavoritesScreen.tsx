import React from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Card, Loading } from "@/components/UI";
import { MeApi } from "@/api/endpoints";
import { colors, font, spacing } from "@/theme";

export default function FavoritesScreen({ navigation }: any) {
  const { data, isLoading } = useQuery({ queryKey: ["favorites"], queryFn: MeApi.favorites });
  if (isLoading) return <Loading />;
  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.md }}
      data={data ?? []}
      keyExtractor={(w) => String(w.id)}
      ListEmptyComponent={<Text style={styles.empty}>Aucun favori pour l'instant.</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => navigation.navigate("WordDetail", { id: item.id })}>
          <Card>
            <Text style={styles.term}>{item.term}</Text>
            {item.fr_translation ? <Text style={styles.tr}>{item.fr_translation}</Text> : null}
          </Card>
        </TouchableOpacity>
      )}
    />
  );
}
const styles = StyleSheet.create({
  term: { fontSize: font.h3, fontWeight: "700", color: colors.text },
  tr: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: spacing.xl },
});
