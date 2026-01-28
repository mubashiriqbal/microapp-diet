import { useEffect, useMemo, useState } from "react"
import { View, Text, StyleSheet, ScrollView, Image } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { AnalyzeFromImagesResponse, UserPrefs } from "@wimf/shared"
import { theme } from "../theme"
import { getHealthPrefs, getProfilePrefs, getUserPrefs } from "../storage/cache"
import ScoreRing from "../components/ScoreRing"

type ResultsParams = {
  analysis: AnalyzeFromImagesResponse
  imageUri?: string | null
  fromHistory?: boolean
}

type Props = {
  route: { params: ResultsParams }
}

const spacing = theme.spacing

const formatTag = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())

const Card = ({ children, style }: { children: React.ReactNode; style?: object }) => (
  <View style={[styles.card, style]}>{children}</View>
)

const SectionHeader = ({ title }: { title: string }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
)

export default function ResultsScreen({ route }: Props) {
  const { analysis } = route.params
  const imageUri = route.params.imageUri
  const insets = useSafeAreaInsets()
  const [prefs, setPrefs] = useState<UserPrefs | null>(null)
  const [healthPrefs, setHealthPrefs] = useState({ restrictions: [], allergens: [] as string[] })
  const [profilePrefs, setProfilePrefs] = useState({
    dietary: {} as Record<string, boolean>,
    allergies: {} as Record<string, boolean>,
    allergyOther: "",
    sensitivities: {} as Record<string, boolean>
  })

  const caloriesPer100g = useMemo(() => {
    const nutrition = analysis.nutritionHighlights
    if (analysis.caloriesPer50g !== null && analysis.caloriesPer50g !== undefined) {
      return Number((analysis.caloriesPer50g * 2).toFixed(1))
    }
    if (!nutrition) return null
    if (nutrition.caloriesPer100g !== null && nutrition.caloriesPer100g !== undefined) {
      return Number(nutrition.caloriesPer100g.toFixed(1))
    }
    if (
      nutrition.calories !== null &&
      nutrition.calories !== undefined &&
      nutrition.servingSizeG !== null &&
      nutrition.servingSizeG !== undefined &&
      nutrition.servingSizeG > 0
    ) {
      return Number(((nutrition.calories * 100) / nutrition.servingSizeG).toFixed(1))
    }
    return null
  }, [analysis.nutritionHighlights])

  const labelConfidence = useMemo(() => {
    const values = Object.values(analysis.parsing.confidences)
    if (!values.length) return "0.00"
    const average = values.reduce((sum, value) => sum + value, 0) / values.length
    return average.toFixed(2)
  }, [analysis.parsing.confidences])

  const showHalal =
    !!prefs?.halalCheckEnabled || healthPrefs.restrictions.includes("halal")

  const selectedAllergens = useMemo(
    () => Object.keys(profilePrefs.allergies || {}).filter((key) => profilePrefs.allergies[key]),
    [profilePrefs.allergies]
  )

  const detectedAllergens = useMemo(() => {
    const ingredientNames = analysis.ingredientBreakdown.map((item) => item.name.toLowerCase())
    const matchers: Record<string, string[]> = {
      peanuts: ["peanut"],
      tree_nuts: ["almond", "walnut", "pecan", "cashew", "nut"],
      dairy: ["milk", "cheese", "butter", "cream", "whey", "yogurt"],
      eggs: ["egg"],
      shellfish: ["shrimp", "crab", "lobster", "shellfish"],
      fish: ["fish", "salmon", "tuna", "cod"],
      soy: ["soy", "soya"],
      wheat_gluten: ["wheat", "gluten", "barley", "rye"],
      sesame: ["sesame"],
      sulfites: ["sulfite", "sulphite"]
    }

    const detected = selectedAllergens.filter((allergen) =>
      ingredientNames.some((name) =>
        (matchers[allergen] || [allergen]).some((term) => name.includes(term))
      )
    )

    if (profilePrefs.allergyOther) {
      const other = profilePrefs.allergyOther.toLowerCase()
      if (ingredientNames.some((name) => name.includes(other))) {
        detected.push(profilePrefs.allergyOther)
      }
    }

    return detected
  }, [analysis.ingredientBreakdown, profilePrefs.allergyOther, selectedAllergens])

  const sensitivityAlerts = useMemo(() => {
    const selected = Object.entries(profilePrefs.sensitivities || {}).filter(([, value]) => value)
    if (!selected.length) return []

    const text = `${analysis.productName ?? ""} ${analysis.ingredientBreakdown
      .map((item) => item.name)
      .join(" ")}`.toLowerCase()
    const nutrition = analysis.nutritionHighlights
    const sodiumHigh = nutrition?.sodium_mg !== null && nutrition?.sodium_mg !== undefined
      ? nutrition.sodium_mg > 600
      : false
    const sugarHigh = nutrition?.sugar_g !== null && nutrition?.sugar_g !== undefined
      ? nutrition.sugar_g > 12
      : false
    const caloriesHigh = caloriesPer100g !== null ? caloriesPer100g > 260 : false
    const fried = /fried|fries|deep[-\\s]?fried|oil|greasy/.test(text)

    const checks: Record<string, { label: string; hit: boolean; message: string }> = {
      hypertension: {
        label: "Hypertension-friendly",
        hit: sodiumHigh || text.includes("salt") || text.includes("sodium"),
        message: sodiumHigh
          ? "High sodium detected."
          : "No clear sodium triggers detected."
      },
      diabetic: {
        label: "Diabetic-friendly",
        hit: sugarHigh || text.includes("sugar") || text.includes("sweet"),
        message: sugarHigh ? "Added sugar detected." : "No clear sugar triggers detected."
      },
      heartHealthy: {
        label: "Heart-healthy",
        hit: fried,
        message: fried ? "Fried/processed keywords detected." : "No clear fried/processed triggers detected."
      },
      weightLoss: {
        label: "Weight-loss focused",
        hit: fried || caloriesHigh,
        message: caloriesHigh
          ? "Higher calorie density detected."
          : fried
            ? "Fried/processed keywords detected."
            : "No clear calorie density triggers detected."
      }
    }

    return selected.map(([key]) => ({
      key,
      label: checks[key]?.label || formatTag(key),
      hit: checks[key]?.hit || false,
      message: checks[key]?.message || "No clear triggers detected."
    }))
  }, [analysis.ingredientBreakdown, analysis.nutritionHighlights, analysis.productName, caloriesPer100g, profilePrefs.sensitivities])

  useEffect(() => {
    const loadPrefs = async () => {
      const cached = await getUserPrefs()
      if (cached) setPrefs(cached)
      const storedHealth = await getHealthPrefs()
      setHealthPrefs(storedHealth)
      const storedProfile = await getProfilePrefs()
      setProfilePrefs({
        dietary: storedProfile.dietary || {},
        allergies: storedProfile.allergies || {},
        allergyOther: storedProfile.allergyOther || "",
        sensitivities: storedProfile.sensitivities || {}
      })
    }

    loadPrefs()
  }, [])

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          paddingBottom: insets.bottom + 88
        }
      ]}
    >
      <View style={styles.headerBlock}>
        <Text style={styles.title}>{analysis.productName || "Unknown product"}</Text>
        <Text style={styles.subtitle}>Label read confidence: {labelConfidence}</Text>
      </View>

      {imageUri ? (
        <Card style={styles.previewCard}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
        </Card>
      ) : null}

      <Card>
        <SectionHeader title="Dietary preferences & alerts" />
        <View style={styles.chipWrap}>
          {Object.entries(profilePrefs.dietary || {})
            .filter(([, value]) => value)
            .map(([key]) => (
              <View key={key} style={styles.chip}>
                <Text style={styles.chipText}>{formatTag(key)}</Text>
              </View>
            ))}
          {showHalal ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>Halal</Text>
            </View>
          ) : null}
        </View>
      </Card>

      <Card>
        <SectionHeader title="Allergens detected" />
        {detectedAllergens.length ? (
          <View style={styles.chipWrap}>
            {detectedAllergens.map((item) => (
              <View key={item} style={[styles.chip, styles.chipDanger]}>
                <Text style={styles.chipText}>{formatTag(item)}</Text>
              </View>
            ))}
          </View>
      ) : (
        <Text style={styles.bodyMuted}>None detected based on ingredients.</Text>
      )}
      </Card>

      <Card>
        <View style={styles.scoreRow}>
          <View style={styles.scoreMeta}>
            <Text style={styles.sectionLabel}>Health score</Text>
            <Text style={styles.scoreValue}>{analysis.score.value} / 100</Text>
            <Text style={styles.bodyMuted}>{analysis.score.category}</Text>
          </View>
          <ScoreRing value={analysis.score.value} size={120} />
        </View>
      </Card>

      {showHalal ? (
        <Card>
          <SectionHeader title="Halal status" />
          <Text style={styles.bodyText}>{analysis.halal.status.toUpperCase()}</Text>
          <Text style={styles.bodyMuted}>Confidence {analysis.halal.confidence.toFixed(2)}</Text>
          <Text style={styles.bodyText}>{analysis.halal.explanation}</Text>
        </Card>
      ) : null}

      {sensitivityAlerts.length ? (
        <Card>
          <SectionHeader title="Health sensitivities" />
          {sensitivityAlerts.map((item) => (
            <View key={item.key} style={styles.sensitivityRow}>
              <Ionicons
                name={item.hit ? "alert-circle" : "checkmark-circle"}
                size={16}
                color={item.hit ? theme.colors.warning : theme.colors.accent}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.sensitivityLabel}>{item.label}</Text>
                <Text style={styles.bodyMuted}>{item.message}</Text>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      <Card>
        <SectionHeader title="Ingredients" />
        {analysis.ingredientBreakdown.slice(0, 6).map((ingredient, index) => (
          <View key={`${ingredient.name}-${index}`} style={styles.ingredientRow}>
            <Ionicons name="leaf-outline" size={16} color={theme.colors.accent2} />
            <Text style={styles.ingredientName}>{ingredient.name}</Text>
          </View>
        ))}
      </Card>

      <Card>
        <SectionHeader title="Approx calories per 100g" />
        <Text style={styles.metricValue}>
          {caloriesPer100g === null ? "Unknown" : caloriesPer100g}
        </Text>
        <Text style={styles.metricHelper}>
          {caloriesPer100g === null ? "Estimate unavailable" : "Approximate estimate"}
        </Text>
      </Card>

      <Text style={styles.disclaimer}>{analysis.disclaimer}</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    backgroundColor: theme.colors.bg
  },
  headerBlock: {
    marginBottom: spacing.lg
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: theme.colors.text,
    fontFamily: theme.font.heading,
    lineHeight: 32
  },
  subtitle: {
    color: theme.colors.muted,
    marginTop: spacing.sm,
    fontSize: 14
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: spacing.sm,
    fontFamily: theme.font.heading
  },
  card: {
    backgroundColor: theme.colors.glass,
    borderRadius: theme.radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: spacing.md
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  scoreMeta: {
    flex: 1
  },
  sectionLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 4
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
    fontFamily: theme.font.heading
  },
  metricHelper: {
    fontSize: 13,
    color: theme.colors.textSoft
  },
  previewCard: {
    padding: 0,
    overflow: "hidden"
  },
  previewImage: {
    width: "100%",
    height: 180
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.panelAlt
  },
  chipDanger: {
    borderColor: "rgba(230,57,70,0.4)",
    backgroundColor: "rgba(230,57,70,0.12)"
  },
  chipText: {
    color: theme.colors.text,
    fontSize: 12
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6
  },
  ingredientName: {
    color: theme.colors.text,
    fontWeight: "600",
    fontSize: 14
  },
  bodyText: {
    color: theme.colors.textSoft,
    fontSize: 13,
    lineHeight: 18
  },
  sensitivityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 10
  },
  sensitivityLabel: {
    fontWeight: "600",
    color: theme.colors.text,
    fontSize: 13
  },
  bodyMuted: {
    color: theme.colors.muted,
    fontSize: 12
  },
  disclaimer: {
    color: theme.colors.muted,
    textAlign: "center",
    marginTop: spacing.lg
  }
})
