import { useEffect, useState } from "react"
import { View, Text, StyleSheet, Pressable, ScrollView, Share } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { getJournalForDate, getGoals, getStreaks, getActivities } from "../storage/tracking"
import { theme } from "../theme"

const todayKey = () => new Date().toISOString().slice(0, 10)

export default function DashboardScreen() {
  const navigation = useNavigation()
  const [date] = useState(todayKey())
  const [totals, setTotals] = useState({
    calories: 0,
    protein_g: 0,
    sugar_g: 0,
    sodium_mg: 0,
    missingNutritionCount: 0
  })
  const [goals, setGoals] = useState({
    caloriesTarget: 2000,
    proteinTarget: 80,
    sodiumLimit: 2000,
    sugarLimit: 50
  })
  const [streaks, setStreaks] = useState({ current: 0, longest: 0 })
  const [activityCalories, setActivityCalories] = useState(0)

  useEffect(() => {
    const load = async () => {
      const log = await getJournalForDate(date)
      const goal = await getGoals()
      const streak = await getStreaks()
      const activity = await getActivities()
      const todayActivity = activity
        .filter((entry) => entry.date === date)
        .reduce((sum, entry) => sum + entry.caloriesBurned, 0)

      setTotals({
        calories: log.totals.calories,
        protein_g: log.totals.protein_g,
        sugar_g: log.totals.sugar_g,
        sodium_mg: log.totals.sodium_mg,
        missingNutritionCount: log.missingNutritionCount
      })
      setGoals(goal)
      setStreaks(streak)
      setActivityCalories(Math.round(todayActivity))
    }

    load()
  }, [date])

  const handleShare = async () => {
    const text = [
      "Today summary (educational only):",
      `Calories: ${totals.calories}/${goals.caloriesTarget}`,
      `Protein: ${totals.protein_g}g`,
      `Sugar: ${totals.sugar_g}g`,
      `Sodium: ${totals.sodium_mg}mg`,
      "Educational, not medical advice."
    ].join("\n")

    await Share.share({ message: text })
  }

  const percent = (value: number, target: number) =>
    target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Today at a glance.</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Calories</Text>
        <Text style={styles.cardValue}>
          {totals.calories} / {goals.caloriesTarget}
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${percent(totals.calories, goals.caloriesTarget)}%` }]} />
        </View>
        <Text style={styles.cardMeta}>
          {totals.calories >= goals.caloriesTarget ? "Limit reached" : "Within your limit"}
        </Text>
      </View>

      <View style={styles.cardGrid}>
        <View style={styles.cardSmall}>
          <Text style={styles.cardLabel}>Protein</Text>
          <Text style={styles.cardValue}>
            {totals.protein_g}g / {goals.proteinTarget}g
          </Text>
        </View>
        <View style={styles.cardSmall}>
          <Text style={styles.cardLabel}>Sodium</Text>
          <Text style={styles.cardValue}>
            {totals.sodium_mg}mg / {goals.sodiumLimit}mg
          </Text>
        </View>
        <View style={styles.cardSmall}>
          <Text style={styles.cardLabel}>Sugar</Text>
          <Text style={styles.cardValue}>
            {totals.sugar_g}g / {goals.sugarLimit}g
          </Text>
        </View>
        <View style={styles.cardSmall}>
          <Text style={styles.cardLabel}>Activity calories</Text>
          <Text style={styles.cardValue}>{activityCalories} kcal</Text>
        </View>
      </View>

      {totals.missingNutritionCount > 0 && (
        <Text style={styles.notice}>
          Some items are missing nutrition. Totals may be incomplete.
        </Text>
      )}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Streaks</Text>
        <Text style={styles.cardValue}>Current: {streaks.current} days</Text>
        <Text style={styles.cardMeta}>Longest: {streaks.longest} days</Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("Journal" as never)}>
          <Text style={styles.primaryButtonText}>Log a meal</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={handleShare}>
          <Text style={styles.secondaryButtonText}>Share today</Text>
        </Pressable>
      </View>

      <Text style={styles.disclaimer}>Educational, not medical advice.</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: theme.colors.bg
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 4
  },
  subtitle: {
    color: theme.colors.muted,
    marginBottom: 16
  },
  card: {
    backgroundColor: theme.colors.panel,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: 16
  },
  cardLabel: {
    color: theme.colors.muted,
    textTransform: "uppercase",
    fontSize: 12
  },
  cardValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 6
  },
  cardMeta: {
    color: theme.colors.muted,
    marginTop: 6
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.panelAlt,
    borderRadius: 999,
    marginTop: 10,
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.colors.accent
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16
  },
  cardSmall: {
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: theme.colors.panel,
    borderRadius: theme.radius.lg,
    padding: 14
  },
  notice: {
    color: theme.colors.warning,
    marginBottom: 12
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16
  },
  primaryButton: {
    flex: 1,
    backgroundColor: theme.colors.accent2,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center"
  },
  primaryButtonText: {
    color: "#04131a",
    fontWeight: "700"
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.panelAlt,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center"
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: "700"
  },
  disclaimer: {
    color: theme.colors.muted,
    textAlign: "center",
    marginTop: 8
  }
})
