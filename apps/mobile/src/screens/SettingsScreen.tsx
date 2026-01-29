import { useContext, useEffect, useState } from "react"
import { View, Text, TextInput, StyleSheet, Pressable, Switch, ScrollView, Image } from "react-native"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { Picker } from "@react-native-picker/picker"
import Slider from "@react-native-community/slider"
import * as ImagePicker from "expo-image-picker"
import { fetchPrefs, fetchProfile, saveProfile, updatePrefs } from "../api/client"
import GradientButton from "../components/GradientButton"
import {
  clearAuth,
  getHealthPrefs,
  getProfile,
  getProfilePrefs,
  getUserPrefs,
  setHealthPrefs,
  setProfile,
  setProfilePrefs,
  setUserPrefs
} from "../storage/cache"
import type { UserPrefs, UserProfile } from "@wimf/shared"
import { theme } from "../theme"
import { AuthContext } from "../auth"

const emptyPrefs: UserPrefs = {
  userId: "unknown",
  halalCheckEnabled: false,
  lowSodiumMgLimit: null,
  lowSugarGlimit: null,
  lowCarbGlimit: null,
  lowCalorieLimit: null,
  highProteinGtarget: null,
  vegetarian: false,
  vegan: false,
  sensitiveStomach: false
}

const countryOptions = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo (Congo-Brazzaville)",
  "Costa Rica",
  "Cote d'Ivoire",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czechia",
  "Democratic Republic of the Congo",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Korea",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Palestine",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Timor-Leste",
  "Togo",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Vatican City",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe"
]

const dietaryOptions = [
  { key: "halal", label: "Halal", icon: "checkmark-circle", color: "#1ABC9C", type: "ion" },
  { key: "kosher", label: "Kosher", icon: "shield-checkmark", color: "#2C7BE5", type: "ion" },
  { key: "vegetarian", label: "Vegetarian", icon: "leaf", color: "#22C55E", type: "ion" },
  { key: "vegan", label: "Vegan", icon: "leaf-outline", color: "#16A34A", type: "ion" },
  { key: "pescatarian", label: "Pescatarian", icon: "fish", color: "#3B82F6", type: "mci" },
  { key: "keto", label: "Keto", icon: "flame", color: "#F97316", type: "ion" },
  { key: "low_carb", label: "Low Carb", icon: "speedometer", color: "#14B8A6", type: "ion" },
  { key: "low_sodium", label: "Low Sodium", icon: "water", color: "#0EA5E9", type: "ion" },
  { key: "low_sugar", label: "Low Sugar", icon: "fitness", color: "#E11D48", type: "ion" },
  { key: "high_protein", label: "High Protein", icon: "barbell", color: "#2563EB", type: "ion" },
  { key: "gluten_free", label: "Gluten-Free", icon: "gf", color: "#F59E0B", type: "gf" },
  { key: "dairy_free", label: "Dairy-Free", icon: "nutrition", color: "#8B5CF6", type: "ion" }
]

const allergyOptions = [
  { key: "peanuts", label: "Peanuts", icon: "warning", color: "#E63946", type: "ion" },
  { key: "tree_nuts", label: "Tree Nuts", icon: "leaf", color: "#B45309", type: "ion" },
  { key: "dairy", label: "Dairy", icon: "cafe", color: "#2563EB", type: "ion" },
  { key: "eggs", label: "Eggs", icon: "nutrition", color: "#F59E0B", type: "ion" },
  { key: "shellfish", label: "Shellfish", icon: "shrimp", color: "#EF4444", type: "mci" },
  { key: "fish", label: "Fish", icon: "fish", color: "#3B82F6", type: "mci" },
  { key: "soy", label: "Soy", icon: "leaf-outline", color: "#22C55E", type: "ion" },
  { key: "wheat_gluten", label: "Wheat / Gluten", icon: "pizza", color: "#F97316", type: "ion" },
  { key: "sesame", label: "Sesame", icon: "nutrition-outline", color: "#F59E0B", type: "ion" },
  { key: "sulfites", label: "Sulfites", icon: "alert", color: "#EF4444", type: "ion" }
]

const alertOptions = [
  { key: "highRisk", label: "High-Risk Ingredients" },
  { key: "allergenDetected", label: "Allergen Detected" },
  { key: "nonCompliant", label: "Non-Compliant Food" },
  { key: "processed", label: "Highly Processed Foods" },
  { key: "highSodiumSugar", label: "High Sodium / Sugar" },
  { key: "push", label: "Push Notifications" },
  { key: "email", label: "Email Alerts" },
  { key: "sms", label: "SMS Alerts" }
]

const sensitivityOptions = [
  { key: "hypertension", label: "Hypertension-friendly" },
  { key: "diabetic", label: "Diabetic-friendly" },
  { key: "heartHealthy", label: "Heart-healthy" },
  { key: "weightLoss", label: "Weight-loss focused" }
]

const toNumberOrNull = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

const getDefaultCountry = () => {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale
    if (locale.includes("PK")) return "Pakistan"
    if (locale.includes("AE")) return "United Arab Emirates"
    if (locale.includes("SA")) return "Saudi Arabia"
    if (locale.includes("GB")) return "United Kingdom"
  } catch {
    // ignore
  }
  return "United States"
}

export default function SettingsScreen() {
  const { setIsAuthed } = useContext(AuthContext)
  const [profile, setProfileState] = useState<UserProfile | null>(null)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [profilePrefs, setProfilePrefsState] = useState(() => ({
    photoUri: null as string | null,
    dob: "",
    country: getDefaultCountry(),
    dietaryOther: "",
    dietary: {} as Record<string, boolean>,
    allergies: {} as Record<string, boolean>,
    allergyOther: "",
    alerts: {
      highRisk: true,
      allergenDetected: true,
      nonCompliant: true,
      processed: true,
      highSodiumSugar: true,
      push: true,
      email: true,
      sms: true
    },
    sensitivities: {
      hypertension: false,
      diabetic: false,
      heartHealthy: false,
      weightLoss: false
    },
    scoring: { allergies: 70, dietary: 60, processing: 40, strictMode: true }
  }))
  const [prefs, setPrefs] = useState<UserPrefs>(emptyPrefs)
  const [status, setStatus] = useState("")

  useEffect(() => {
    const load = async () => {
      const cachedProfile = await getProfile()
      if (cachedProfile) {
        setProfileState(cachedProfile)
        if (cachedProfile.mobileNumber) {
          setPhoneNumber(cachedProfile.mobileNumber)
        }
      }
      const cachedPrefs = await getUserPrefs()
      if (cachedPrefs) {
        setPrefs({ ...emptyPrefs, ...cachedPrefs })
      }

      try {
        const profileData = await fetchProfile()
        setProfileState(profileData)
        setProfile(profileData)
        if (profileData.mobileNumber) {
          setPhoneNumber(profileData.mobileNumber)
        }
        const remotePrefs = await fetchPrefs(profileData.id)
        setPrefs({ ...emptyPrefs, ...remotePrefs })
        setUserPrefs(remotePrefs)
      } catch {
        // keep cached values
      }

      const storedHealth = await getHealthPrefs()
      const storedProfilePrefs = await getProfilePrefs()
      setProfilePrefsState((prev) => ({
        ...prev,
        ...storedProfilePrefs,
        country: storedProfilePrefs.country || prev.country,
        dietaryOther: storedProfilePrefs.dietaryOther || "",
        allergyOther: storedProfilePrefs.allergyOther ?? storedHealth.allergyOther ?? "",
        dietary: {
          ...storedProfilePrefs.dietary,
          ...Object.fromEntries(storedHealth.restrictions.map((item) => [item, true]))
        },
        allergies: {
          ...storedProfilePrefs.allergies,
          ...Object.fromEntries(storedHealth.allergens.map((item) => [item, true]))
        }
      }))
    }

    load()
  }, [])

  const setDietaryToggle = (key: string, value: boolean) => {
    setProfilePrefsState((prev) => ({
      ...prev,
      dietary: { ...prev.dietary, [key]: value }
    }))
  }

  const setAllergyToggle = (key: string, value: boolean) => {
    setProfilePrefsState((prev) => ({
      ...prev,
      allergies: { ...prev.allergies, [key]: value }
    }))
  }

  const setAlertToggle = (key: string, value: boolean) => {
    setProfilePrefsState((prev) => ({
      ...prev,
      alerts: { ...prev.alerts, [key]: value }
    }))
  }

  const setSensitivityToggle = (key: string, value: boolean) => {
    setProfilePrefsState((prev) => ({
      ...prev,
      sensitivities: { ...prev.sensitivities, [key]: value }
    }))
  }

  const setScoringValue = (key: "allergies" | "dietary" | "processing", value: number) => {
    setProfilePrefsState((prev) => ({
      ...prev,
      scoring: { ...prev.scoring, [key]: value }
    }))
  }

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1]
    })
    if (!result.canceled && result.assets.length > 0) {
      setProfilePrefsState((prev) => ({ ...prev, photoUri: result.assets[0].uri }))
    }
  }

  const handleSave = async () => {
    setStatus("Saving...")
    try {
      if (profile) {
        const payload = {
          ...profile,
          mobileNumber: phoneNumber.trim()
        }
        const savedProfile = await saveProfile(payload)
        setProfileState(savedProfile)
        await setProfile(savedProfile)
      }

      const nextPrefs = {
        ...prefs,
        halalCheckEnabled: !!profilePrefs.dietary?.halal,
        vegetarian: !!profilePrefs.dietary?.vegetarian,
        vegan: !!profilePrefs.dietary?.vegan
      }
      const saved = await updatePrefs(nextPrefs)
      setPrefs(saved)
      await setUserPrefs(saved)

      const restrictions = Object.entries(profilePrefs.dietary || {})
        .filter(([, value]) => value)
        .map(([key]) => key)
      if (profilePrefs.dietaryOther?.trim()) {
        restrictions.push(profilePrefs.dietaryOther.trim())
      }
      const allergens = Object.entries(profilePrefs.allergies || {})
        .filter(([, value]) => value)
        .map(([key]) => key)
      await setHealthPrefs({ restrictions, allergens, allergyOther: profilePrefs.allergyOther || "" })
      await setProfilePrefs(profilePrefs)
      setStatus("Saved")
    } catch {
      setStatus("Saved")
      const restrictions = Object.entries(profilePrefs.dietary || {})
        .filter(([, value]) => value)
        .map(([key]) => key)
      if (profilePrefs.dietaryOther?.trim()) {
        restrictions.push(profilePrefs.dietaryOther.trim())
      }
      const allergens = Object.entries(profilePrefs.allergies || {})
        .filter(([, value]) => value)
        .map(([key]) => key)
      await setHealthPrefs({ restrictions, allergens, allergyOther: profilePrefs.allergyOther || "" })
      await setProfilePrefs(profilePrefs)
    }
  }

  const handleLogout = async () => {
    await clearAuth()
    setIsAuthed(false)
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {profile && (
        <View style={[styles.card, styles.cardInfo]}>
          <Text style={styles.sectionTitle}>Personal information</Text>
          <View style={styles.photoRow}>
            <View style={styles.photoPlaceholder}>
              {profilePrefs.photoUri ? (
                <Image source={{ uri: profilePrefs.photoUri }} style={styles.photoImage} />
              ) : (
                <Ionicons name="person-circle-outline" size={52} color={theme.colors.muted} />
              )}
            </View>
            <Pressable style={styles.photoButton} onPress={pickPhoto}>
              <Ionicons name="image-outline" size={16} color="#ffffff" />
              <Text style={styles.photoButtonText}>Upload photo</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Full name *</Text>
          <TextInput
            style={styles.input}
            value={profile.fullName ?? ""}
            onChangeText={(value) => setProfileState({ ...profile, fullName: value })}
            placeholder="Full name"
            placeholderTextColor={theme.colors.muted}
          />

          <Text style={styles.label}>Email address *</Text>
          <TextInput
            style={styles.input}
            value={profile.email ?? ""}
            editable={false}
          />

          <Text style={styles.label}>Phone number</Text>
          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={(value) => {
              setPhoneNumber(value)
              setProfileState({ ...profile, mobileNumber: value.trim() })
            }}
            placeholder="Phone number"
            placeholderTextColor={theme.colors.muted}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Date of birth</Text>
          <TextInput
            style={styles.input}
            value={profilePrefs.dob ?? ""}
            onChangeText={(value) => setProfilePrefsState((prev) => ({ ...prev, dob: value }))}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.colors.muted}
          />

          <Text style={styles.label}>Country</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={profilePrefs.country ?? getDefaultCountry()}
              onValueChange={(value) =>
                setProfilePrefsState((prev) => ({ ...prev, country: value }))
              }
            >
              {countryOptions.map((country) => (
                <Picker.Item key={country} label={country} value={country} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Gender</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={profile.gender ?? ""}
              onValueChange={(value) =>
                setProfileState({ ...profile, gender: value as UserProfile["gender"] })
              }
            >
              <Picker.Item label="Select" value="" />
              <Picker.Item label="Male" value="male" />
              <Picker.Item label="Female" value="female" />
              <Picker.Item label="Other" value="other" />
            </Picker>
          </View>

          <Text style={styles.label}>Height (cm)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={profile.heightCm?.toString() || ""}
            onChangeText={(value) =>
              setProfileState({ ...profile, heightCm: toNumberOrNull(value) ?? undefined })
            }
            placeholder="Height in cm"
            placeholderTextColor={theme.colors.muted}
          />

          <Text style={styles.label}>Weight (kg)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={profile.weightKg?.toString() || ""}
            onChangeText={(value) =>
              setProfileState({ ...profile, weightKg: toNumberOrNull(value) ?? undefined })
            }
            placeholder="Weight in kg"
            placeholderTextColor={theme.colors.muted}
          />

          <Text style={styles.label}>Activity level</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={profile.activityLevel ?? ""}
              onValueChange={(value) =>
                setProfileState({ ...profile, activityLevel: value as UserProfile["activityLevel"] })
              }
            >
              <Picker.Item label="Select" value="" />
              <Picker.Item label="Sedentary" value="sedentary" />
              <Picker.Item label="Light" value="light" />
              <Picker.Item label="Moderate" value="moderate" />
              <Picker.Item label="Active" value="active" />
            </Picker>
          </View>
        </View>
      )}

      <View style={[styles.card, styles.cardDiet]}>
        <Text style={styles.sectionTitle}>Dietary restrictions</Text>
        {dietaryOptions.map((item) => (
          <View key={item.key} style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              {item.type === "gf" ? (
                <View style={styles.gfIcon}>
                  <Text style={styles.gfText}>GF</Text>
                  <View style={styles.gfSlash} />
                </View>
              ) : item.type === "mci" ? (
                <MaterialCommunityIcons name={item.icon as any} size={16} color={item.color} />
              ) : (
                <Ionicons name={item.icon as any} size={16} color={item.color} />
              )}
              <Text style={styles.toggleText}>{item.label}</Text>
            </View>
            <Switch
              value={!!profilePrefs.dietary?.[item.key]}
              onValueChange={(value) => setDietaryToggle(item.key, value)}
            />
          </View>
        ))}
        <Text style={styles.label}>Other (custom)</Text>
        <TextInput
          style={styles.input}
          value={profilePrefs.dietaryOther ?? ""}
          onChangeText={(value) => setProfilePrefsState((prev) => ({ ...prev, dietaryOther: value }))}
          placeholder="Add custom restriction"
          placeholderTextColor={theme.colors.muted}
        />
      </View>

      <View style={[styles.card, styles.cardAllergy]}>
        <Text style={styles.sectionTitle}>Allergies & intolerances</Text>
        {allergyOptions.map((item) => (
          <Pressable
            key={item.key}
            style={styles.checkRow}
            onPress={() => setAllergyToggle(item.key, !profilePrefs.allergies?.[item.key])}
          >
            <Ionicons
              name={profilePrefs.allergies?.[item.key] ? "checkbox" : "square-outline"}
              size={20}
              color={profilePrefs.allergies?.[item.key] ? theme.colors.warning : theme.colors.muted}
            />
            {item.type === "mci" ? (
              <MaterialCommunityIcons name={item.icon as any} size={16} color={item.color} />
            ) : (
              <Ionicons name={item.icon as any} size={16} color={item.color} />
            )}
            <Text style={styles.checkLabel}>{item.label}</Text>
          </Pressable>
        ))}
        <Text style={styles.label}>Other (custom)</Text>
        <TextInput
          style={styles.input}
          value={profilePrefs.allergyOther ?? ""}
          onChangeText={(value) => setProfilePrefsState((prev) => ({ ...prev, allergyOther: value }))}
          placeholder="Add custom allergy"
          placeholderTextColor={theme.colors.muted}
        />
      </View>

      <View style={[styles.card, styles.cardAlerts]}>
        <Text style={styles.sectionTitle}>Alert preferences</Text>
        {alertOptions.map((item) => (
          <View key={item.key} style={styles.toggleRow}>
            <Text style={styles.toggleText}>{item.label}</Text>
            <Switch
              value={!!profilePrefs.alerts?.[item.key]}
              onValueChange={(value) => setAlertToggle(item.key, value)}
            />
          </View>
        ))}
      </View>

      <View style={[styles.card, styles.cardSensitivity]}>
        <Text style={styles.sectionTitle}>Health sensitivities</Text>
        {sensitivityOptions.map((item) => (
          <View key={item.key} style={styles.toggleRow}>
            <Text style={styles.toggleText}>{item.label}</Text>
            <Switch
              value={!!profilePrefs.sensitivities?.[item.key]}
              onValueChange={(value) => setSensitivityToggle(item.key, value)}
            />
          </View>
        ))}
        <Text style={styles.bodyMuted}>This app does not provide medical advice.</Text>
      </View>

      <View style={[styles.card, styles.cardScoring]}>
        <Text style={styles.sectionTitle}>Scoring preferences</Text>
        <Text style={styles.label}>Prioritize allergies</Text>
        <Slider
          value={profilePrefs.scoring.allergies}
          minimumValue={0}
          maximumValue={100}
          step={1}
          minimumTrackTintColor={theme.colors.accent}
          maximumTrackTintColor={theme.colors.border}
          onValueChange={(value) => setScoringValue("allergies", value)}
        />
        <Text style={styles.label}>Prioritize dietary rules</Text>
        <Slider
          value={profilePrefs.scoring.dietary}
          minimumValue={0}
          maximumValue={100}
          step={1}
          minimumTrackTintColor={theme.colors.accent2}
          maximumTrackTintColor={theme.colors.border}
          onValueChange={(value) => setScoringValue("dietary", value)}
        />
        <Text style={styles.label}>Prioritize processing level</Text>
        <Slider
          value={profilePrefs.scoring.processing}
          minimumValue={0}
          maximumValue={100}
          step={1}
          minimumTrackTintColor={theme.colors.warning}
          maximumTrackTintColor={theme.colors.border}
          onValueChange={(value) => setScoringValue("processing", value)}
        />
        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>Strict mode</Text>
          <Switch
            value={profilePrefs.scoring.strictMode}
            onValueChange={(value) =>
              setProfilePrefsState((prev) => ({
                ...prev,
                scoring: { ...prev.scoring, strictMode: value }
              }))
            }
          />
        </View>
      </View>

      <GradientButton onPress={handleSave} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>Save Profile</Text>
      </GradientButton>
      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color={theme.colors.text} />
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
      {status ? <Text style={styles.status}>{status}</Text> : null}
      <Text style={styles.disclaimer}>Educational, not medical advice.</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.bg
  },
  card: {
    backgroundColor: theme.colors.panel,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  cardInfo: {
    backgroundColor: "#EEF6FF",
    borderColor: "#CFE2FF"
  },
  cardDiet: {
    backgroundColor: "#E9FBF6",
    borderColor: "#BFF3E5"
  },
  cardAllergy: {
    backgroundColor: "#FFF1F2",
    borderColor: "#FECACA"
  },
  cardAlerts: {
    backgroundColor: "#FFF7E6",
    borderColor: "#FDDDB3"
  },
  cardSensitivity: {
    backgroundColor: "#EEF2FF",
    borderColor: "#C7D2FE"
  },
  cardScoring: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0"
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 12
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16
  },
  photoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: theme.colors.glassStrong,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  photoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.colors.accent2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999
  },
  photoButtonText: {
    color: "#ffffff",
    fontWeight: "700"
  },
  label: {
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 6
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.glassStrong
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.glassStrong,
    marginBottom: 16,
    overflow: "hidden"
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10
  },
  toggleLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  toggleText: {
    color: theme.colors.text,
    fontWeight: "600"
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8
  },
  checkLabel: {
    color: theme.colors.text,
    fontWeight: "600"
  },
  gfIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
    position: "relative"
  },
  gfText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#F59E0B"
  },
  gfSlash: {
    position: "absolute",
    width: 22,
    height: 2,
    backgroundColor: "#F59E0B",
    transform: [{ rotate: "-35deg" }]
  },
  bodyMuted: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: 8
  },
  primaryButton: {
    marginTop: 8
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700"
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 12,
    backgroundColor: theme.colors.glass,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8
  },
  logoutText: {
    color: theme.colors.text,
    fontWeight: "700"
  },
  status: {
    marginTop: 12,
    color: theme.colors.accent2
  },
  disclaimer: {
    marginTop: 16,
    color: theme.colors.muted,
    textAlign: "center"
  }
})
