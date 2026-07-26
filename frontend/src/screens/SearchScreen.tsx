import React, { useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Loading } from "@/components/UI";
import { WordListItem } from "@/components/WordListItem";
import { WordsApi } from "@/api/endpoints";
import { colors, font, radius, spacing } from "@/theme";
import type { Lang } from "@/types";

export default function SearchScreen({ navigation }: any) {
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

  const { data, isFetching } = isSearching ? search : list;

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

      {isFetching && <Loading />}
      <FlatList
        data={data ?? []}
        keyExtractor={(w) => String(w.id)}
        ListEmptyComponent={
          !isFetching ? (
            <Text style={styles.empty}>
              {isSearching ? `Aucun résultat pour « ${q} ».` : "Aucun mot publié pour l'instant."}
            </Text>
          ) : null
        }
        renderItem={({ item }) => <WordListItem item={item} navigation={navigation} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
});
