import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { Button, Field } from "@/components/UI";
import { useAuth } from "@/store/auth";
import { colors, font, spacing } from "@/theme";

export default function LoginScreen() {
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState("admin@koulango.dev");
  const [password, setPassword] = useState("Admin1234!");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch {
      Alert.alert("Connexion échouée", "Identifiants invalides.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <Text style={styles.logo}>Koulango</Text>
      <Text style={styles.subtitle}>Dictionnaire collaboratif</Text>
      <View style={{ height: spacing.xl }} />
      <Field label="Email" value={email} onChangeText={setEmail}
        autoCapitalize="none" keyboardType="email-address" />
      <Field label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />
      <Button title="Se connecter" onPress={onSubmit} loading={loading} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: spacing.lg, backgroundColor: colors.bg },
  logo: { fontSize: 40, fontWeight: "800", color: colors.primary, textAlign: "center" },
  subtitle: { fontSize: font.body, color: colors.textMuted, textAlign: "center", marginTop: 4 },
});
