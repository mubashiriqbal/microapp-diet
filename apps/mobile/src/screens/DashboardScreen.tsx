import { useEffect, useMemo, useState } from "react"
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { getJournalForDate } from "../storage/tracking"
import {
  getProfile,
  getProfilePrefs,
  getScanHistoryCache,
  getScanImageMap
} from "../storage/cache"
import { theme } from "../theme"
import ScoreRing from "../components/ScoreRing"
import GradientButton from "../components/GradientButton"

const todayKey = () => new Date().toISOString().slice(0, 10)

export default function DashboardScreen() {
  const navigation = useNavigation()
  const [date] = useState(todayKey())
  const [name, setName] = useState("there")
  const [profilePrefs, setProfilePrefs] = useState({
    dietary: {} as Record<string, boolean>,
    allergies: {} as Record<string, boolean>
  })
  const [totals, setTotals] = useState({
    calories: 0,
    missingNutritionCount: 0,
    itemsCount: 0
  })
  const [history, setHistory] = useState<Array<any>>([])
  const [imageMap, setImageMap] = useState<Record<string, string>>({})

  useEffect(() => {
    const load = async () => {
      const profile = await getProfile()
      if (profile?.fullName) {
        setName(profile.fullName.split(" ")[0])
      } else if (profile?.email) {
        setName(profile.email.split("@")[0])
      }
      const profilePrefs = await getProfilePrefs()
      setProfilePrefs({
        dietary: profilePrefs.dietary || {},
        allergies: profilePrefs.allergies || {}
      })
      const log = await getJournalForDate(date)
      const cachedHistory = await getScanHistoryCache()
      const cachedImages = await getScanImageMap()
      setHistory(cachedHistory)
      setImageMap(cachedImages)
      setTotals({
        calories: log.totals.calories,
        missingNutritionCount: log.missingNutritionCount,
        itemsCount: log.items.length
      })
    }

    load()
  }, [date])

  const averageScore = useMemo(() => {
    const scores = history
      .map((item) => item.analysisSnapshot?.score?.value)
      .filter((value: number | undefined) => typeof value === "number")
    if (!scores.length) return 0
    return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
  }, [history])

  const todayFoods = totals.itemsCount

  const unhealthyCount = useMemo(() => {
    const today = new Date(date)
    return history.filter((item) => {
      const createdAt = new Date(item.createdAt)
      if (createdAt.toDateString() !== today.toDateString()) return false
      return (item.analysisSnapshot?.score?.value || 0) < 40
    }).length
  }, [date, history])

  const allergenAlerts = useMemo(() => {
    const ingredientMatches = (ingredients: string[], allergyKey: string) => {
      const lower = ingredients.map((item) => item.toLowerCase())
      const matchers: Record<string, string[]> = {
        peanuts: ["peanut"],
        tree_nuts: ["almond", "walnut", "pecan", "cashew", "nut"],
        dairy: ["milk", "cheese", "butter", "cream", "whey", "yogurt"],
        eggs: ["egg"],
        shellfish: ["shrimp", "crab", "lobster", "shellfish"],
        fish: ["fish", "salmon", "tuna", "cod"],
        soy: ["soy", "soya"],
        wheat_gluten: ["wheat", "gluten", "barley", "rye"],
        sesame: ["sesame"],
        sulfites: ["sulfite", "sulphite"]
      }
      const tokens = matchers[allergyKey] || [allergyKey]
      return tokens.some((token) => lower.some((item) => item.includes(token)))
    }

    const selected = Object.keys(profilePrefs.allergies).filter((key) => profilePrefs.allergies[key])
    if (!selected.length) return 0
    return history.filter((entry) => {
      const ingredients = entry.analysisSnapshot?.ingredientBreakdown?.map((item: any) => item.name) || []
      return selected.some((allergy) => ingredientMatches(ingredients, allergy))
    }).length
  }, [history, profilePrefs.allergies])

  const recentScans = history.slice(0, 2)
  const popularScans = history.slice(0, 2)

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeText}>
          Welcome back <Text style={styles.welcomeName}> {name}</Text>
        </Text>
      </View>

      <View style={styles.scoreCard}>
        <View style={styles.scoreHeader}>
          <View style={styles.scoreInfo}>
            <Text style={styles.sectionLabel}>Avg. Health Score</Text>
            <Text style={styles.scoreValue}>
              {averageScore} <Text style={styles.scoreMuted}>/ 100</Text>
            </Text>
          </View>
          <ScoreRing value={averageScore} size={140} strokeWidth={12} />
        </View>
        <View style={styles.scoreStats}>
          <View style={styles.statRow}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.accent} />
            <Text style={styles.statText}>Today's foods</Text>
            <Text style={styles.statValue}>{todayFoods}</Text>
          </View>
          <View style={styles.statRow}>
            <Ionicons name="alert-circle" size={16} color={theme.colors.warning} />
            <Text style={styles.statText}>Allergens</Text>
            <Text style={styles.statValue}>{allergenAlerts}</Text>
          </View>
          <View style={styles.statRow}>
            <Ionicons name="warning" size={16} color={theme.colors.warning} />
            <Text style={styles.statText}>Unhealthy items</Text>
            <Text style={styles.statValue}>{unhealthyCount}</Text>
          </View>
        </View>
        <GradientButton style={styles.viewJournal} onPress={() => navigation.navigate("Journal" as never)}>
          <Ionicons name="book-outline" size={16} color="#ffffff" />
          <Text style={styles.viewJournalText}>View Journal</Text>
        </GradientButton>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Dietary Preferences + Alerts</Text>
        <View style={styles.chipRow}>
          {Object.entries(profilePrefs.dietary)
            .filter(([, value]) => value)
            .slice(0, 3)
            .map(([key]) => (
              <View key={key} style={styles.chip}>
                <Text style={styles.chipText}>{key.replace(/_/g, " ")}</Text>
              </View>
            ))}
          {Object.entries(profilePrefs.allergies)
            .filter(([, value]) => value)
            .slice(0, 2)
            .map(([key]) => (
              <View key={key} style={styles.chip}>
                <Text style={styles.chipText}>{key.replace(/_/g, " ")}</Text>
              </View>
            ))}
          {Object.values(profilePrefs.dietary).filter(Boolean).length === 0 &&
          Object.values(profilePrefs.allergies).filter(Boolean).length === 0 ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>Set preferences</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark" size={20} color={theme.colors.accent2} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Learn about your preferences</Text>
              <Text style={styles.infoBody}>
                Used to identify key ingredients and provide personalized alerts.
              </Text>
            </View>
          </View>
          <Pressable style={styles.managePrefs} onPress={() => navigation.navigate("Settings" as never)}>
            <Ionicons name="settings-outline" size={16} color={theme.colors.accent2} />
            <Text style={styles.managePrefsText}>Manage Preferences</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent Scans</Text>
          <Pressable onPress={() => navigation.navigate("History" as never)}>
            <Text style={styles.sectionLink}>View All</Text>
          </Pressable>
        </View>
        {recentScans.length === 0 ? (
          <Text style={styles.bodyMuted}>No recent scans yet.</Text>
        ) : (
          recentScans.map((scan) => (
            <View key={scan.id} style={styles.scanRow}>
              <View style={styles.scanThumb}>
                {imageMap[scan.id] ? (
                  <Image source={{ uri: imageMap[scan.id] }} style={styles.scanThumbImage} />
                ) : null}
              </View>
              <View style={styles.scanInfo}>
                <Text style={styles.scanTitle}>{scan.productName || "Scan"}</Text>
                <Text style={styles.scanMeta}>Estimated serving: 1 slice</Text>
                <View style={styles.scanTime}>
                  <Ionicons name="time-outline" size={12} color={theme.colors.muted} />
                  <Text style={styles.scanMeta}>
                    {new Date(scan.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              </View>
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreBadgeText}>{scan.analysisSnapshot?.score?.value ?? "-"}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Popular Scans Today</Text>
        <View style={styles.popularRow}>
          {popularScans.map((scan) => (
            <View key={scan.id} style={styles.popularCard}>
              <View style={styles.popularThumb}>
                {imageMap[scan.id] ? (
                  <Image source={{ uri: imageMap[scan.id] }} style={styles.popularImage} />
                ) : null}
              </View>
              <View style={styles.popularFooter}>
                <Text style={styles.popularTitle}>{scan.productName || "Scan"}</Text>
                <View style={styles.popularScore}>
                  <Text style={styles.popularScoreText}>{scan.analysisSnapshot?.score?.value ?? "-"}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.bg
  },
  welcomeCard: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: "rgba(26,188,156,0.4)",
    ...theme.shadow.card
  },
  welcomeText: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "600"
  },
  welcomeName: {
    color: "#ffffff",
    fontWeight: "700"
  },
  scoreCard: {
    backgroundColor: theme.colors.panel,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card
  },
  scoreHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.md
  },
  scoreInfo: {
    flex: 1
  },
  sectionLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  scoreValue: {
    fontSize: 26,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 4
  },
  scoreMuted: {
    color: theme.colors.muted,
    fontSize: 14
  },
  scoreStats: {
    marginTop: theme.spacing.md,
    gap: 8
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  statText: {
    color: theme.colors.textSoft,
    fontSize: 13,
    flex: 1
  },
  statValue: {
    color: theme.colors.text,
    fontWeight: "700"
  },
  viewJournal: {
    marginTop: theme.spacing.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: "flex-start"
  },
  viewJournalText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12
  },
  card: {
    backgroundColor: theme.colors.panel,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: theme.spacing.sm
  },
  chip: {
    backgroundColor: theme.colors.panelAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  chipText: {
    fontSize: 12,
    color: theme.colors.text
  },
  infoCard: {
    backgroundColor: theme.colors.glass,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  infoRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: theme.spacing.sm,
    alignItems: "flex-start"
  },
  infoTitle: {
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 4
  },
  infoBody: {
    color: theme.colors.muted,
    fontSize: 12
  },
  managePrefs: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  managePrefsText: {
    color: theme.colors.accent2,
    fontWeight: "700",
    fontSize: 12
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm
  },
  sectionLink: {
    color: theme.colors.accent2,
    fontSize: 12,
    fontWeight: "600"
  },
  scanRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  scanThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: theme.colors.panelAlt,
    overflow: "hidden"
  },
  scanThumbImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
  scanInfo: {
    flex: 1
  },
  scanTitle: {
    fontWeight: "600",
    color: theme.colors.text
  },
  scanMeta: {
    color: theme.colors.muted,
    fontSize: 11
  },
  scanTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  scoreBadge: {
    backgroundColor: theme.colors.accent,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  scoreBadgeText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12
  },
  popularRow: {
    flexDirection: "row",
    gap: 12
  },
  popularCard: {
    flex: 1,
    backgroundColor: theme.colors.panelAlt,
    borderRadius: theme.radius.md,
    padding: 10
  },
  popularThumb: {
    width: "100%",
    height: 80,
    borderRadius: 12,
    backgroundColor: theme.colors.border,
    overflow: "hidden",
    marginBottom: 8
  },
  popularImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
  popularTitle: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "600"
  },
  popularFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  popularScore: {
    backgroundColor: theme.colors.accent2,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  popularScoreText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700"
  },
  bodyMuted: {
    color: theme.colors.muted,
    fontSize: 12
  }
})
