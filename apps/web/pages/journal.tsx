import { useEffect, useMemo, useState } from "react"
import type { AnalyzeFromImagesResponse, ManualFood, MealType } from "@wimf/shared"
import {
  addJournalItem,
  addManualFood,
  getJournalForDate,
  getManualFoods
} from "../lib/tracking"

const todayKey = () => new Date().toISOString().slice(0, 10)

const mealLabels: { label: string; value: MealType }[] = [
  { label: "Breakfast", value: "breakfast" },
  { label: "Lunch", value: "lunch" },
  { label: "Dinner", value: "dinner" },
  { label: "Snack", value: "snack" }
]

export default function Journal() {
  const [date, setDate] = useState(todayKey())
  const [log, setLog] = useState(() => getJournalForDate(todayKey()))
  const [mealType, setMealType] = useState<MealType>("lunch")
  const [grams, setGrams] = useState(50)
  const [manualFoods, setManualFoods] = useState<ManualFood[]>([])
  const [manualName, setManualName] = useState("")
  const [manualCalories, setManualCalories] = useState("")
  const [status, setStatus] = useState("")
  const [lastScan, setLastScan] = useState<AnalyzeFromImagesResponse | null>(null)

  useEffect(() => {
    setLog(getJournalForDate(date))
  }, [date])

  useEffect(() => {
    setManualFoods(getManualFoods())
    const stored = sessionStorage.getItem("wimf.analysis")
    if (stored) {
      setLastScan(JSON.parse(stored) as AnalyzeFromImagesResponse)
    }
  }, [])

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

  const addFromScan = () => {
    if (!lastScan) {
      setStatus("No recent scan found.")
      return
    }
    const caloriesPer100g =
      lastScan.nutritionHighlights?.caloriesPer100g ??
      (lastScan.nutritionHighlights?.calories &&
      lastScan.nutritionHighlights?.servingSizeG
        ? (lastScan.nutritionHighlights.calories * 100) /
          lastScan.nutritionHighlights.servingSizeG
        : null)

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

    addJournalItem({
      id: `${Date.now()}`,
      date,
      mealType,
      grams,
      createdAt: new Date().toISOString(),
      analysisSnapshot: lastScan,
      name: lastScan.productName || "Scan item",
      nutritionPer100g
    })
    setStatus("Added to journal.")
    setLog(getJournalForDate(date))
  }

  const addManual = () => {
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
    addManualFood(food)
    addJournalItem({
      id: `${Date.now()}-manual`,
      date,
      mealType,
      grams,
      createdAt: new Date().toISOString(),
      manualFoodId: food.id,
      name: food.name,
      nutritionPer100g: food
    })
    setManualFoods(getManualFoods())
    setManualName("")
    setManualCalories("")
    setStatus("Manual item added.")
    setLog(getJournalForDate(date))
  }

  return (
    <main className="container page-shell">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">Journal</h1>
        <input
          className="form-control"
          style={{ maxWidth: 180 }}
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </div>

      <div className="row g-3">
        <div className="col-lg-6">
          <div className="glass-card">
            <h2 className="h6">Add from last scan</h2>
            <div className="text-muted small mb-2">
              {lastScan?.productName || "No recent scan"}
            </div>
            <div className="d-flex flex-wrap gap-2 mb-3">
              {mealLabels.map((meal) => (
                <button
                  key={meal.value}
                  className={`btn btn-sm ${mealType === meal.value ? "btn-primary" : "btn-outline-light"}`}
                  onClick={() => setMealType(meal.value)}
                  type="button"
                >
                  {meal.label}
                </button>
              ))}
            </div>
            <div className="mb-3">
              <label className="form-label">Grams</label>
              <input
                className="form-control"
                type="number"
                value={grams}
                onChange={(event) => setGrams(Number(event.target.value))}
              />
            </div>
            <button className="btn btn-primary w-100" onClick={addFromScan}>
              Add to Journal
            </button>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="glass-card">
            <h2 className="h6">Manual entry</h2>
            <div className="mb-3">
              <label className="form-label">Food name</label>
              <input
                className="form-control"
                value={manualName}
                onChange={(event) => setManualName(event.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Calories per 100g (optional)</label>
              <input
                className="form-control"
                type="number"
                value={manualCalories}
                onChange={(event) => setManualCalories(event.target.value)}
              />
            </div>
            <button className="btn btn-outline-light w-100" onClick={addManual}>
              Add manual item
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4">
        {mealLabels.map((meal) => (
          <details className="glass-card mb-3" key={meal.value}>
            <summary className="fw-semibold mb-2">{meal.label}</summary>
            {itemsByMeal[meal.value].length === 0 && (
              <div className="text-muted">No items yet.</div>
            )}
            {itemsByMeal[meal.value].map((item) => (
              <div className="d-flex justify-content-between mb-2" key={item.id}>
                <div>{item.name || "Item"}</div>
                <div className="text-muted">{item.grams}g</div>
              </div>
            ))}
          </details>
        ))}
      </div>

      {log.missingNutritionCount > 0 && (
        <div className="alert alert-warning mt-3">
          Some items are missing nutrition. Totals may be incomplete.
        </div>
      )}
      {status && <div className="text-muted mt-3">{status}</div>}
      <div className="footer-note mt-4">Educational, not medical advice.</div>
    </main>
  )
}
