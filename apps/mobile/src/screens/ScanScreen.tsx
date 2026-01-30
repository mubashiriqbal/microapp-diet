import { useCallback, useEffect, useRef, useState } from "react"
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from "react-native"
import { Camera, CameraType } from "expo-camera"
import { Ionicons, MaterialIcons } from "@expo/vector-icons"
import { runAnalyze, saveHistory } from "../api/client"
import GradientButton from "../components/GradientButton"
import { useFocusEffect, useIsFocused, useNavigation } from "@react-navigation/native"
import { theme } from "../theme"
import {
  getLastAnalysis,
  getProfile,
  getScanHistoryCache,
  setLastAnalysis,
  setScanHistoryCache,
  setScanImageForId,
  setScanImageForKey
} from "../storage/cache"
import type { AnalyzeFromImagesResponse, ScanHistory } from "@wimf/shared"

type ImageState = {
  label?: { uri: string; name: string; type: string; previewUri?: string }
}

export default function ScanScreen() {
  const [status, setStatus] = useState("Capture one clear food or label photo.")
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [image, setImage] = useState<ImageState>({})
  const cameraRef = useRef<Camera | null>(null)
  const isFocused = useIsFocused()
  const [cameraKey, setCameraKey] = useState(0)
  const [lastAnalysis, setLastAnalysisState] = useState<AnalyzeFromImagesResponse | null>(null)
  const navigation = useNavigation()

  useEffect(() => {
    const request = async () => {
      const { status: permissionStatus } = await Camera.requestCameraPermissionsAsync()
      setHasPermission(permissionStatus === "granted")
    }

    request()
  }, [])

  useFocusEffect(
    useCallback(() => {
      setStatus("Capture one clear food or label photo.")
      setImage({})
      setCameraKey((prev) => prev + 1)
      getLastAnalysis().then((stored) => {
        if (stored) setLastAnalysisState(stored as AnalyzeFromImagesResponse)
      })
    }, [])
  )

  const capturePhoto = async () => {
    if (!cameraRef.current) return
    setStatus("Capturing photo...")

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.4,
        skipProcessing: true
      })
      const file = {
        uri: photo.uri,
        name: "label.jpg",
        type: "image/jpeg",
        previewUri: photo.uri
      }

      setImage({ label: file })
      setStatus("Ready to analyze.")
    } catch {
      setStatus("Unable to capture photo.")
    }
  }

  const handleAnalyze = async () => {
    if (!image.label) {
      setStatus("Please capture a clear food or label photo.")
      return
    }

    setStatus("Analyzing image...")
    const formData = new FormData()
      formData.append("frontImage", image.label as unknown as Blob)
    const profile = await getProfile()
    if (profile?.id) {
      formData.append("userId", profile.id)
    }

    try {
      const analysis = await runAnalyze(formData)

      const isLikelyFood =
        !!analysis.productName ||
        (analysis.ingredientBreakdown?.length || 0) > 0 ||
        !!analysis.nutritionHighlights

      if (!isLikelyFood) {
        setStatus("Sorry, this doesn't look like a food item. Please rescan.")
        return
      }
      await setLastAnalysis(analysis)
      setLastAnalysisState(analysis)
      if (profile?.id) {
        const localId = `local-${Date.now()}`
        const localEntry: ScanHistory = {
          id: localId,
          userId: profile.id,
          createdAt: new Date().toISOString(),
          productName: analysis.productName ?? null,
          imageUrl: analysis.imageUrl || null,
          extractedText: analysis.parsing.extractedText,
          parsedIngredients: analysis.ingredientBreakdown.map((item) => item.name),
          parsedNutrition: analysis.nutritionHighlights,
          analysisSnapshot: analysis
        }
        const cached = await getScanHistoryCache()
        const optimistic = [localEntry, ...cached.filter((entry) => entry.id !== localId)]
        await setScanHistoryCache(optimistic)
        if (image.label?.previewUri && !image.label.previewUri.startsWith("data:")) {
          await setScanImageForId(localId, image.label.previewUri)
          const key = `${localEntry.createdAt}|${localEntry.productName || ""}`
          await setScanImageForKey(key, image.label.previewUri)
        }

        const saved = await saveHistory({
          userId: profile.id,
          imageUrl: analysis.imageUrl || null,
          extractedText: analysis.parsing.extractedText,
          parsedIngredients: analysis.ingredientBreakdown.map((item) => item.name),
          parsedNutrition: analysis.nutritionHighlights,
          analysisSnapshot: analysis
        })
        if (saved?.id) {
          if (image.label?.previewUri && !image.label.previewUri.startsWith("data:")) {
            await setScanImageForId(saved.id, image.label.previewUri)
            const key = `${saved.createdAt}|${saved.productName || saved.analysisSnapshot?.productName || ""}`
            await setScanImageForKey(key, image.label.previewUri)
          }
          const refreshed = await getScanHistoryCache()
          const next = [saved, ...refreshed.filter((entry) => entry.id !== localId && entry.id !== saved.id)]
          await setScanHistoryCache(next)
        }
      }

      navigation.navigate("Results" as never, {
        analysis,
        imageUri: image.label?.previewUri || image.label?.uri
      } as never)
      setImage({})
      setStatus("Capture one clear food or label photo.")
    } catch (error) {
      setStatus((error as Error).message || "Unable to analyze image.")
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.subtitle}>{status}</Text>
        </View>
        <View style={styles.progressPill}>
          <Text style={styles.progressLabel}>Captured</Text>
          <Text style={styles.progressValue}>{image.label ? "100%" : "0%"}</Text>
        </View>
      </View>

      {hasPermission === false ? (
        <Text style={styles.subtitle}>Camera permission is required.</Text>
      ) : isFocused && !image.label ? (
        <View style={styles.cameraWrap}>
          <Camera
            key={cameraKey}
            style={styles.camera}
            type={CameraType.back}
            ref={cameraRef}
          />
          <View style={styles.cameraOverlay}>
            <View style={styles.frameBox} />
            <View style={styles.overlayHint}>
              <Text style={styles.overlayText}>Fill the frame. Avoid glare.</Text>
            </View>
          </View>
        </View>
      ) : null}

      {image.label?.uri ? (
        <View style={styles.previewCard}>
          <Text style={styles.sectionTitle}>Preview</Text>
          <View style={styles.previewWrap}>
            <Image source={{ uri: image.label.previewUri || image.label.uri }} style={styles.previewImage} />
            {lastAnalysis?.nutritionHighlights ? (
              <View style={styles.nutritionOverlay}>
                {[
                  { label: "Calories", value: lastAnalysis.nutritionHighlights.calories },
                  { label: "Fat (g)", value: (lastAnalysis.nutritionHighlights as any).fat_g },
                  { label: "Carbs (g)", value: lastAnalysis.nutritionHighlights.carbs_g },
                  { label: "Protein (g)", value: lastAnalysis.nutritionHighlights.protein_g }
                ].map((item) => (
                  <View key={item.label} style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>
                      {item.value !== null && item.value !== undefined ? item.value : "—"}
                    </Text>
                    <Text style={styles.nutritionLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
          <Text style={styles.captureLine}>Captured and ready for analysis.</Text>
        </View>
      ) : null}

      <View style={styles.actionRow}>
        {image.label ? (
          <Pressable
            style={styles.secondaryAction}
            onPress={() => {
              setImage({})
              setStatus("Capture one clear food or label photo.")
              cameraRef.current = null
              setCameraKey((prev) => prev + 1)
            }}
          >
            <Ionicons name="refresh" size={16} color={theme.colors.text} />
            <Text style={styles.secondaryActionText}>Retake</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.captureButton} onPress={capturePhoto}>
            <Ionicons name="qr-code-outline" size={22} color={theme.colors.accent} />
            <Text style={styles.captureLabel}>Scan</Text>
          </Pressable>
        )}
        <Pressable
          onPress={handleAnalyze}
          disabled={!image.label}
          style={[styles.primaryAction, !image.label ? styles.primaryActionDisabled : null]}
        >
          <Ionicons name="search" size={20} color={theme.colors.accent2} />
          <Text style={styles.primaryActionText}>Analyze</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Captured</Text>
        <Text style={styles.captureLine}>
          Food or label photo: {image.label ? "Ready" : "Required"}
        </Text>
      </View>

      <Text style={styles.disclaimer}>Educational, not medical advice.</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl + 80,
    backgroundColor: theme.colors.bg
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md
  },
  subtitle: {
    color: theme.colors.muted
  },
  progressPill: {
    backgroundColor: theme.colors.panel,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  progressLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.4
  },
  progressValue: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2
  },
  cameraWrap: {
    borderRadius: theme.radius.xl,
    overflow: "hidden",
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  camera: {
    width: "100%",
    height: 320
  },
  cameraOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)"
  },
  frameBox: {
    width: "80%",
    height: "70%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: theme.radius.lg
  },
  overlayHint: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.35)"
  },
  overlayText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700"
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
    marginBottom: theme.spacing.md
  },
  captureButton: {
    flex: 1,
    minHeight: 64,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: theme.colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6
  },
  captureLabel: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700"
  },
  primaryAction: {
    flex: 1,
    minHeight: 64,
    paddingVertical: 18,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: theme.colors.accent2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6
  },
  primaryActionDisabled: {
    opacity: 0.6
  },
  primaryActionText: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: 16
  },
  secondaryAction: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "rgba(230,57,70,0.12)",
    borderWidth: 1,
    borderColor: "rgba(230,57,70,0.4)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  secondaryActionText: {
    color: theme.colors.warning,
    fontWeight: "700"
  },
  section: {
    backgroundColor: theme.colors.panel,
    padding: 14,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  previewCard: {
    backgroundColor: theme.colors.panel,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  previewWrap: {
    position: "relative"
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm
  },
  nutritionOverlay: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "rgba(17,24,39,0.7)",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  nutritionItem: {
    alignItems: "center",
    flex: 1
  },
  nutritionValue: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14
  },
  nutritionLabel: {
    color: "#E2E8F0",
    fontSize: 11,
    marginTop: 2
  },
  sectionTitle: {
    fontWeight: "700",
    marginBottom: 8,
    color: theme.colors.text
  },
  captureLine: {
    color: theme.colors.muted
  },
  disclaimer: {
    marginTop: 16,
    color: theme.colors.muted,
    textAlign: "center"
  }
})
