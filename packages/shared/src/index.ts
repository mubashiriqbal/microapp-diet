import type { AnalyzeFromImagesResponse } from "./analyze"

export type NutritionParsed = {
  calories?: number | null
  servingSizeG?: number | null
  caloriesPer100g?: number | null
  protein_g?: number | null
  carbs_g?: number | null
  sugar_g?: number | null
  addedSugar_g?: number | null
  sodium_mg?: number | null
  fiber_g?: number | null
}

export type OCRExtraction = {
  ingredientsText: string
  nutritionText: string
  frontText?: string
}

export type ParsedData = {
  productName: string | null
  ingredients: string[]
  nutrition: NutritionParsed | null
  confidences: {
    ingredientsConfidence: number
    nutritionConfidence: number
    nameConfidence: number
  }
}

export type UserPrefs = {
  userId: string
  halalCheckEnabled: boolean
  lowSodiumMgLimit?: number | null
  lowSugarGlimit?: number | null
  lowCarbGlimit?: number | null
  lowCalorieLimit?: number | null
  highProteinGtarget?: number | null
  vegetarian?: boolean | null
  vegan?: boolean | null
  sensitiveStomach?: boolean | null
}

export type Gender = "male" | "female" | "other"

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active"

export type DietaryPreference = "halal" | "vegetarian" | "vegan" | "none"

export type ConditionType =
  | "diabetes"
  | "hypertension"
  | "heart_disease"
  | "high_cholesterol"
  | "celiac"
  | "allergy"
  | "kidney_disease"
  | "other"

export type MedicalCondition = {
  id?: string
  type: ConditionType
  notes?: string | null
}

export type UserProfile = {
  id: string
  fullName?: string | null
  email: string
  mobileNumber?: string | null
  age?: number | null
  gender?: Gender | null
  race?: string | null
  dietaryPreference?: DietaryPreference | null
  heightCm?: number | null
  weightKg?: number | null
  activityLevel?: ActivityLevel | null
  dailyCalorieGoal?: number | null
}

export type CalorieSummary = {
  goal: number
  consumed: number
  remaining: number
  status: "within" | "reached"
}

export type SuitabilityResult = {
  verdict: "good" | "not_recommended" | "unknown"
  reasons: string[]
}

export type ScanHistory = {
  id: string
  userId: string
  createdAt: string
  productName?: string | null
  extractedText?: OCRExtraction | null
  parsedIngredients?: string[] | null
  parsedNutrition?: NutritionParsed | null
  analysisSnapshot?: AnalyzeFromImagesResponse | null
}

export * from "./api"
export * from "./glossary"
export * from "./scoring"
export * from "./flags"
export * from "./analyze"
export * from "./parser"
export * from "./halal"
export * from "./tracking"
