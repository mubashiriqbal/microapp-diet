import { useEffect, useState, useCallback } from "react"
import { View, Text, StyleSheet, ScrollView, Pressable, Image, TextInput } from "react-native"
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
  const [filterDate, setFilterDate] = useState("")
  const [filterName, setFilterName] = useState("")

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

  const filteredHistory = history.filter((entry) => {
    const name = (entry.productName || entry.analysisSnapshot?.productName || "").toLowerCase()
    const dateKey = new Date(entry.createdAt).toISOString().slice(0, 10)
    const matchName = filterName ? name.includes(filterName.toLowerCase()) : true
    const matchDate = filterDate ? dateKey === filterDate : true
    return matchName && matchDate
  })

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.filterRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={filterName}
          onChangeText={setFilterName}
          placeholder="Filter by name"
          placeholderTextColor={theme.colors.muted}
        />
        <TextInput
          style={[styles.input, { width: 140 }]}
          value={filterDate}
          onChangeText={setFilterDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.colors.muted}
        />
      </View>

      {filteredHistory.map((entry) => {
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
        const scoreValue = typeof score === "number" ? score : null
        const scoreColor = scoreValue === null ? theme.colors.muted : scoreValue >= 70 ? "#22C55E" : scoreValue >= 40 ? "#F59E0B" : theme.colors.warning
        const fallbackKey = `${entry.createdAt}|${entry.productName || entry.analysisSnapshot?.productName || ""}`
        const previewUri = entry.imageUrl || imageMap[entry.id] || imageMap[fallbackKey] || null
        return (
          <Pressable
            style={[styles.card, { borderLeftColor: scoreColor }]}
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
            <View style={styles.row}>
              <View style={styles.thumb}>
                {previewUri ? (
                  <Image source={{ uri: previewUri }} style={styles.thumbImage} />
                ) : null}
              </View>
              <View style={styles.info}>
                <Text style={styles.cardTitle}>{name}</Text>
                <Text style={styles.cardMeta}>{new Date(entry.createdAt).toLocaleString()}</Text>
                <Text style={styles.cardMeta}>
                  Score: {score ?? "Unknown"} | Calories/100g: {calories}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: scoreColor }]}>
                <Text style={styles.badgeText}>{scoreValue ?? "-"}</Text>
              </View>
            </View>
          </Pressable>
        )
      })}
      {!filteredHistory.length && <Text style={styles.empty}>No scans yet.</Text>}
      <Text style={styles.disclaimer}>Educational, not medical advice.</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.bg
  },
  filterRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: theme.spacing.md
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.panel,
    color: theme.colors.text
  },
  card: {
    padding: 14,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.panel,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 4
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: theme.colors.panelAlt,
    overflow: "hidden"
  },
  thumbImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
  info: {
    flex: 1
  },
  cardTitle: {
    fontWeight: "600",
    marginBottom: 2,
    color: theme.colors.text
  },
  cardMeta: {
    color: theme.colors.muted,
    fontSize: 12
  },
  badge: {
    minWidth: 32,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center"
  },
  badgeText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12
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
