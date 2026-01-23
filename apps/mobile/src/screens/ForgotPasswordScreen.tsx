import { useState } from "react"
import { View, Text, TextInput, StyleSheet, Pressable } from "react-native"
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
    padding: 24,
    backgroundColor: theme.colors.bg
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: theme.colors.text
  },
  subtitle: {
    color: theme.colors.muted,
    marginBottom: 24
  },
  input: {
    backgroundColor: theme.colors.panel,
    color: theme.colors.text,
    padding: 12,
    borderRadius: theme.radius.md,
    marginBottom: 12
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
    padding: 14,
    borderRadius: theme.radius.md,
    alignItems: "center"
  },
  primaryButtonText: {
    color: "#02130c",
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
