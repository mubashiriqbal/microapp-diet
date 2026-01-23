import { useState } from "react"
import { View, Text, TextInput, StyleSheet, Pressable } from "react-native"
import { resetPassword } from "@wimf/shared"
import { apiBase } from "../api/config"
import { theme } from "../theme"

type Props = {
  navigation: any
}

export default function ResetPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState("")
  const [token, setToken] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [status, setStatus] = useState("")

  const handleReset = async () => {
    setStatus("Resetting...")
    try {
      const response = await resetPassword({ baseUrl: apiBase }, { email, token, newPassword })
      setStatus(response.message)
      navigation.navigate("Login")
    } catch (error) {
      setStatus((error as Error).message)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.subtitle}>Paste your reset token.</Text>
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
        placeholder="Reset token"
        placeholderTextColor={theme.colors.muted}
        value={token}
        onChangeText={setToken}
      />
      <TextInput
        style={styles.input}
        placeholder="New password"
        placeholderTextColor={theme.colors.muted}
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />
      <Pressable style={styles.primaryButton} onPress={handleReset}>
        <Text style={styles.primaryButtonText}>Reset password</Text>
      </Pressable>
      {status ? <Text style={styles.status}>{status}</Text> : null}
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
  }
})
