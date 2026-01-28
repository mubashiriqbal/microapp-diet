import { useContext, useState } from "react"
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, Image } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { signUpUser } from "../api/client"
import { setHealthPrefs, setProfile, setToken, setUserId } from "../storage/cache"
import { theme } from "../theme"
import { AuthContext } from "../auth"

type Props = {
  navigation: any
}

const dietaryOptions = [
  { key: "halal", label: "Halal", icon: "checkmark-circle", color: "#1ABC9C" },
  { key: "kosher", label: "Kosher", icon: "shield-checkmark", color: "#2C7BE5" },
  { key: "vegetarian", label: "Vegetarian", icon: "leaf", color: "#22C55E" },
  { key: "vegan", label: "Vegan", icon: "leaf-outline", color: "#16A34A" },
  { key: "pescatarian", label: "Pescatarian", icon: "fish", color: "#3B82F6" },
  { key: "keto", label: "Keto", icon: "flame", color: "#F97316" },
  { key: "low_carb", label: "Low Carb", icon: "speedometer", color: "#14B8A6" },
  { key: "low_sodium", label: "Low Sodium", icon: "water", color: "#0EA5E9" },
  { key: "low_sugar", label: "Low Sugar", icon: "fitness", color: "#E11D48" },
  { key: "high_protein", label: "High Protein", icon: "barbell", color: "#2563EB" },
  { key: "gluten_free", label: "Gluten-Free", icon: "ban", color: "#F59E0B" },
  { key: "dairy_free", label: "Dairy-Free", icon: "nutrition", color: "#8B5CF6" }
]

const allergyOptions = [
  { key: "peanuts", label: "Peanuts", icon: "warning", color: "#E63946" },
  { key: "tree_nuts", label: "Tree Nuts", icon: "leaf", color: "#B45309" },
  { key: "dairy", label: "Dairy", icon: "cafe", color: "#2563EB" },
  { key: "eggs", label: "Eggs", icon: "nutrition", color: "#F59E0B" },
  { key: "shellfish", label: "Shellfish", icon: "fish", color: "#EF4444" },
  { key: "fish", label: "Fish", icon: "fish-outline", color: "#3B82F6" },
  { key: "soy", label: "Soy", icon: "leaf-outline", color: "#22C55E" },
  { key: "wheat_gluten", label: "Wheat / Gluten", icon: "pizza", color: "#F97316" },
  { key: "sesame", label: "Sesame", icon: "nutrition-outline", color: "#F59E0B" },
  { key: "sulfites", label: "Sulfites", icon: "alert", color: "#EF4444" }
]

export default function SignupScreen({ navigation }: Props) {
  const { setIsAuthed } = useContext(AuthContext)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState("")
  const [dietary, setDietary] = useState<Record<string, boolean>>({})
  const [allergies, setAllergies] = useState<Record<string, boolean>>({})
  const [allergyOther, setAllergyOther] = useState("")

  const handleSignup = async () => {
    setStatus("Creating account...")
    try {
      const response = await signUpUser({ fullName, email, password })
      await setToken(response.token)
      await setProfile(response.profile)
      await setUserId(response.profile.id)
      const restrictions = Object.entries(dietary)
        .filter(([, value]) => value)
        .map(([key]) => key)
      const allergens = Object.entries(allergies)
        .filter(([, value]) => value)
        .map(([key]) => key)
      await setHealthPrefs({ restrictions, allergens, allergyOther })
      setIsAuthed(true)
      setStatus("Account created.")
      navigation.replace("Main")
    } catch (error) {
      setStatus((error as Error).message)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.logoWrap}>
        <Image source={require("../../assets/icon.png")} style={styles.logoImage} />
      </View>
      <Text style={styles.title}>Sign up</Text>
      <Text style={styles.subtitle}>Create your profile.</Text>

      <TextInput
        style={styles.input}
        placeholder="Full name"
        placeholderTextColor={theme.colors.muted}
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={theme.colors.muted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={theme.colors.muted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Dietary restrictions</Text>
        {dietaryOptions.map((item) => (
          <Pressable
            key={item.key}
            style={styles.checkRow}
            onPress={() => setDietary((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
          >
            <Ionicons
              name={dietary[item.key] ? "checkbox" : "square-outline"}
              size={20}
              color={dietary[item.key] ? theme.colors.accent : theme.colors.muted}
            />
            <Ionicons name={item.icon as any} size={16} color={item.color} />
            <Text style={styles.checkLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Allergies & intolerances</Text>
        {allergyOptions.map((item) => (
          <Pressable
            key={item.key}
            style={styles.checkRow}
            onPress={() => setAllergies((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
          >
            <Ionicons
              name={allergies[item.key] ? "checkbox" : "square-outline"}
              size={20}
              color={allergies[item.key] ? theme.colors.warning : theme.colors.muted}
            />
            <Ionicons name={item.icon as any} size={16} color={item.color} />
            <Text style={styles.checkLabel}>{item.label}</Text>
          </Pressable>
        ))}
        <Text style={styles.label}>Other (custom)</Text>
        <TextInput
          style={styles.input}
          value={allergyOther}
          onChangeText={setAllergyOther}
          placeholder="Add custom allergy"
          placeholderTextColor={theme.colors.muted}
        />
      </View>

      <Pressable style={styles.primaryButton} onPress={handleSignup}>
        <Ionicons name="person-add-outline" size={18} color="#ffffff" />
        <Text style={styles.primaryButtonText}>Create account</Text>
      </Pressable>

      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Back to login</Text>
      </Pressable>

      {status ? <Text style={styles.status}>{status}</Text> : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl + 12,
    backgroundColor: theme.colors.bg
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: theme.spacing.lg
  },
  logoImage: {
    width: 96,
    height: 96,
    resizeMode: "contain"
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.text,
    fontFamily: theme.font.heading
  },
  subtitle: {
    color: theme.colors.muted,
    marginBottom: 24
  },
  input: {
    backgroundColor: theme.colors.glass,
    color: theme.colors.text,
    padding: 12,
    borderRadius: theme.radius.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  card: {
    backgroundColor: theme.colors.panel,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 12
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
  label: {
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 8,
    marginBottom: 6
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
    padding: 14,
    borderRadius: 999,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 8
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700"
  },
  link: {
    color: theme.colors.accent2,
    marginTop: 16
  },
  status: {
    color: theme.colors.muted,
    marginTop: 12
  }
})
