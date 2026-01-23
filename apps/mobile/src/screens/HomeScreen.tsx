import { useEffect, useState } from "react"
import { View, Text, StyleSheet, Pressable } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { fetchTodayCalories } from "../api/client"
import { getScanHistoryCache } from "../storage/cache"
import { theme } from "../theme"

export default function HomeScreen() {
  const navigation = useNavigation()
  const [scanCount, setScanCount] = useState(0)
  const [lastScanLabel, setLastScanLabel] = useState("No scans yet")
  const [calories, setCalories] = useState<{
    goal: number
    consumed: number
    remaining: number
    status: "within" | "reached"
  } | null>(null)

  useEffect(() => {
    const load = async () => {
      const history = await getScanHistoryCache()
      setScanCount(history.length)
      const latest = history[0]
      if (latest) {
        setLastScanLabel(latest.productName || latest.analysisSnapshot?.productName || "Recent scan")
      }
    }

    load()
  }, [])

  useEffect(() => {
    const loadCalories = async () => {
      try {
        const summary = await fetchTodayCalories()
        setCalories(summary)
      } catch {
        setCalories(null)
      }
    }
    loadCalories()
  }, [])

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>What's In My Food?</Text>
      <Text style={styles.title}>Snap. Learn. Decide.</Text>
      <Text style={styles.subtitle}>
        Capture ingredients and nutrition labels for OCR-based analysis. Educational only.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Today</Text>
        <Text style={styles.cardValue}>{scanCount}</Text>
        <Text style={styles.cardMeta}>Last scan: {lastScanLabel}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Daily calories</Text>
        <Text style={styles.cardValue}>{calories?.consumed ?? 0}</Text>
        <Text style={styles.cardMeta}>
          Goal {calories?.goal ?? 2000} • Remaining {calories?.remaining ?? 2000}
        </Text>
        <Text style={styles.cardMeta}>
          {calories?.status === "reached" ? "Limit reached" : "Within your limit"}
        </Text>
      </View>

      <Pressable
        style={styles.primaryButton}
        onPress={() => navigation.navigate("Scan" as never)}
      >
        <Text style={styles.primaryButtonText}>Scan label</Text>
      </Pressable>

      <Text style={styles.disclaimer}>Educational, not medical advice.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: theme.colors.bg
  },
  kicker: {
    color: theme.colors.accent2,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontSize: 12,
    marginBottom: 6
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 8
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 15,
    marginBottom: 24
  },
  card: {
    backgroundColor: theme.colors.panel,
    borderRadius: theme.radius.lg,
    padding: 18,
    marginBottom: 18
  },
  cardLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.4
  },
  cardValue: {
    color: theme.colors.text,
    fontSize: 32,
    fontWeight: "700",
    marginTop: 6
  },
  cardMeta: {
    color: theme.colors.muted,
    marginTop: 6
  },
  primaryButton: {
    backgroundColor: theme.colors.accent2,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center"
  },
  primaryButtonText: {
    color: "#04131a",
    fontWeight: "700",
    fontSize: 16
  },
  disclaimer: {
    marginTop: 16,
    color: theme.colors.muted,
    textAlign: "center",
    fontSize: 12
  }
})
