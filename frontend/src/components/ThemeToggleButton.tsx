import React from "react";
import { TouchableOpacity, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIsDark, useThemeColors } from "@/theme";
import { useThemePreference } from "@/store/themePreference";

export function ThemeToggleButton() {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const systemIsDark = useColorScheme() === "dark";
  const toggle = useThemePreference((s) => s.toggle);

  return (
    <TouchableOpacity onPress={() => toggle(systemIsDark)} hitSlop={8} style={{ marginRight: 16 }}>
      <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={22} color={colors.text} />
    </TouchableOpacity>
  );
}
