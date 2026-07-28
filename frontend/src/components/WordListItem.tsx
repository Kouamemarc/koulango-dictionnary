import React, { useMemo } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/UI";
import { useFavorites } from "@/store/favorites";
import { font, radius, spacing, ThemeColors, useThemeColors } from "@/theme";
import type { Lang, WordSummary } from "@/types";

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  thumb: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.border },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  thumbInitial: { fontSize: font.h3, fontWeight: "700", color: colors.primaryDark },
  termRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  term: { fontSize: font.h3, fontWeight: "700", color: colors.text },
  pos: { fontSize: font.small, color: colors.textMuted, fontStyle: "italic" },
  tr: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
});

export function WordListItem({
  item, navigation, lang = "koulango",
}: { item: WordSummary; navigation: any; lang?: Lang }) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isFavorite = useFavorites((s) => s.isFavorite(item.id));
  const toggleFavorite = useFavorites((s) => s.toggle);

  // Le sens du toggle Français/Koulango décide quel terme sert de titre.
  const showFrFirst = lang === "francais" && !!item.fr_translation;
  const headline = showFrFirst ? item.fr_translation : item.term;
  const secondary = showFrFirst ? item.term : item.fr_translation;

  return (
    <TouchableOpacity onPress={() => navigation.navigate("WordDetail", { id: item.id })}>
      <Card style={styles.row}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Text style={styles.thumbInitial}>{(headline ?? "?").charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View style={styles.termRow}>
            <Text style={styles.term}>{headline}</Text>
            {item.part_of_speech ? <Text style={styles.pos}>({item.part_of_speech})</Text> : null}
          </View>
          {secondary ? <Text style={styles.tr}>{secondary}</Text> : null}
        </View>
        <TouchableOpacity onPress={() => toggleFavorite(item)} hitSlop={8}>
          <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={22} color={colors.favorite} />
        </TouchableOpacity>
      </Card>
    </TouchableOpacity>
  );
}
