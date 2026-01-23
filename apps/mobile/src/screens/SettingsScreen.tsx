import { useContext, useEffect, useState } from "react"
import { View, Text, TextInput, StyleSheet, Pressable, Switch, ScrollView } from "react-native"
import * as Notifications from "expo-notifications"
import {
  fetchConditions,
  fetchPrefs,
  fetchProfile,
  saveConditions,
  saveProfile,
  updatePrefs
} from "../api/client"
import { clearAuth, getProfile, getUserPrefs, setProfile, setUserPrefs } from "../storage/cache"
import type { MedicalCondition, UserPrefs, UserProfile } from "@wimf/shared"
import { theme } from "../theme"
import { AuthContext } from "../auth"
import {
  addActivity,
  addWeight,
  getActivities,
  getActivePlanId,
  getGoals,
  getPlans,
  getReminders,
  getWeights,
  setActivePlan,
  setGoals,
  setPlans,
  setReminders
} from "../storage/tracking"

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

const toNumberOrNull = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

const conditionLabels = [
  { type: "diabetes", label: "Diabetes" },
  { type: "hypertension", label: "High blood pressure" },
  { type: "heart_disease", label: "Heart disease" },
  { type: "high_cholesterol", label: "High cholesterol" },
  { type: "celiac", label: "Celiac / gluten sensitivity" },
  { type: "kidney_disease", label: "Kidney disease" },
  { type: "allergy", label: "Allergies" },
  { type: "other", label: "Other" }
] as const

export default function SettingsScreen() {
  const { setIsAuthed } = useContext(AuthContext)
  const [profile, setProfileState] = useState<UserProfile | null>(null)
  const [conditions, setConditions] = useState<MedicalCondition[]>([])
  const [prefs, setPrefs] = useState<UserPrefs>(emptyPrefs)
  const [goals, setGoalsState] = useState(getGoals())
  const [plans, setPlansState] = useState(getPlans())
  const [activePlanId, setActivePlanIdState] = useState(getActivePlanId())
  const [planName, setPlanName] = useState("")
  const [reminders, setRemindersState] = useState(getReminders())
  const [weights, setWeightsState] = useState(getWeights())
  const [weightInput, setWeightInput] = useState("")
  const [activities, setActivitiesState] = useState(getActivities())
  const [activityInput, setActivityInput] = useState("")
  const [status, setStatus] = useState("")

  useEffect(() => {
    const load = async () => {
      const cachedProfile = await getProfile()
      if (cachedProfile) {
        setProfileState(cachedProfile)
      }
      const cached = await getUserPrefs()
      if (cached) {
        setPrefs({ ...emptyPrefs, ...cached })
      }
      try {
        const profileData = await fetchProfile()
        setProfileState(profileData)
        setProfile(profileData)
        const [remotePrefs, remoteConditions] = await Promise.all([
          fetchPrefs(profileData.id),
          fetchConditions()
        ])
        setPrefs({ ...emptyPrefs, ...remotePrefs })
        setUserPrefs(remotePrefs)
        setConditions(remoteConditions)
      } catch {
        // keep cached values
      }
    }

    load()
  }, [])

  const handleSave = async () => {
    setStatus("Saving...")
    try {
      if (profile) {
        const savedProfile = await saveProfile(profile)
        setProfileState(savedProfile)
        await setProfile(savedProfile)
      }
      const saved = await updatePrefs(prefs)
      await setUserPrefs(saved)
      await saveConditions(conditions)
      setStatus("Saved")
    } catch {
      setStatus("Saved locally (offline)")
      await setUserPrefs(prefs)
    }
  }

  const handleGoalsSave = () => {
    setGoals(goals)
    setStatus("Goals saved.")
  }

  const handleCreatePlan = () => {
    if (!planName.trim()) {
      setStatus("Enter a plan name.")
      return
    }
    const newPlan = {
      id: `${Date.now()}`,
      name: planName.trim(),
      createdAt: new Date().toISOString(),
      goals
    }
    const updated = [...plans, newPlan]
    setPlans(updated)
    setPlansState(updated)
    setPlanName("")
    setStatus("Plan created.")
  }

  const handleActivatePlan = (planId: string) => {
    setActivePlan(planId)
    setActivePlanIdState(planId)
    const plan = plans.find((item) => item.id === planId)
    if (plan) {
      setGoalsState(plan.goals)
      setGoals(plan.goals)
      setStatus("Plan activated.")
    }
  }

  const handleReminderSave = async () => {
    setReminders(reminders)
    if (reminders.enabled) {
      await Notifications.requestPermissionsAsync()
      await Notifications.cancelAllScheduledNotificationsAsync()
      await Promise.all(
        reminders.times.map((time) => {
          const [hour, minute] = time.split(":").map((value) => Number(value))
          if (!Number.isFinite(hour) || !Number.isFinite(minute)) return Promise.resolve()
          return Notifications.scheduleNotificationAsync({
            content: {
              title: "Meal reminder",
              body: "Log your meal. Educational only."
            },
            trigger: { hour, minute, repeats: true }
          })
        })
      )
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync()
    }
    setStatus("Reminders saved locally.")
  }

  const handleAddWeight = () => {
    const value = Number(weightInput)
    if (!Number.isFinite(value)) {
      setStatus("Enter a valid weight.")
      return
    }
    const entry = { id: `${Date.now()}`, date: new Date().toISOString().slice(0, 10), weightKg: value }
    const updated = addWeight(entry)
    setWeightsState(updated)
    setWeightInput("")
    setStatus("Weight logged.")
  }

  const handleAddActivity = () => {
    const value = Number(activityInput)
    if (!Number.isFinite(value)) {
      setStatus("Enter valid calories.")
      return
    }
    const entry = { id: `${Date.now()}`, date: new Date().toISOString().slice(0, 10), caloriesBurned: value }
    const updated = addActivity(entry)
    setActivitiesState(updated)
    setActivityInput("")
    setStatus("Activity logged.")
  }

  const handleLogout = async () => {
    await clearAuth()
    setIsAuthed(false)
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profile & preferences</Text>
      <Text style={styles.subtitle}>Personalize scans and calorie goals.</Text>

      {profile && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <Text style={styles.label}>Full name</Text>
          <TextInput
            style={styles.input}
            value={profile.fullName ?? ""}
            onChangeText={(value) => setProfileState({ ...profile, fullName: value })}
            placeholder="Full name"
            placeholderTextColor={theme.colors.muted}
          />
          <Text style={styles.label}>Mobile number</Text>
          <TextInput
            style={styles.input}
            value={profile.mobileNumber ?? ""}
            onChangeText={(value) => setProfileState({ ...profile, mobileNumber: value })}
            placeholder="Mobile number"
            placeholderTextColor={theme.colors.muted}
          />
          <Text style={styles.label}>Age</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={profile.age?.toString() || ""}
            onChangeText={(value) =>
              setProfileState({
                ...profile,
                age: toNumberOrNull(value) ?? undefined
              })
            }
            placeholder="Age"
            placeholderTextColor={theme.colors.muted}
          />
          <Text style={styles.label}>Height (cm)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={profile.heightCm?.toString() || ""}
            onChangeText={(value) =>
              setProfileState({
                ...profile,
                heightCm: toNumberOrNull(value) ?? undefined
              })
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
              setProfileState({
                ...profile,
                weightKg: toNumberOrNull(value) ?? undefined
              })
            }
            placeholder="Weight in kg"
            placeholderTextColor={theme.colors.muted}
          />
          <Text style={styles.label}>Gender (male/female/other)</Text>
          <TextInput
            style={styles.input}
            value={profile.gender ?? ""}
            onChangeText={(value) =>
              setProfileState({ ...profile, gender: value as UserProfile["gender"] })
            }
            placeholder="male"
            placeholderTextColor={theme.colors.muted}
          />

          <Text style={styles.label}>Activity level (sedentary/light/moderate/active)</Text>
          <TextInput
            style={styles.input}
            value={profile.activityLevel ?? ""}
            onChangeText={(value) =>
              setProfileState({ ...profile, activityLevel: value as UserProfile["activityLevel"] })
            }
            placeholder="moderate"
            placeholderTextColor={theme.colors.muted}
          />

          <Text style={styles.label}>Dietary preference (halal/vegetarian/vegan/none)</Text>
          <TextInput
            style={styles.input}
            value={profile.dietaryPreference ?? "none"}
            onChangeText={(value) =>
              setProfileState({
                ...profile,
                dietaryPreference: value as UserProfile["dietaryPreference"]
              })
            }
            placeholder="halal"
            placeholderTextColor={theme.colors.muted}
          />

          <Text style={styles.label}>Daily calorie goal</Text>
          <Text style={styles.readonly}>{profile.dailyCalorieGoal ?? 2000} kcal</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Health conditions</Text>
        {conditionLabels.map((condition) => {
          const selected = conditions.some((item) => item.type === condition.type)
          return (
            <View key={condition.type} style={styles.switchRow}>
              <Text style={styles.label}>{condition.label}</Text>
              <Switch
                value={selected}
                onValueChange={() => {
                  setConditions((prev) =>
                    selected
                      ? prev.filter((item) => item.type !== condition.type)
                      : [...prev, { type: condition.type }]
                  )
                }}
              />
            </View>
          )
        })}
        {conditions.some((item) => item.type === "allergy") && (
          <>
            <Text style={styles.label}>Allergy details</Text>
            <TextInput
              style={styles.input}
              value={conditions.find((item) => item.type === "allergy")?.notes || ""}
              onChangeText={(value) =>
                setConditions((prev) =>
                  prev.map((item) =>
                    item.type === "allergy" ? { ...item, notes: value } : item
                  )
                )
              }
              placeholder="e.g. peanuts, dairy"
              placeholderTextColor={theme.colors.muted}
            />
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Goals & limits</Text>
        <Text style={styles.label}>Daily calories</Text>
        <TextInput
          style={styles.input}
          value={goals.caloriesTarget.toString()}
          onChangeText={(value) =>
            setGoalsState((prev) => ({ ...prev, caloriesTarget: Number(value) || 0 }))
          }
          keyboardType="numeric"
        />
        <Text style={styles.label}>Protein target (g)</Text>
        <TextInput
          style={styles.input}
          value={goals.proteinTarget.toString()}
          onChangeText={(value) =>
            setGoalsState((prev) => ({ ...prev, proteinTarget: Number(value) || 0 }))
          }
          keyboardType="numeric"
        />
        <Text style={styles.label}>Sodium limit (mg)</Text>
        <TextInput
          style={styles.input}
          value={goals.sodiumLimit.toString()}
          onChangeText={(value) =>
            setGoalsState((prev) => ({ ...prev, sodiumLimit: Number(value) || 0 }))
          }
          keyboardType="numeric"
        />
        <Text style={styles.label}>Sugar limit (g)</Text>
        <TextInput
          style={styles.input}
          value={goals.sugarLimit.toString()}
          onChangeText={(value) =>
            setGoalsState((prev) => ({ ...prev, sugarLimit: Number(value) || 0 }))
          }
          keyboardType="numeric"
        />
        <Pressable style={styles.primaryButton} onPress={handleGoalsSave}>
          <Text style={styles.primaryButtonText}>Save goals</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Plans</Text>
        <TextInput
          style={styles.input}
          value={planName}
          onChangeText={setPlanName}
          placeholder="Plan name"
          placeholderTextColor={theme.colors.muted}
        />
        <Pressable style={styles.primaryButton} onPress={handleCreatePlan}>
          <Text style={styles.primaryButtonText}>Create plan</Text>
        </Pressable>
        {plans.map((plan) => (
          <View key={plan.id} style={styles.planRow}>
            <Text style={styles.label}>{plan.name}</Text>
            <Pressable
              style={styles.planButton}
              onPress={() => handleActivatePlan(plan.id)}
            >
              <Text style={styles.planButtonText}>
                {activePlanId === plan.id ? "Active" : "Activate"}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Reminders</Text>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Enable reminders</Text>
          <Switch
            value={reminders.enabled}
            onValueChange={(value) =>
              setRemindersState((prev) => ({ ...prev, enabled: value }))
            }
          />
        </View>
        <Text style={styles.label}>Times (HH:MM, comma separated)</Text>
        <TextInput
          style={styles.input}
          value={reminders.times.join(", ")}
          onChangeText={(value) =>
            setRemindersState((prev) => ({
              ...prev,
              times: value
                .split(",")
                .map((time) => time.trim())
                .filter(Boolean)
            }))
          }
          placeholder="08:00, 13:00, 19:00"
          placeholderTextColor={theme.colors.muted}
        />
        <Pressable style={styles.primaryButton} onPress={handleReminderSave}>
          <Text style={styles.primaryButtonText}>Save reminders</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Weight</Text>
        <TextInput
          style={styles.input}
          value={weightInput}
          onChangeText={setWeightInput}
          placeholder="Weight (kg)"
          placeholderTextColor={theme.colors.muted}
          keyboardType="numeric"
        />
        <Pressable style={styles.primaryButton} onPress={handleAddWeight}>
          <Text style={styles.primaryButtonText}>Add weight</Text>
        </Pressable>
        {weights.slice(-30).map((entry) => (
          <Text key={entry.id} style={styles.meta}>
            {entry.date}: {entry.weightKg} kg
          </Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Activity (manual)</Text>
        <TextInput
          style={styles.input}
          value={activityInput}
          onChangeText={setActivityInput}
          placeholder="Calories burned"
          placeholderTextColor={theme.colors.muted}
          keyboardType="numeric"
        />
        <Pressable style={styles.primaryButton} onPress={handleAddActivity}>
          <Text style={styles.primaryButtonText}>Add activity</Text>
        </Pressable>
        {activities.slice(-30).map((entry) => (
          <Text key={entry.id} style={styles.meta}>
            {entry.date}: {entry.caloriesBurned} kcal
          </Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Enable halal check</Text>
          <Switch
            value={prefs.halalCheckEnabled}
            onValueChange={(value) => setPrefs((prev) => ({ ...prev, halalCheckEnabled: value }))}
          />
        </View>

        <Text style={styles.label}>Low sodium limit (mg)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={prefs.lowSodiumMgLimit?.toString() || ""}
          onChangeText={(value) =>
            setPrefs((prev) => ({ ...prev, lowSodiumMgLimit: toNumberOrNull(value) }))
          }
          placeholder="e.g. 200"
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={styles.label}>Low sugar limit (g)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={prefs.lowSugarGlimit?.toString() || ""}
          onChangeText={(value) =>
            setPrefs((prev) => ({ ...prev, lowSugarGlimit: toNumberOrNull(value) }))
          }
          placeholder="e.g. 10"
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={styles.label}>Low carb limit (g)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={prefs.lowCarbGlimit?.toString() || ""}
          onChangeText={(value) =>
            setPrefs((prev) => ({ ...prev, lowCarbGlimit: toNumberOrNull(value) }))
          }
          placeholder="e.g. 30"
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={styles.label}>Low calorie limit (per 50g)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={prefs.lowCalorieLimit?.toString() || ""}
          onChangeText={(value) =>
            setPrefs((prev) => ({ ...prev, lowCalorieLimit: toNumberOrNull(value) }))
          }
          placeholder="e.g. 150"
          placeholderTextColor={theme.colors.muted}
        />

        <Text style={styles.label}>High protein target (g)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={prefs.highProteinGtarget?.toString() || ""}
          onChangeText={(value) =>
            setPrefs((prev) => ({ ...prev, highProteinGtarget: toNumberOrNull(value) }))
          }
          placeholder="e.g. 12"
          placeholderTextColor={theme.colors.muted}
        />

        <View style={styles.switchRow}>
          <Text style={styles.label}>Vegetarian</Text>
          <Switch
            value={!!prefs.vegetarian}
            onValueChange={(value) => setPrefs((prev) => ({ ...prev, vegetarian: value }))}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.label}>Vegan</Text>
          <Switch
            value={!!prefs.vegan}
            onValueChange={(value) => setPrefs((prev) => ({ ...prev, vegan: value }))}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.label}>Sensitive stomach</Text>
          <Switch
            value={!!prefs.sensitiveStomach}
            onValueChange={(value) => setPrefs((prev) => ({ ...prev, sensitiveStomach: value }))}
          />
        </View>
      </View>

      <Pressable style={styles.primaryButton} onPress={handleSave}>
        <Text style={styles.primaryButtonText}>Save</Text>
      </Pressable>
      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
      {status ? <Text style={styles.status}>{status}</Text> : null}
      <Text style={styles.disclaimer}>Educational, not medical advice.</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: theme.colors.bg
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 6
  },
  subtitle: {
    color: theme.colors.muted,
    marginBottom: 16
  },
  card: {
    backgroundColor: theme.colors.panel,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 12
  },
  planRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10
  },
  planButton: {
    borderWidth: 1,
    borderColor: theme.colors.panelAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  planButtonText: {
    color: theme.colors.text,
    fontSize: 12
  },
  label: {
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 6
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.panelAlt,
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 16,
    color: theme.colors.text
  },
  readonly: {
    color: theme.colors.muted,
    marginBottom: 16
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 8
  },
  primaryButtonText: {
    color: "#02130c",
    fontWeight: "700"
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: theme.colors.panelAlt,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 12
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
