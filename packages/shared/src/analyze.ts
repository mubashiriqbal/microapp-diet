import type {
  OCRExtraction,
  ParsedData,
  NutritionParsed,
  SuitabilityResult,
  UserPrefs
} from "./index"
import { findGlossaryMatch } from "./glossary"
import { evaluateFlags } from "./flags"
import { scoreFromParsed } from "./scoring"
import { classifyHalal } from "./halal"
import { calculateCaloriesPer50g } from "./parser"

export type IngredientBreakdown = {
  name: string
  status: "good" | "neutral" | "caution"
  plainEnglish: string
  whyUsed: string
  whoMightCare: string
  uncertaintyNote?: string
}

export type AnalyzeFromImagesResponse = {
  productName: string | null
  imageUrl?: string | null
  caloriesPer50g: number | null
  nutritionHighlights: NutritionParsed | null
  score: ReturnType<typeof scoreFromParsed>
  halal: ReturnType<typeof classifyHalal>
  personalizedFlags: ReturnType<typeof evaluateFlags>
  ingredientBreakdown: IngredientBreakdown[]
  suitability: SuitabilityResult
  parsing: {
    extractedText: OCRExtraction
    confidences: ParsedData["confidences"]
  }
  disclaimer: string
}

const cautionTags = ["added_sugar", "high_sodium", "dye", "ultra_processed", "trans_fat"]

const ingredientStatus = (tags: string[]): "good" | "neutral" | "caution" => {
  if (tags.some((tag) => cautionTags.includes(tag))) return "caution"
  return "neutral"
}

export function analyzeFromParsed(
  parsed: ParsedData,
  prefs?: UserPrefs,
  extractedText?: OCRExtraction
): AnalyzeFromImagesResponse {
  const breakdown: IngredientBreakdown[] = parsed.ingredients.map((ingredient) => {
    const match = findGlossaryMatch(ingredient)
    if (!match) {
      return {
        name: ingredient,
        status: "neutral",
        plainEnglish: "Common ingredient with limited detail.",
        whyUsed: "Provides flavor, texture, or structure.",
        whoMightCare: "People tracking ingredients for personal preferences.",
        uncertaintyNote: "No exact match in the ingredient knowledge base."
      }
    }

    return {
      name: ingredient,
      status: ingredientStatus(match.tags),
      plainEnglish: match.plainEnglish,
      whyUsed: match.purpose,
      whoMightCare: match.whoMightCare,
      ...(match.tags.includes("uncertain_source")
        ? { uncertaintyNote: "Sourcing can vary by manufacturer." }
        : {})
    }
  })

  const caloriesPer50g = calculateCaloriesPer50g(parsed.nutrition)
  const halal = classifyHalal(parsed.ingredients, extractedText?.frontText)

  return {
    productName: parsed.productName,
    caloriesPer50g,
    nutritionHighlights: parsed.nutrition,
    score: scoreFromParsed(parsed.ingredients, parsed.nutrition),
    halal,
    personalizedFlags: evaluateFlags(parsed.ingredients, parsed.nutrition, prefs, halal),
    ingredientBreakdown: breakdown,
    suitability: {
      verdict: "unknown",
      reasons: []
    },
    parsing: {
      extractedText: extractedText || {
        ingredientsText: "",
        nutritionText: "",
        frontText: ""
      },
      confidences: parsed.confidences
    },
    disclaimer: "Educational, not medical advice."
  }
}
