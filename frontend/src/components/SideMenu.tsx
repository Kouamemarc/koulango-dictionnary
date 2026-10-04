/** Bouton ☰ de l'en-tête + panneau latéral : à propos, devenir modérateur, contact. */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { font, radius, spacing, ThemeColors, useThemeColors } from "@/theme";

const PANEL_WIDTH = Math.min(320, Dimensions.get("window").width * 0.86);

const ITEMS = [
  { screen: "About", icon: "information-circle-outline", title: "À propos", subtitle: "Le dictionnaire, son histoire et sa mission" },
  { screen: "Moderator", icon: "shield-checkmark-outline", title: "Devenir modérateur", subtitle: "Aider à vérifier les mots proposés" },
  { screen: "Contact", icon: "mail-outline", title: "Contacter le développeur", subtitle: "Une idée, un problème, une suggestion" },
] as const;

export function MenuButton() {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) Animated.timing(slide, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [open, slide]);

  const close = (then?: () => void) =>
    Animated.timing(slide, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setOpen(false);
      then?.();
    });

  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [-PANEL_WIDTH, 0] });

  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} hitSlop={8} style={{ marginLeft: 16, marginRight: 4 }} accessibilityLabel="Ouvrir le menu">
        <Ionicons name="menu" size={26} color={colors.text} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="none" statusBarTranslucent onRequestClose={() => close()}>
        <Animated.View style={[styles.backdrop, { opacity: slide }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} accessibilityLabel="Fermer le menu" />
        </Animated.View>
        <Animated.View
          style={[
            styles.panel,
            { transform: [{ translateX }], paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.md },
          ]}
        >
          <View style={styles.head}>
            <Image source={require("../../assets/icon.png")} style={styles.logo} />
            <View style={{ flex: 1 }}>
              <Text style={styles.line1}>DICTIONNAIRE</Text>
              <Text style={styles.line2}>KOULANGO</Text>
            </View>
            <TouchableOpacity onPress={() => close()} hitSlop={10} accessibilityLabel="Fermer le menu">
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {ITEMS.map((item) => (
            <TouchableOpacity key={item.screen} style={styles.item} onPress={() => close(() => navigation.navigate(item.screen))}>
              <Ionicons name={item.icon} size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}

          <Text style={styles.foot}>Gratuit, pour valoriser la langue et la culture koulango.</Text>
        </Animated.View>
      </Modal>
    </>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  panel: {
    position: "absolute", top: 0, bottom: 0, left: 0, width: PANEL_WIDTH,
    backgroundColor: colors.bg, paddingHorizontal: spacing.md,
    borderRightWidth: 1, borderRightColor: colors.border,
  },
  head: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingBottom: spacing.md, marginBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  logo: { width: 42, height: 42, borderRadius: 10 },
  line1: { fontSize: 12, fontWeight: "800", color: colors.primaryDark, letterSpacing: 0.5 },
  line2: { fontSize: 17, fontWeight: "800", color: colors.accent, letterSpacing: 0.5, marginTop: -2 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: radius.md },
  itemTitle: { fontSize: font.body - 1, fontWeight: "700", color: colors.text },
  itemSubtitle: { fontSize: font.tiny + 1, color: colors.textMuted, marginTop: 2 },
  foot: { marginTop: "auto", fontSize: font.tiny + 1, color: colors.textMuted, lineHeight: 18, paddingHorizontal: 6 },
});
