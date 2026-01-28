import { useState } from "react"
import { View, Text, TextInput, StyleSheet, Pressable, Image } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { requestPasswordReset } from "@wimf/shared"
import { apiBase } from "../api/config"
import { theme } from "../theme"

type Props = {
  navigation: any
}

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState("")
  const [token, setToken] = useState<string | null>(null)

  const handleReset = async () => {
    setStatus("Requesting reset...")
    try {
      const response = await requestPasswordReset({ baseUrl: apiBase }, { email })
      setStatus(response.message)
      setToken(response.token || null)
    } catch (error) {
      setStatus((error as Error).message)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <Image source={require("../../assets/icon.png")} style={styles.logoImage} />
      </View>
      <Text style={styles.title}>Forgot password</Text>
      <Text style={styles.subtitle}>Request a reset token.</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={theme.colors.muted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Pressable style={styles.primaryButton} onPress={handleReset}>
        <Ionicons name="mail-outline" size={18} color="#ffffff" />
        <Text style={styles.primaryButtonText}>Request reset</Text>
      </Pressable>
      {status ? <Text style={styles.status}>{status}</Text> : null}
      {token ? <Text style={styles.token}>Dev token: {token}</Text> : null}
      <Pressable onPress={() => navigation.navigate("ResetPassword")}>
        <Text style={styles.link}>Already have a token?</Text>
      </Pressable>
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
    fontSize: 26,
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
    gap: 8
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700"
  },
  status: {
    color: theme.colors.muted,
    marginTop: 12
  },
  token: {
    color: theme.colors.warning,
    marginTop: 8
  },
  link: {
    color: theme.colors.accent2,
    marginTop: 16
  }
})
