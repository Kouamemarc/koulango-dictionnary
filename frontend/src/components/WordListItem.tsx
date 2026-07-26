import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/UI";
import { useFavorites } from "@/store/favorites";
import { colors, font, radius, spacing } from "@/theme";
import type { WordSummary } from "@/types";

export function WordListItem({ item, navigation }: { item: WordSummary; navigation: any }) {
  const isFavorite = useFavorites((s) => s.isFavorite(item.id));
  const toggleFavorite = useFavorites((s) => s.toggle);

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
        <TouchableOpacity onPress={() => toggleFavorite(item)} hitSlop={8}>
          <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={22} color={colors.favorite} />
        </TouchableOpacity>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  thumb: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.border },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  thumbInitial: { fontSize: font.h3, fontWeight: "700", color: colors.primaryDark },
  term: { fontSize: font.h3, fontWeight: "700", color: colors.text },
  tr: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
});
