import React, { useMemo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { ThemeColors, useThemeColors } from "@/theme";

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 42, height: 42, borderRadius: 10 },
  line1: { fontSize: 13, fontWeight: "800", color: colors.primaryDark, letterSpacing: 0.5 },
  line2: { fontSize: 19, fontWeight: "800", color: colors.accent, letterSpacing: 0.5, marginTop: -2 },
});

export function HeaderLogo() {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <Image source={require("../../assets/icon.png")} style={styles.logo} />
      <View>
        <Text style={styles.line1}>DICTIONNAIRE</Text>
        <Text style={styles.line2}>KOULANGO</Text>
      </View>
    </View>
  );
}
