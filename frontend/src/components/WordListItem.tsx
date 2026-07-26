import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { Card } from "@/components/UI";
import { useFavorites } from "@/store/favorites";
import { colors, font, radius, spacing } from "@/theme";
import type { Lang, WordSummary } from "@/types";

export function WordListItem({
  item, navigation, lang = "koulango",
}: { item: WordSummary; navigation: any; lang?: Lang }) {
  const isFavorite = useFavorites((s) => s.isFavorite(item.id));
  const toggleFavorite = useFavorites((s) => s.toggle);

  // Le sens du toggle Français/Koulango décide quel terme sert de titre.
  const showFrFirst = lang === "francais" && !!item.fr_translation;
  const headline = showFrFirst ? item.fr_translation : item.term;
  const secondaryLabel = showFrFirst ? "Koulango" : "Français";
  const secondaryValue = showFrFirst ? item.term : item.fr_translation;

  const playAudio = async () => {
    if (!item.audio_url) return;
    const { sound } = await Audio.Sound.createAsync({ uri: item.audio_url });
    await sound.playAsync();
  };

  return (
    <TouchableOpacity onPress={() => navigation.navigate("WordDetail", { id: item.id })}>
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}>
              <Text style={styles.thumbInitial}>{(headline ?? "?").charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.headline}>{headline}</Text>
            {item.part_of_speech && <Text style={styles.pos}>({item.part_of_speech})</Text>}
          </View>
          <TouchableOpacity onPress={playAudio} disabled={!item.audio_url} hitSlop={8}>
            <Ionicons
              name="volume-medium-outline"
              size={22}
              color={item.audio_url ? colors.primary : colors.border}
            />
          </TouchableOpacity>
        </View>

        {item.definition && <Text style={styles.definition}>{item.definition}</Text>}

        {secondaryValue && (
          <>
            <View style={styles.divider} />
            <Text style={styles.secondary}>
              <Text style={styles.secondaryLabel}>{secondaryLabel} : </Text>
              {secondaryValue}
            </Text>
            {item.example && <Text style={styles.note}>{item.example}</Text>}
          </>
        )}

        <View style={styles.footerRow}>
          <TouchableOpacity onPress={() => toggleFavorite(item)} hitSlop={8}>
            <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={22} color={colors.favorite} />
          </TouchableOpacity>
          <View style={styles.moreButton}>
            <Text style={styles.moreText}>Voir la fiche</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primaryDark} />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  thumb: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.border },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  thumbInitial: { fontSize: font.body, fontWeight: "700", color: colors.primaryDark },
  headline: { fontSize: font.h3, fontWeight: "800", color: colors.primaryDark },
  pos: { fontSize: font.small, color: colors.textMuted, fontStyle: "italic", marginTop: 1 },
  definition: { fontSize: font.body, color: colors.text, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  secondary: { fontSize: font.body, color: colors.text },
  secondaryLabel: { fontWeight: "700", color: colors.accent },
  note: { fontSize: font.small, color: colors.textMuted, fontStyle: "italic", marginTop: 2 },
  footerRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  moreButton: { flexDirection: "row", alignItems: "center", gap: 2 },
  moreText: { fontSize: font.small, fontWeight: "600", color: colors.primaryDark },
});
