export type MealType = "breakfast" | "lunch" | "dinner" | "snack"

export type ManualFood = {
  id: string
  name: string
  caloriesPer100g?: number | null
  protein_g?: number | null
  carbs_g?: number | null
  sugar_g?: number | null
  sodium_mg?: number | null
}

export type JournalItem = {
  id: string
  date: string
  mealType: MealType
  grams: number
  createdAt: string
  analysisSnapshot?: unknown
  manualFoodId?: string
  name?: string
  nutritionPer100g?: ManualFood
}

export type JournalDayLog = {
  date: string
  items: JournalItem[]
  totals: {
    calories: number
    protein_g: number
    carbs_g: number
    sugar_g: number
    sodium_mg: number
  }
  missingNutritionCount: number
}

export type TrackingGoals = {
  caloriesTarget: number
  proteinTarget: number
  sodiumLimit: number
  sugarLimit: number
}

export type WeightEntry = {
  id: string
  date: string
  weightKg: number
}

export type ActivityEntry = {
  id: string
  date: string
  caloriesBurned: number
}

export type Plan = {
  id: string
  name: string
  createdAt: string
  goals: TrackingGoals
}

export type ReminderPrefs = {
  enabled: boolean
  times: string[]
}

export type Streaks = {
  current: number
  longest: number
}
