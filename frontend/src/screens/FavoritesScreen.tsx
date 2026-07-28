import React, { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { WordListItem } from "@/components/WordListItem";
import { useFavorites } from "@/store/favorites";
import { spacing, ThemeColors, useThemeColors } from "@/theme";

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, padding: spacing.md, backgroundColor: colors.bg },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: spacing.lg },
});

export default function FavoritesScreen({ navigation }: any) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
