import { useEffect, useState, useCallback } from "react"
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native"
import { fetchHistory } from "../api/client"
import {
  getProfile,
  getScanHistoryCache,
  getScanImageMap,
  setScanHistoryCache
} from "../storage/cache"
import type { ScanHistory } from "@wimf/shared"
import { theme } from "../theme"
import { useNavigation, useFocusEffect } from "@react-navigation/native"

export default function HistoryScreen() {
  const navigation = useNavigation()
  const [history, setHistory] = useState<ScanHistory[]>([])
  const [status, setStatus] = useState("Loading...")
  const [imageMap, setImageMap] = useState<Record<string, string>>({})

  const loadHistory = useCallback(async () => {
    const cached = await getScanHistoryCache()
    if (cached.length) {
      setHistory(cached)
      setStatus("")
    }

    try {
      const storedImages = await getScanImageMap()
      setImageMap(storedImages)
      const profile = await getProfile()
      if (!profile) {
        setStatus("Please log in.")
        return
      }
      const fresh = await fetchHistory(profile.id)
      setHistory(fresh)
      setScanHistoryCache(fresh)
      setStatus("")
    } catch {
      if (!cached.length) {
        setStatus("Unable to reach API")
      }
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  useFocusEffect(
    useCallback(() => {
      loadHistory()
    }, [loadHistory])
  )

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {history.map((entry) => {
        const score = entry.analysisSnapshot?.score?.value
        const nutrition = entry.analysisSnapshot?.nutritionHighlights
        let calories: number | string | null = "Unknown"
        if (entry.analysisSnapshot?.caloriesPer50g !== null && entry.analysisSnapshot?.caloriesPer50g !== undefined) {
          calories = Number((entry.analysisSnapshot.caloriesPer50g * 2).toFixed(1))
        } else if (nutrition) {
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
          } else if (nutrition.calories !== null && nutrition.calories !== undefined) {
            calories = Number(nutrition.calories.toFixed(1))
          }
        }
        const name = entry.productName || entry.analysisSnapshot?.productName || "Scan"
        return (
            <Pressable
              style={styles.card}
              key={entry.id}
              onPress={() => {
                if (entry.analysisSnapshot) {
                  navigation.navigate("MainTabs" as never, {
                    screen: "Scan",
                    params: {
                      screen: "Results",
                      params: {
                        analysis: entry.analysisSnapshot,
                        imageUri: imageMap[entry.id] || null,
                        fromHistory: true
                      }
                    }
                  } as never)
                }
              }}
            >
            <Text style={styles.cardTitle}>{name}</Text>
            <Text style={styles.cardMeta}>{new Date(entry.createdAt).toLocaleString()}</Text>
            <Text style={styles.cardMeta}>
              Score: {score ?? "Unknown"} | Calories/100g: {calories}
            </Text>
          </Pressable>
        )
      })}
      {!history.length && <Text style={styles.empty}>No scans yet.</Text>}
      <Text style={styles.disclaimer}>Educational, not medical advice.</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.bg
  },
  card: {
    padding: 16,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.glass,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border
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
