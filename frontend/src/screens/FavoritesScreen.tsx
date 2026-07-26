import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { WordListItem } from "@/components/WordListItem";
import { useFavorites } from "@/store/favorites";
import { colors, spacing } from "@/theme";

export default function FavoritesScreen({ navigation }: any) {
  const items = useFavorites((s) => s.items);

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(w) => String(w.id)}
        ListEmptyComponent={<Text style={styles.empty}>Aucun favori pour l'instant.</Text>}
        renderItem={({ item }) => <WordListItem item={item} navigation={navigation} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, backgroundColor: colors.bg },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: spacing.lg },
});
