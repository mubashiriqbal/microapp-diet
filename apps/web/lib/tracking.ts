import type {
  JournalDayLog,
  JournalItem,
  ManualFood,
  MealType,
  Plan,
  ReminderPrefs,
  Streaks,
  TrackingGoals,
  WeightEntry,
  ActivityEntry
} from "@wimf/shared"

const JOURNAL_KEY = "wimf.journal.items"
const MANUAL_FOODS_KEY = "wimf.journal.manual_foods"
const GOALS_KEY = "wimf.tracking.goals"
const PLANS_KEY = "wimf.tracking.plans"
const ACTIVE_PLAN_KEY = "wimf.tracking.active_plan"
const REMINDERS_KEY = "wimf.tracking.reminders"
const WEIGHT_KEY = "wimf.tracking.weight"
const ACTIVITY_KEY = "wimf.tracking.activity"

const defaultGoals: TrackingGoals = {
  caloriesTarget: 2000,
  proteinTarget: 80,
  sodiumLimit: 2000,
  sugarLimit: 50
}

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const getStorage = (key: string) =>
  typeof window === "undefined" ? null : localStorage.getItem(key)

const setStorage = (key: string, value: unknown) => {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(value))
}

export const getGoals = (): TrackingGoals =>
  safeParse(getStorage(GOALS_KEY), defaultGoals)

export const setGoals = (goals: TrackingGoals) => setStorage(GOALS_KEY, goals)

export const getManualFoods = (): ManualFood[] =>
  safeParse(getStorage(MANUAL_FOODS_KEY), [])

export const setManualFoods = (foods: ManualFood[]) => setStorage(MANUAL_FOODS_KEY, foods)

export const addManualFood = (food: ManualFood) => {
  const updated = [...getManualFoods(), food]
  setManualFoods(updated)
  return updated
}

export const getJournalItems = (): JournalItem[] =>
  safeParse(getStorage(JOURNAL_KEY), [])

export const setJournalItems = (items: JournalItem[]) => setStorage(JOURNAL_KEY, items)

export const addJournalItem = (item: JournalItem) => {
  const updated = [...getJournalItems(), item]
  setJournalItems(updated)
  return updated
}

export const getJournalForDate = (date: string): JournalDayLog => {
  const items = getJournalItems().filter((item) => item.date === date)
  let missingNutritionCount = 0
  const totals = items.reduce(
    (acc, item) => {
      const nutrition = item.nutritionPer100g
      if (!nutrition || nutrition.caloriesPer100g == null) {
        missingNutritionCount += 1
        return acc
      }
      const factor = item.grams / 100
      acc.calories += (nutrition.caloriesPer100g || 0) * factor
      acc.protein_g += (nutrition.protein_g || 0) * factor
      acc.carbs_g += (nutrition.carbs_g || 0) * factor
      acc.sugar_g += (nutrition.sugar_g || 0) * factor
      acc.sodium_mg += (nutrition.sodium_mg || 0) * factor
      return acc
    },
    { calories: 0, protein_g: 0, carbs_g: 0, sugar_g: 0, sodium_mg: 0 }
  )

  return {
    date,
    items,
    totals: {
      calories: Math.round(totals.calories),
      protein_g: Math.round(totals.protein_g),
      carbs_g: Math.round(totals.carbs_g),
      sugar_g: Math.round(totals.sugar_g),
      sodium_mg: Math.round(totals.sodium_mg)
    },
    missingNutritionCount
  }
}

export const getMealItems = (date: string, mealType: MealType) =>
  getJournalItems().filter((item) => item.date === date && item.mealType === mealType)

export const getPlans = (): Plan[] => safeParse(getStorage(PLANS_KEY), [])

export const setPlans = (plans: Plan[]) => setStorage(PLANS_KEY, plans)

export const setActivePlan = (planId: string | null) => setStorage(ACTIVE_PLAN_KEY, planId)

export const getActivePlanId = (): string | null =>
  safeParse(getStorage(ACTIVE_PLAN_KEY), null)

export const getReminders = (): ReminderPrefs =>
  safeParse(getStorage(REMINDERS_KEY), { enabled: false, times: [] })

export const setReminders = (prefs: ReminderPrefs) => setStorage(REMINDERS_KEY, prefs)

export const getWeights = (): WeightEntry[] => safeParse(getStorage(WEIGHT_KEY), [])

export const setWeights = (entries: WeightEntry[]) => setStorage(WEIGHT_KEY, entries)

export const addWeight = (entry: WeightEntry) => {
  const updated = [...getWeights(), entry]
  setWeights(updated)
  return updated
}

export const getActivities = (): ActivityEntry[] => safeParse(getStorage(ACTIVITY_KEY), [])

export const setActivities = (entries: ActivityEntry[]) => setStorage(ACTIVITY_KEY, entries)

export const addActivity = (entry: ActivityEntry) => {
  const updated = [...getActivities(), entry]
  setActivities(updated)
  return updated
}

export const getStreaks = (): Streaks => {
  const items = getJournalItems()
  if (!items.length) return { current: 0, longest: 0 }
  const dates = Array.from(new Set(items.map((item) => item.date))).sort()
  let longest = 1
  let current = 1
  for (let i = 1; i < dates.length; i += 1) {
    const prev = new Date(dates[i - 1])
    const next = new Date(dates[i])
    const diff = (next.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    if (diff === 1) {
      current += 1
    } else {
      longest = Math.max(longest, current)
      current = 1
    }
  }
  longest = Math.max(longest, current)
  return { current, longest }
}
