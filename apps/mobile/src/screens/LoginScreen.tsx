import { useContext, useState } from "react"
import { View, Text, TextInput, StyleSheet, Pressable, Image } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { logInUser } from "../api/client"
import { setProfile, setToken, setUserId } from "../storage/cache"
import { theme } from "../theme"
import { AuthContext } from "../auth"

type Props = {
  navigation: any
}

export default function LoginScreen({ navigation }: Props) {
  const { setIsAuthed } = useContext(AuthContext)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState("")

  const handleLogin = async () => {
    setStatus("Signing in...")
    try {
      const response = await logInUser({ email, password })
      await setToken(response.token)
      await setProfile(response.profile)
      await setUserId(response.profile.id)
      setIsAuthed(true)
      setStatus("Signed in.")
      navigation.replace("Main")
    } catch (error) {
      setStatus((error as Error).message)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <Image source={require("../../assets/icon.png")} style={styles.logoImage} />
      </View>
      <Text style={styles.title}>Log in</Text>
      <Text style={styles.subtitle}>Welcome back.</Text>

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

      <Pressable style={styles.primaryButton} onPress={handleLogin}>
        <Ionicons name="log-in-outline" size={18} color="#ffffff" />
        <Text style={styles.primaryButtonText}>Log in</Text>
      </Pressable>

      <Pressable onPress={() => navigation.navigate("Signup")}>
        <Text style={styles.link}>Create an account</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate("ForgotPassword")}>
        <Text style={styles.link}>Forgot password?</Text>
      </Pressable>

      {status ? <Text style={styles.status}>{status}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
