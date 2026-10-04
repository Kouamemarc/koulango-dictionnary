import React, { useMemo } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/UI";
import { font, radius, spacing, ThemeColors, useThemeColors } from "@/theme";

const SECTIONS: { title: string; paragraphs?: string[]; bullets?: string[] }[] = [
  {
    title: "Pourquoi ce dictionnaire ?",
    paragraphs: [
      "Le ministère de l'Éducation nationale a décidé d'intégrer l'enseignement des langues locales les plus parlées. Le koulango en fait partie : il est majoritairement parlé dans le Nord-Est de la Côte d'Ivoire, dans le district du Zanzan (régions du Bounkani et du Gontougo).",
      "Pourtant, en cherchant « koulango » sur le Play Store, on ne trouve que la Bible en koulango : aucun dictionnaire. Dans des groupes Facebook, des passionnés publient régulièrement des mots et des expressions pour enseigner et apprendre la langue, mais ce savoir se perd dans le fil des publications.",
      "Le Dictionnaire Koulango leur offre un lieu unique, gratuit et durable, où chaque mot est conservé, vérifié et retrouvable en quelques secondes.",
    ],
  },
  {
    title: "Ce que vous pouvez faire",
    bullets: [
      "Chercher un mot du koulango vers le français, ou du français vers le koulango.",
      "Consulter des fiches complètes : traductions, exemples, prononciation écrite et audio, illustration.",
      "Garder vos mots favoris et retrouver votre historique, sans créer de compte.",
      "Proposer un mot ou une expression, seul ou guidé pas à pas par l'assistant.",
    ],
  },
  {
    title: "Des mots vérifiés",
    paragraphs: [
      "Chaque proposition est relue par un modérateur avant d'être publiée. L'assistant d'ajout n'invente jamais de koulango : les mots, les exemples et la prononciation viennent toujours des locuteurs eux-mêmes.",
    ],
  },
  {
    title: "La suite : une IA koulango",
    paragraphs: [
      "Chaque mot, chaque exemple et chaque enregistrement partagé construit une base de connaissances sur la langue. Quand elle sera assez solide, nous mettrons en place une IA koulango, construite à partir de ce que la communauté aura transmis.",
    ],
  },
  {
    title: "Nos engagements",
    bullets: [
      "Gratuit : le dictionnaire est et restera gratuit.",
      "Sans compte : ni pour consulter, ni pour contribuer ; vos favoris restent sur votre appareil.",
      "Fidèle à la langue : les contenus viennent des locuteurs et sont relus avant publication.",
    ],
  },
];

export default function AboutScreen({ navigation }: any) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <View style={styles.hero}>
        <Image source={require("../../assets/icon.png")} style={styles.logo} />
        <Text style={styles.heroTitle}>À propos du Dictionnaire Koulango</Text>
        <Text style={styles.heroText}>Un dictionnaire collaboratif et gratuit, pour valoriser la langue et la culture koulango.</Text>
      </View>

      {SECTIONS.map((s) => (
        <View key={s.title} style={styles.card}>
          <Text style={styles.cardTitle}>{s.title}</Text>
          {s.paragraphs?.map((p, i) => <Text key={i} style={styles.paragraph}>{p}</Text>)}
          {s.bullets?.map((b, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{b}</Text>
            </View>
          ))}
        </View>
      ))}

      <Button title="Proposer un mot" onPress={() => navigation.navigate("Tabs", { screen: "Contribuer" })} />
      <Button title="Devenir modérateur" variant="ghost" onPress={() => navigation.navigate("Moderator")} />
      <Button title="Contacter le développeur" variant="ghost" onPress={() => navigation.navigate("Contact")} />
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: { alignItems: "center", marginBottom: spacing.md },
  logo: { width: 96, height: 96, borderRadius: 22 },
  heroTitle: { fontSize: font.h3 + 2, fontWeight: "800", color: colors.text, textAlign: "center", marginTop: spacing.sm },
  heroText: { fontSize: font.small, color: colors.textMuted, textAlign: "center", marginTop: 4, lineHeight: 20 },
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm,
  },
  cardTitle: { fontSize: font.body, fontWeight: "800", color: colors.primaryDark, marginBottom: spacing.xs },
  paragraph: { fontSize: font.small, color: colors.text, lineHeight: 21, marginBottom: 6 },
  bulletRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  bulletDot: { fontSize: font.small, color: colors.primary, lineHeight: 21 },
  bulletText: { flex: 1, fontSize: font.small, color: colors.text, lineHeight: 21 },
});
