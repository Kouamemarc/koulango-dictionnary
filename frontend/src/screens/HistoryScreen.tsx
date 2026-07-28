import React, { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/UI";
import { WordListItem } from "@/components/WordListItem";
import { useHistory } from "@/store/history";
import { spacing, ThemeColors, useThemeColors } from "@/theme";

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, padding: spacing.md, backgroundColor: colors.bg },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: spacing.lg },
});

export default function HistoryScreen({ navigation }: any) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const items = useHistory((s) => s.items);
  const clear = useHistory((s) => s.clear);

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(w) => String(w.id)}
        ListHeaderComponent={
          items.length > 0 ? <Button title="Vider l'historique" variant="ghost" onPress={clear} /> : null
        }
        ListEmptyComponent={<Text style={styles.empty}>Aucun mot consulté pour l'instant.</Text>}
        renderItem={({ item }) => <WordListItem item={item} navigation={navigation} />}
      />
    </View>
  );
}
