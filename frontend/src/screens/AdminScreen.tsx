import React from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Loading } from "@/components/UI";
import { AdminApi } from "@/api/endpoints";
import { colors, font, spacing } from "@/theme";

export default function AdminScreen() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["pending"], queryFn: AdminApi.pending });

  const review = async (wordId: number, decision: "accepte" | "refuse") => {
    // NB : ici on utilise l'id du mot ; en production, exposer l'id de contribution.
    const reason = decision === "refuse" ? "Non conforme" : undefined;
    try {
      await AdminApi.review(wordId, decision, reason);
      qc.invalidateQueries({ queryKey: ["pending"] });
    } catch {
      Alert.alert("Erreur", "Action impossible.");
    }
  };

  if (isLoading) return <Loading />;
  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.md }}
      data={data ?? []}
      keyExtractor={(w) => String(w.id)}
      ListHeaderComponent={<Text style={styles.h}>Mots en attente de validation</Text>}
      ListEmptyComponent={<Text style={styles.empty}>Rien à valider. 🎉</Text>}
      renderItem={({ item }) => (
        <Card>
          <Text style={styles.term}>{item.term}</Text>
          {item.fr_translation ? <Text style={styles.tr}>{item.fr_translation}</Text> : null}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Button title="Accepter" onPress={() => review(item.id, "accepte")} />
            </View>
            <View style={{ width: spacing.sm }} />
            <View style={{ flex: 1 }}>
              <Button title="Refuser" variant="danger" onPress={() => review(item.id, "refuse")} />
            </View>
          </View>
        </Card>
      )}
    />
  );
}
const styles = StyleSheet.create({
  h: { fontSize: font.h2, fontWeight: "800", color: colors.text, marginBottom: spacing.md },
  term: { fontSize: font.h3, fontWeight: "700", color: colors.text },
  tr: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  row: { flexDirection: "row", marginTop: spacing.sm },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: spacing.xl },
});
