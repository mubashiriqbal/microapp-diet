import AsyncStorage from "@react-native-async-storage/async-storage"
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

const getItem = (key: string) => AsyncStorage.getItem(key)
const setItem = (key: string, value: unknown) => AsyncStorage.setItem(key, JSON.stringify(value))

export const getGoals = async (): Promise<TrackingGoals> =>
  safeParse(await getItem(GOALS_KEY), defaultGoals)

export const setGoals = async (goals: TrackingGoals) => setItem(GOALS_KEY, goals)

export const getManualFoods = async (): Promise<ManualFood[]> =>
  safeParse(await getItem(MANUAL_FOODS_KEY), [])

export const setManualFoods = async (foods: ManualFood[]) => setItem(MANUAL_FOODS_KEY, foods)

export const addManualFood = async (food: ManualFood) => {
  const updated = [...(await getManualFoods()), food]
  await setManualFoods(updated)
  return updated
}

export const getJournalItems = async (): Promise<JournalItem[]> =>
  safeParse(await getItem(JOURNAL_KEY), [])

export const setJournalItems = async (items: JournalItem[]) => setItem(JOURNAL_KEY, items)

export const addJournalItem = async (item: JournalItem) => {
  const updated = [...(await getJournalItems()), item]
  await setJournalItems(updated)
  return updated
}

export const updateJournalItem = async (itemId: string, patch: Partial<JournalItem>) => {
  const items = await getJournalItems()
  const updated = items.map((item) => (item.id === itemId ? { ...item, ...patch } : item))
  await setJournalItems(updated)
  return updated
}

export const deleteJournalItem = async (itemId: string) => {
  const updated = (await getJournalItems()).filter((item) => item.id !== itemId)
  await setJournalItems(updated)
  return updated
}

export const getJournalForDate = async (date: string): Promise<JournalDayLog> => {
  const items = (await getJournalItems()).filter((item) => item.date === date)
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

export const getMealItems = async (date: string, mealType: MealType) =>
  (await getJournalItems()).filter((item) => item.date === date && item.mealType === mealType)

export const getPlans = async (): Promise<Plan[]> => safeParse(await getItem(PLANS_KEY), [])

export const setPlans = async (plans: Plan[]) => setItem(PLANS_KEY, plans)

export const setActivePlan = async (planId: string | null) => setItem(ACTIVE_PLAN_KEY, planId)

export const getActivePlanId = async (): Promise<string | null> =>
  safeParse(await getItem(ACTIVE_PLAN_KEY), null)

export const getReminders = async (): Promise<ReminderPrefs> =>
  safeParse(await getItem(REMINDERS_KEY), { enabled: false, times: [] })

export const setReminders = async (prefs: ReminderPrefs) => setItem(REMINDERS_KEY, prefs)

export const getWeights = async (): Promise<WeightEntry[]> => safeParse(await getItem(WEIGHT_KEY), [])

export const setWeights = async (entries: WeightEntry[]) => setItem(WEIGHT_KEY, entries)

export const addWeight = async (entry: WeightEntry) => {
  const updated = [...(await getWeights()), entry]
  await setWeights(updated)
  return updated
}

export const getActivities = async (): Promise<ActivityEntry[]> =>
  safeParse(await getItem(ACTIVITY_KEY), [])

export const setActivities = async (entries: ActivityEntry[]) => setItem(ACTIVITY_KEY, entries)

export const addActivity = async (entry: ActivityEntry) => {
  const updated = [...(await getActivities()), entry]
  await setActivities(updated)
  return updated
}

export const getStreaks = async (): Promise<Streaks> => {
  const items = await getJournalItems()
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
