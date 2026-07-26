import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme";

export function HeaderLogo() {
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

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { width: 32, height: 32, borderRadius: 8 },
  line1: { fontSize: 11, fontWeight: "800", color: colors.primaryDark, letterSpacing: 0.5 },
  line2: { fontSize: 15, fontWeight: "800", color: colors.accent, letterSpacing: 0.5, marginTop: -2 },
});
