import { useEffect, useState } from "react"
import { View, Text, StyleSheet, ScrollView } from "react-native"
import { fetchHistory } from "../api/client"
import { getProfile, getScanHistoryCache, setScanHistoryCache } from "../storage/cache"
import type { ScanHistory } from "@wimf/shared"
import { theme } from "../theme"

export default function HistoryScreen() {
  const [history, setHistory] = useState<ScanHistory[]>([])
  const [status, setStatus] = useState("Loading...")

  useEffect(() => {
    const load = async () => {
      const cached = await getScanHistoryCache()
      if (cached.length) {
        setHistory(cached)
        setStatus("Loaded cached history")
      }

      try {
        const profile = await getProfile()
        if (!profile) {
          setStatus("Please log in.")
          return
        }
        const fresh = await fetchHistory(profile.id)
        setHistory(fresh)
        setScanHistoryCache(fresh)
        setStatus("Synced from API")
      } catch {
        if (!cached.length) {
          setStatus("Unable to reach API")
        }
      }
    }

    load()
  }, [])

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>History</Text>
      <Text style={styles.status}>{status}</Text>
      {history.map((entry) => {
        const score = entry.analysisSnapshot?.score?.value
        const nutrition = entry.analysisSnapshot?.nutritionHighlights
        let calories: number | string | null = "Unknown"
        if (nutrition) {
          if (nutrition.caloriesPer100g !== null && nutrition.caloriesPer100g !== undefined) {
            calories = nutrition.caloriesPer100g
          } else if (
            nutrition.calories !== null &&
            nutrition.calories !== undefined &&
            nutrition.servingSizeG !== null &&
            nutrition.servingSizeG !== undefined &&
            nutrition.servingSizeG > 0
          ) {
            calories = Number(((nutrition.calories * 100) / nutrition.servingSizeG).toFixed(1))
          }
        }
        const name = entry.productName || entry.analysisSnapshot?.productName || "Scan"
        return (
          <View style={styles.card} key={entry.id}>
            <Text style={styles.cardTitle}>{name}</Text>
            <Text style={styles.cardMeta}>{new Date(entry.createdAt).toLocaleString()}</Text>
            <Text style={styles.cardMeta}>
              Score: {score ?? "Unknown"} | Calories/100g: {calories}
            </Text>
          </View>
        )
      })}
      {!history.length && <Text style={styles.empty}>No scans yet.</Text>}
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
    marginBottom: 8,
    color: theme.colors.text
  },
  status: {
    color: theme.colors.muted,
    marginBottom: 16
  },
  card: {
    padding: 16,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.panel,
    marginBottom: 12
  },
  cardTitle: {
    fontWeight: "600",
    marginBottom: 4,
    color: theme.colors.text
  },
  cardMeta: {
    color: theme.colors.muted
  },
  empty: {
    color: theme.colors.muted,
    marginTop: 16
  },
  disclaimer: {
    marginTop: 16,
    color: theme.colors.muted,
    textAlign: "center"
  }
})
