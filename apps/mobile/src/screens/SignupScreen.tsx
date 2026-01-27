import { useContext, useState } from "react"
import { View, Text, TextInput, StyleSheet, Pressable } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { signUpUser } from "../api/client"
import { setHealthPrefs, setProfile, setToken, setUserId } from "../storage/cache"
import MultiSelect from "../components/MultiSelect"
import { theme } from "../theme"
import { AuthContext } from "../auth"

type Props = {
  navigation: any
}

export default function SignupScreen({ navigation }: Props) {
  const { setIsAuthed } = useContext(AuthContext)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState("")
  const [restrictions, setRestrictions] = useState<string[]>([])
  const [allergens, setAllergens] = useState<string[]>([])

  const restrictionOptions = [
    { value: "vegan", label: "Vegan", description: "Excludes all animal-derived foods." },
    { value: "vegetarian", label: "Vegetarian", description: "No meat or fish; may include eggs/dairy." },
    { value: "gluten_free", label: "Gluten-Free", description: "No wheat, barley, or rye." },
    { value: "lactose_free", label: "Dairy-Free", description: "Avoids milk-based products." },
    { value: "nut_allergy", label: "Nut Allergies", description: "Avoid peanuts and tree nuts." },
    { value: "halal", label: "Halal", description: "Complies with Islamic dietary laws." },
    { value: "kosher", label: "Kosher", description: "Complies with Jewish dietary laws." },
    { value: "hindu", label: "Hindu", description: "Commonly restricts beef; some avoid all meat." },
    { value: "keto", label: "Keto", description: "High fat, low carb." },
    { value: "diabetic", label: "Diabetic", description: "Manages sugar and carbohydrates." },
    { value: "low_sodium", label: "Low-Sodium / Low-Fat", description: "Used for cardiovascular health." }
  ]

  const allergenOptions = [
    { value: "milk", label: "Milk" },
    { value: "eggs", label: "Eggs" },
    { value: "peanuts", label: "Peanuts" },
    { value: "tree_nuts", label: "Tree Nuts", description: "Almonds, walnuts, pecans, etc." },
    { value: "fish", label: "Fish", description: "Salmon, cod, flounder, etc." },
    { value: "shellfish", label: "Crustacean Shellfish", description: "Shrimp, crab, lobster." },
    { value: "wheat", label: "Wheat" },
    { value: "soy", label: "Soy" },
    { value: "sesame", label: "Sesame", description: "Recognized as major allergen (2023)." }
  ]

  const handleSignup = async () => {
    setStatus("Creating account...")
    try {
      const response = await signUpUser({ fullName, email, password })
      await setToken(response.token)
      await setProfile(response.profile)
      await setUserId(response.profile.id)
      await setHealthPrefs({ restrictions, allergens })
      setIsAuthed(true)
      setStatus("Account created.")
      navigation.replace("Main")
    } catch (error) {
      setStatus((error as Error).message)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>SafePlate AI</Text>
      <Text style={styles.tagline}>I can trust this app with my health.</Text>
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

      <MultiSelect
        label="Common dietary restrictions"
        options={restrictionOptions}
        selected={restrictions}
        onChange={setRestrictions}
        placeholder="Search dietary restrictions"
      />

      <MultiSelect
        label="Allergens"
        options={allergenOptions}
        selected={allergens}
        onChange={setAllergens}
        placeholder="Search allergens"
      />

      <Pressable style={styles.primaryButton} onPress={handleSignup}>
        <Ionicons name="person-add-outline" size={18} color="#ffffff" />
        <Text style={styles.primaryButtonText}>Create account</Text>
      </Pressable>

      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Back to login</Text>
      </Pressable>

      {status ? <Text style={styles.status}>{status}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.bg
  },
  logo: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: theme.spacing.xl,
    marginBottom: 6,
    fontFamily: theme.font.heading
  },
  tagline: {
    color: theme.colors.muted,
    marginBottom: theme.spacing.lg
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
