import React, { useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Loading } from "@/components/UI";
import { WordListItem } from "@/components/WordListItem";
import { WordsApi } from "@/api/endpoints";
import { font, radius, spacing, ThemeColors, useThemeColors } from "@/theme";
import type { Lang } from "@/types";

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, padding: spacing.md, backgroundColor: colors.bg },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 12, marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: font.body, color: colors.text },
  toggleRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: 10, marginBottom: spacing.md,
  },
  toggleLabel: { fontSize: font.small, fontWeight: "600", color: colors.textMuted },
  toggleLabelActive: { color: colors.text },
  toggleButton: {
    width: 34, height: 34, borderRadius: radius.full,
    backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
  },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: spacing.lg },
  missing: {
    alignItems: "center", gap: spacing.sm, marginTop: spacing.md, padding: spacing.lg,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderStyle: "dashed", borderColor: colors.border,
  },
  missingText: { textAlign: "center", color: colors.textMuted, fontSize: font.body - 1, lineHeight: 22 },
  missingCta: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: 18, paddingVertical: 11,
  },
  missingCtaText: { color: "#fff", fontWeight: "700", fontSize: font.small },
  missingAlt: { color: colors.textMuted, fontSize: 13, textDecorationLine: "underline" },
});

export default function SearchScreen({ navigation }: any) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [q, setQ] = useState("");
  const [lang, setLang] = useState<Lang>("koulango");
  const isSearching = q.length >= 1;

  // Sans saisie : liste alphabétique complète des mots publiés (écran d'accueil).
  const list = useQuery({ queryKey: ["words", "list"], queryFn: WordsApi.list, enabled: !isSearching });
  // Dès la première lettre : recherche instantanée bidirectionnelle (koulango <-> français).
  const search = useQuery({
    queryKey: ["words", "search", q, lang],
    queryFn: () => WordsApi.search(q, lang),
    enabled: isSearching,
  });

  const { data, isLoading, isRefetching, refetch } = isSearching ? search : list;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un mot…"
          placeholderTextColor={colors.textMuted}
          value={q}
          onChangeText={setQ}
          autoFocus
        />
        <TouchableOpacity
          hitSlop={8}
          onPress={() => Alert.alert("Recherche vocale", "Bientôt disponible.")}
        >
          <Ionicons name="mic-outline" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.toggleRow}>
        <Text style={[styles.toggleLabel, lang === "francais" && styles.toggleLabelActive]}>Français</Text>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setLang((l) => (l === "koulango" ? "francais" : "koulango"))}
        >
          <Ionicons name="swap-horizontal" size={18} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.toggleLabel, lang === "koulango" && styles.toggleLabelActive]}>Koulango</Text>
      </View>

      {isLoading && <Loading />}
      <FlatList
        data={data ?? []}
        keyExtractor={(w) => String(w.id)}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          isLoading ? null : isSearching ? (
            // Mot introuvable : on propose directement de l'ajouter, guidé par l'assistant.
            <View style={styles.missing}>
              <Text style={styles.missingText}>
                « {q.trim()} » n'est pas encore dans le dictionnaire.{"\n"}Vous le connaissez ? Aidez-nous à l'ajouter !
              </Text>
              <TouchableOpacity
                style={styles.missingCta}
                onPress={() => navigation.navigate("Assistant", { term: q.trim(), lang })}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
                <Text style={styles.missingCtaText}>Ajouter ce mot avec l'assistant</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate("Contribuer")}>
                <Text style={styles.missingAlt}>ou remplir le formulaire</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.empty}>Aucun mot publié pour l'instant.</Text>
          )
        }
        renderItem={({ item }) => <WordListItem item={item} navigation={navigation} lang={lang} />}
      />
    </View>
  );
}
