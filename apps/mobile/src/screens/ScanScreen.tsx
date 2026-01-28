import { useCallback, useEffect, useRef, useState } from "react"
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from "react-native"
import { Camera, CameraType } from "expo-camera"
import { Ionicons } from "@expo/vector-icons"
import { runAnalyze, saveHistory } from "../api/client"
import GradientButton from "../components/GradientButton"
import { useFocusEffect, useIsFocused, useNavigation } from "@react-navigation/native"
import { theme } from "../theme"
import { getProfile, getScanHistoryCache, setLastAnalysis, setScanHistoryCache, setScanImageForId } from "../storage/cache"
import type { ScanHistory } from "@wimf/shared"

type ImageState = {
  label?: { uri: string; name: string; type: string }
}

export default function ScanScreen() {
  const [status, setStatus] = useState("Capture one clear food or label photo.")
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [image, setImage] = useState<ImageState>({})
  const cameraRef = useRef<Camera | null>(null)
  const isFocused = useIsFocused()
  const [cameraKey, setCameraKey] = useState(0)
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
    }, [])
  )

  const capturePhoto = async () => {
    if (!cameraRef.current) return
    setStatus("Capturing photo...")

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        skipProcessing: true
      })
      const file = {
        uri: photo.uri,
        name: "label.jpg",
        type: "image/jpeg"
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
      if (profile?.id) {
        const localId = `local-${Date.now()}`
        const localEntry: ScanHistory = {
          id: localId,
          userId: profile.id,
          createdAt: new Date().toISOString(),
          productName: analysis.productName ?? null,
          extractedText: analysis.parsing.extractedText,
          parsedIngredients: analysis.ingredientBreakdown.map((item) => item.name),
          parsedNutrition: analysis.nutritionHighlights,
          analysisSnapshot: analysis
        }
        const cached = await getScanHistoryCache()
        const optimistic = [localEntry, ...cached.filter((entry) => entry.id !== localId)]
        await setScanHistoryCache(optimistic)
        if (image.label?.uri) {
          await setScanImageForId(localId, image.label.uri)
        }

        const saved = await saveHistory({
          userId: profile.id,
          extractedText: analysis.parsing.extractedText,
          parsedIngredients: analysis.ingredientBreakdown.map((item) => item.name),
          parsedNutrition: analysis.nutritionHighlights,
          analysisSnapshot: analysis
        })
        if (saved?.id) {
          if (image.label?.uri) {
            await setScanImageForId(saved.id, image.label.uri)
          }
          const refreshed = await getScanHistoryCache()
          const next = [saved, ...refreshed.filter((entry) => entry.id !== localId && entry.id !== saved.id)]
          await setScanHistoryCache(next)
        }
      }

      navigation.navigate("Results" as never, {
        analysis,
        imageUri: image.label?.uri
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
          <Image source={{ uri: image.label.uri }} style={styles.previewImage} />
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
            <Ionicons name="radio-button-on" size={28} color={theme.colors.accent2} />
          </Pressable>
        )}
        <GradientButton
          onPress={handleAnalyze}
          disabled={!image.label}
          style={styles.primaryAction}
        >
          <Ionicons name="search" size={18} color="#ffffff" />
          <Text style={styles.primaryActionText}>Analyze</Text>
        </GradientButton>
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
    alignItems: "center",
    gap: 12,
    marginBottom: theme.spacing.md
  },
  captureButton: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: theme.colors.panel,
    borderWidth: 2,
    borderColor: theme.colors.accent2,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryAction: {
    flex: 1,
    minHeight: 56,
    paddingVertical: 16
  },
  primaryActionText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16
  },
  secondaryAction: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: theme.colors.panel,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  secondaryActionText: {
    color: theme.colors.text,
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
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm
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
