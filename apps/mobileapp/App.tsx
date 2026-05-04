import { REGISTRY_APP_NAME, registryModules } from "@registry/config";
import { registryTheme } from "@registry/ui";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Mobile channel</Text>
        <Text style={styles.title}>{REGISTRY_APP_NAME}</Text>
        <Text style={styles.summary}>
          Mobile is reserved for field checks, delivery notes, and quick customer reference once those workflows are ready.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Planned shared modules</Text>
          {registryModules.map((module) => (
            <View key={module.key} style={styles.moduleRow}>
              <View style={styles.moduleBadge} />
              <View style={styles.moduleBody}>
                <Text style={styles.moduleTitle}>{module.title}</Text>
                <Text style={styles.moduleDescription}>{module.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.cardTitle}>Product direction</Text>
          <Text style={styles.note}>
            Desktop remains the primary workspace while mobile focuses on future on-site and customer-facing tasks.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: registryTheme.colors.canvas
  },
  content: {
    padding: registryTheme.spacing.lg,
    gap: registryTheme.spacing.lg
  },
  eyebrow: {
    color: registryTheme.colors.muted,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase"
  },
  title: {
    color: registryTheme.colors.text,
    fontSize: 34,
    fontWeight: "700"
  },
  summary: {
    color: registryTheme.colors.muted,
    fontSize: 16,
    lineHeight: 24
  },
  card: {
    gap: registryTheme.spacing.md,
    padding: registryTheme.spacing.lg,
    borderRadius: registryTheme.radii.large,
    backgroundColor: registryTheme.colors.panel
  },
  noteCard: {
    padding: registryTheme.spacing.lg,
    borderRadius: registryTheme.radii.medium,
    backgroundColor: registryTheme.colors.panelStrong
  },
  cardTitle: {
    color: registryTheme.colors.text,
    fontSize: 18,
    fontWeight: "700"
  },
  moduleRow: {
    flexDirection: "row",
    gap: registryTheme.spacing.md,
    alignItems: "flex-start"
  },
  moduleBadge: {
    width: 10,
    height: 10,
    marginTop: 7,
    borderRadius: 999,
    backgroundColor: registryTheme.colors.accent
  },
  moduleBody: {
    flex: 1,
    gap: 4
  },
  moduleTitle: {
    color: registryTheme.colors.text,
    fontSize: 16,
    fontWeight: "600"
  },
  moduleDescription: {
    color: registryTheme.colors.muted,
    lineHeight: 20
  },
  note: {
    color: registryTheme.colors.text,
    lineHeight: 22
  }
});
