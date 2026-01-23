import { useEffect, useMemo, useState } from "react"
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from "react-native"
import type { AnalyzeFromImagesResponse, ManualFood, MealType } from "@wimf/shared"
import { theme } from "../theme"
import {
  addJournalItem,
  addManualFood,
  getJournalForDate,
  getManualFoods
} from "../storage/tracking"
import { getLastAnalysis } from "../storage/cache"

const todayKey = () => new Date().toISOString().slice(0, 10)

const mealLabels: { label: string; value: MealType }[] = [
  { label: "Breakfast", value: "breakfast" },
  { label: "Lunch", value: "lunch" },
  { label: "Dinner", value: "dinner" },
  { label: "Snack", value: "snack" }
]

export default function JournalScreen() {
  const [date, setDate] = useState(todayKey())
  const [log, setLog] = useState(() => ({
    date: todayKey(),
    items: [],
    totals: { calories: 0, protein_g: 0, carbs_g: 0, sugar_g: 0, sodium_mg: 0 },
    missingNutritionCount: 0
  }))
  const [mealType, setMealType] = useState<MealType>("lunch")
  const [grams, setGrams] = useState("50")
  const [manualFoods, setManualFoods] = useState<ManualFood[]>([])
  const [manualName, setManualName] = useState("")
  const [manualCalories, setManualCalories] = useState("")
  const [lastScan, setLastScan] = useState<AnalyzeFromImagesResponse | null>(null)
  const [status, setStatus] = useState("")

  useEffect(() => {
    const load = async () => {
      const data = await getJournalForDate(date)
      setLog(data)
      const foods = await getManualFoods()
      setManualFoods(foods)
      const stored = await getLastAnalysis()
      if (stored) {
        setLastScan(stored as AnalyzeFromImagesResponse)
      }
    }
    load()
  }, [date])

  const addFromScan = async () => {
    if (!lastScan) {
      setStatus("No recent scan found.")
      return
    }
    const parsedCalories = lastScan.nutritionHighlights?.caloriesPer100g ?? null
    const computed = lastScan.nutritionHighlights?.servingSizeG
      ? lastScan.nutritionHighlights?.calories
        ? (lastScan.nutritionHighlights.calories * 100) / lastScan.nutritionHighlights.servingSizeG
        : null
      : null
    const caloriesPer100g = parsedCalories ?? computed ?? null
    const nutritionPer100g = caloriesPer100g
      ? {
          id: "scan",
          name: lastScan.productName || "Scan item",
          caloriesPer100g,
          protein_g: lastScan.nutritionHighlights?.protein_g ?? null,
          carbs_g: lastScan.nutritionHighlights?.carbs_g ?? null,
          sugar_g: lastScan.nutritionHighlights?.sugar_g ?? null,
          sodium_mg: lastScan.nutritionHighlights?.sodium_mg ?? null
        }
      : undefined

    await addJournalItem({
      id: `${Date.now()}`,
      date,
      mealType,
      grams: Number(grams) || 50,
      createdAt: new Date().toISOString(),
      analysisSnapshot: lastScan,
      name: lastScan.productName || "Scan item",
      nutritionPer100g
    })
    setStatus("Added to journal.")
    const updated = await getJournalForDate(date)
    setLog(updated)
  }

  const addManual = async () => {
    if (!manualName) {
      setStatus("Enter a food name.")
      return
    }
    const calories = Number(manualCalories)
    const food: ManualFood = {
      id: `${Date.now()}`,
      name: manualName,
      caloriesPer100g: Number.isFinite(calories) ? calories : null
    }
    await addManualFood(food)
    await addJournalItem({
      id: `${Date.now()}-manual`,
      date,
      mealType,
      grams: Number(grams) || 50,
      createdAt: new Date().toISOString(),
      manualFoodId: food.id,
      name: food.name,
      nutritionPer100g: food
    })
    setManualFoods(await getManualFoods())
    setStatus("Manual item added.")
    setManualName("")
    setManualCalories("")
    setLog(await getJournalForDate(date))
  }

  const itemsByMeal = useMemo(() => {
    const groups = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: []
    } as Record<MealType, typeof log.items>
    log.items.forEach((item) => {
      groups[item.mealType].push(item)
    })
    return groups
  }, [log.items])

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Journal</Text>
      <Text style={styles.subtitle}>Track what you ate today.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Date</Text>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.colors.muted}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Add from last scan</Text>
        <Text style={styles.meta}>
          {lastScan?.productName || "No recent scan"}
        </Text>
        <View style={styles.row}>
          {mealLabels.map((meal) => (
            <Pressable
              key={meal.value}
              style={[
                styles.chip,
                mealType === meal.value ? styles.chipActive : null
              ]}
              onPress={() => setMealType(meal.value)}
            >
              <Text style={styles.chipText}>{meal.label}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.input}
          value={grams}
          onChangeText={setGrams}
          placeholder="Grams (default 50)"
          placeholderTextColor={theme.colors.muted}
          keyboardType="numeric"
        />
        <Pressable style={styles.primaryButton} onPress={addFromScan}>
          <Text style={styles.primaryButtonText}>Add to Journal</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Manual entry</Text>
        <TextInput
          style={styles.input}
          value={manualName}
          onChangeText={setManualName}
          placeholder="Food name"
          placeholderTextColor={theme.colors.muted}
        />
        <TextInput
          style={styles.input}
          value={manualCalories}
          onChangeText={setManualCalories}
          placeholder="Calories per 100g (optional)"
          placeholderTextColor={theme.colors.muted}
          keyboardType="numeric"
        />
        <Pressable style={styles.primaryButton} onPress={addManual}>
          <Text style={styles.primaryButtonText}>Add manual item</Text>
        </Pressable>
      </View>

      {mealLabels.map((meal) => (
        <View style={styles.card} key={meal.value}>
          <Text style={styles.sectionTitle}>{meal.label}</Text>
          {itemsByMeal[meal.value].length === 0 && (
            <Text style={styles.meta}>No items yet.</Text>
          )}
          {itemsByMeal[meal.value].map((item) => (
            <View style={styles.itemRow} key={item.id}>
              <Text style={styles.itemName}>{item.name || "Item"}</Text>
              <Text style={styles.itemMeta}>{item.grams}g</Text>
            </View>
          ))}
        </View>
      ))}

      {log.missingNutritionCount > 0 && (
        <Text style={styles.notice}>
          Some items are missing nutrition. Totals may be incomplete.
        </Text>
      )}

      {status ? <Text style={styles.status}>{status}</Text> : null}
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
    color: theme.colors.text
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
  sectionTitle: {
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 8
  },
  label: {
    color: theme.colors.muted,
    marginBottom: 6
  },
  meta: {
    color: theme.colors.muted,
    marginBottom: 8
  },
  input: {
    backgroundColor: theme.colors.panelAlt,
    color: theme.colors.text,
    padding: 10,
    borderRadius: theme.radius.md,
    marginBottom: 10
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10
  },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.panelAlt,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12
  },
  chipActive: {
    borderColor: theme.colors.accent2
  },
  chipText: {
    color: theme.colors.text,
    fontSize: 12
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    alignItems: "center"
  },
  primaryButtonText: {
    color: "#02130c",
    fontWeight: "700"
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6
  },
  itemName: {
    color: theme.colors.text
  },
  itemMeta: {
    color: theme.colors.muted
  },
  notice: {
    color: theme.colors.warning,
    marginBottom: 12
  },
  status: {
    color: theme.colors.muted,
    marginBottom: 8
  },
  disclaimer: {
    color: theme.colors.muted,
    textAlign: "center"
  }
})
