import { useEffect, useMemo, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { AnalyzeFromImagesResponse, UserPrefs } from "@wimf/shared"
import { theme } from "../theme"
import { getHealthPrefs, getProfilePrefs, getUserPrefs } from "../storage/cache"

type ResultsParams = {
  analysis: AnalyzeFromImagesResponse
  imageUri?: string | null
  fromHistory?: boolean
}

type Props = {
  route: { params: ResultsParams }
}

const categoryColors: Record<string, string> = {
  Good: theme.colors.success,
  Moderate: theme.colors.warning,
  Lower: theme.colors.danger
}

const spacing = theme.spacing

const formatTag = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())

const Card = ({ children, style }: { children: React.ReactNode; style?: object }) => (
  <View style={[styles.card, style]}>{children}</View>
)

const SectionHeader = ({ title, icon }: { title: string; icon?: keyof typeof Ionicons.glyphMap }) => (
  <View style={styles.sectionHeaderRow}>
    <Text style={styles.sectionHeader}>{title}</Text>
    {icon ? <Ionicons name={icon} size={16} color={theme.colors.muted} /> : null}
  </View>
)

const MetricCard = ({
  label,
  value,
  helper,
  accent,
  icon
}: {
  label: string
  value: string | number
  helper: string
  accent?: string
  icon?: keyof typeof Ionicons.glyphMap
}) => (
  <Card style={styles.metricCard}>
    <View style={styles.metricHeader}>
      <Text style={styles.metricLabel}>{label}</Text>
      {icon ? <Ionicons name={icon} size={18} color={accent || theme.colors.muted} /> : null}
    </View>
    <Text style={[styles.metricValue, accent ? { color: accent } : null]}>{value}</Text>
    <Text style={styles.metricHelper}>{helper}</Text>
  </Card>
)

const IngredientItem = ({
  status,
  name,
  description,
  whyUsed,
  whoMightCare,
  uncertaintyNote
}: {
  status: string
  name: string
  description: string
  whyUsed: string
  whoMightCare: string
  uncertaintyNote?: string
}) => (
  <Card style={styles.ingredientCard}>
    <View style={styles.ingredientHeader}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{status}</Text>
      </View>
      <Text style={styles.ingredientName}>{name}</Text>
    </View>
    <Text style={styles.bodyText}>{description}</Text>
    <Text style={styles.bodyText}>Why used: {whyUsed}</Text>
    <Text style={styles.bodyText}>Who might care: {whoMightCare}</Text>
    {uncertaintyNote ? <Text style={styles.bodyMuted}>Uncertainty: {uncertaintyNote}</Text> : null}
  </Card>
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
    allergyOther: ""
  })
  const scoreColor = useMemo(
    () => categoryColors[analysis.score.category] || theme.colors.text,
    [analysis.score.category]
  )

  const caloriesPer100g = useMemo(() => {
    const nutrition = analysis.nutritionHighlights
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
        allergyOther: storedProfile.allergyOther || ""
      })
    }

    loadPrefs()
  }, [])

  const suitabilityLabel =
    analysis.suitability?.verdict === "good"
      ? "Suitable"
      : analysis.suitability?.verdict === "not_recommended"
        ? "Not recommended"
        : "Unknown"

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
          <SectionHeader title="Captured image" icon="image-outline" />
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
        </Card>
      ) : null}

      <Card style={styles.scoreCard}>
        <View style={styles.scoreRow}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>{analysis.score.value}</Text>
            <Text style={styles.scoreLabel}>Health score</Text>
          </View>
          <View style={styles.scoreMeta}>
            <Text style={styles.scoreTitle}>{analysis.score.category}</Text>
            <Text style={styles.bodyMuted}>AI model v1</Text>
          </View>
        </View>
        <View style={styles.flagsWrap}>
          {Object.entries(profilePrefs.dietary || {})
            .filter(([, value]) => value)
            .map(([key]) => (
              <View key={key} style={styles.flagChip}>
                <Text style={styles.flagText}>{formatTag(key)}</Text>
              </View>
            ))}
        </View>
      </Card>

      <Card>
        <SectionHeader title="Allergens detected" icon="alert-circle-outline" />
        {detectedAllergens.length ? (
          <View style={styles.flagsWrap}>
            {detectedAllergens.map((item) => (
              <View key={item} style={[styles.flagChip, styles.flagChipDanger]}>
                <Text style={styles.flagText}>{formatTag(item)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.bodyMuted}>None detected based on ingredients.</Text>
        )}
      </Card>

      <Card>
        <SectionHeader title="Approx calories per 100g" icon="flame-outline" />
        <Text style={styles.metricValue}>
          {caloriesPer100g === null ? "Unknown" : caloriesPer100g}
        </Text>
        <Text style={styles.metricHelper}>
          {caloriesPer100g === null ? "Estimate unavailable" : "Approximate estimate"}
        </Text>
      </Card>

      {showHalal ? (
        <>
          <SectionHeader title="Halal status" icon="information-circle-outline" />
          <Card>
            <Text style={styles.halalStatus}>{analysis.halal.status.toUpperCase()}</Text>
            <Text style={styles.bodyMuted}>Confidence {analysis.halal.confidence.toFixed(2)}</Text>
            <Text style={styles.bodyText}>{analysis.halal.explanation}</Text>
          </Card>
        </>
      ) : null}

      <SectionHeader title="Ingredients explained" icon="leaf-outline" />
      {analysis.ingredientBreakdown.map((ingredient, index) => (
        <IngredientItem
          key={`${ingredient.name}-${index}`}
          status={
            ingredient.status === "good"
              ? "OK"
              : ingredient.status === "caution"
                ? "WARN"
                : "NEUTRAL"
          }
          name={ingredient.name}
          description={ingredient.plainEnglish}
          whyUsed={ingredient.whyUsed}
          whoMightCare={ingredient.whoMightCare}
          uncertaintyNote={ingredient.uncertaintyNote}
        />
      ))}

      <Card>
        <SectionHeader title="What we detected" icon="document-text-outline" />
        <Text style={styles.bodyMuted}>
          Ingredients: {analysis.parsing.extractedText.ingredientsText || "Not detected"}
        </Text>
        <Text style={styles.bodyMuted}>
          Nutrition: {analysis.parsing.extractedText.nutritionText || "Not detected"}
        </Text>
        <Text style={styles.bodyMuted}>
          Front: {analysis.parsing.extractedText.frontText || "Not provided"}
        </Text>

        <View style={styles.divider} />

        <SectionHeader title="Approximate calories" icon="fitness-outline" />
        <View style={styles.nutritionRow}>
          <View style={styles.nutritionChip}>
            <Text style={styles.nutritionText}>
              Calories {analysis.nutritionHighlights?.calories ?? "Unknown"}
            </Text>
          </View>
        </View>
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
    fontSize: 30,
    fontWeight: "700",
    color: theme.colors.text,
    fontFamily: theme.font.heading,
    lineHeight: 36
  },
  subtitle: {
    color: theme.colors.muted,
    marginTop: spacing.sm,
    fontSize: 14
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    marginBottom: spacing.sm
  },
  sectionHeader: {
    fontSize: 17,
    fontWeight: "600",
    color: theme.colors.text,
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
  metricsGrid: {
    gap: spacing.md
  },
  scoreCard: {
    padding: spacing.md
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md
  },
  scoreCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: theme.colors.panelAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  scoreValue: {
    fontSize: 26,
    fontWeight: "700",
    color: theme.colors.text
  },
  scoreLabel: {
    fontSize: 11,
    color: theme.colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1
  },
  scoreMeta: {
    flex: 1
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text
  },
  metricCard: {
    gap: spacing.sm
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  metricLabel: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: theme.colors.muted
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
    padding: spacing.md
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: theme.radius.md,
    marginTop: spacing.sm
  },
  flagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  flagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.glass
  },
  flagChipDanger: {
    borderColor: "rgba(230,57,70,0.4)",
    backgroundColor: "rgba(230,57,70,0.12)"
  },
  flagText: {
    color: theme.colors.text,
    fontSize: 12
  },
  halalStatus: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: spacing.sm
  },
  ingredientCard: {
    padding: spacing.md
  },
  ingredientHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm
  },
  badge: {
    backgroundColor: theme.colors.panelAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  badgeText: {
    color: theme.colors.textSoft,
    fontSize: 11
  },
  ingredientName: {
    color: theme.colors.text,
    fontWeight: "600",
    fontSize: 15
  },
  bodyText: {
    color: theme.colors.textSoft,
    fontSize: 13,
    lineHeight: 18
  },
  bodyMuted: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: spacing.sm
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: spacing.md
  },
  nutritionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  nutritionChip: {
    backgroundColor: theme.colors.panelAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999
  },
  nutritionText: {
    color: theme.colors.textSoft,
    fontSize: 12
  },
  disclaimer: {
    color: theme.colors.muted,
    textAlign: "center",
    marginTop: spacing.lg
  }
})
