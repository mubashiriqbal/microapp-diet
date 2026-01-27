import { useContext, useEffect, useState } from "react"
import { View, Text, TextInput, StyleSheet, Pressable, Switch, ScrollView } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Picker } from "@react-native-picker/picker"
import * as Notifications from "expo-notifications"
import { fetchPrefs, fetchProfile, saveProfile, updatePrefs } from "../api/client"
import {
  clearAuth,
  getHealthPrefs,
  getProfile,
  getUserPrefs,
  setHealthPrefs,
  setProfile,
  setUserPrefs
} from "../storage/cache"
import type {
  ActivityEntry,
  Plan,
  TrackingGoals,
  UserPrefs,
  UserProfile,
  WeightEntry
} from "@wimf/shared"
import { theme } from "../theme"
import { AuthContext } from "../auth"
import MultiSelect from "../components/MultiSelect"
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

export default function SettingsScreen() {
  const { setIsAuthed } = useContext(AuthContext)
  const [profile, setProfileState] = useState<UserProfile | null>(null)
  const [countryCode, setCountryCode] = useState("+1")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [restrictions, setRestrictions] = useState<string[]>([])
  const [allergens, setAllergens] = useState<string[]>([])
  const [prefs, setPrefs] = useState<UserPrefs>(emptyPrefs)
  const [goals, setGoalsState] = useState<TrackingGoals>({
    caloriesTarget: 2000,
    proteinTarget: 80,
    sodiumLimit: 2000,
    sugarLimit: 50
  })
  const [plans, setPlansState] = useState<Plan[]>([])
  const [activePlanId, setActivePlanIdState] = useState<string | null>(null)
  const [planName, setPlanName] = useState("")
  const [reminders, setRemindersState] = useState({ enabled: false, times: [] as string[] })
  const [reminderInput, setReminderInput] = useState("")
  const [weights, setWeightsState] = useState<WeightEntry[]>([])
  const [weightInput, setWeightInput] = useState("")
  const [activities, setActivitiesState] = useState<ActivityEntry[]>([])
  const [activityInput, setActivityInput] = useState("")
  const [status, setStatus] = useState("")

  useEffect(() => {
    const load = async () => {
      const cachedProfile = await getProfile()
      if (cachedProfile) {
        setProfileState(cachedProfile)
        if (cachedProfile.mobileNumber) {
          const match = cachedProfile.mobileNumber.match(/^(\+\d+)\s*(.*)$/)
          if (match) {
            setCountryCode(match[1])
            setPhoneNumber(match[2])
          } else {
            setPhoneNumber(cachedProfile.mobileNumber)
          }
        }
      }
      const cached = await getUserPrefs()
      if (cached) {
        setPrefs({ ...emptyPrefs, ...cached })
      }
      try {
        const profileData = await fetchProfile()
        setProfileState(profileData)
        setProfile(profileData)
        if (profileData.mobileNumber) {
          const match = profileData.mobileNumber.match(/^(\+\d+)\s*(.*)$/)
          if (match) {
            setCountryCode(match[1])
            setPhoneNumber(match[2])
          } else {
            setPhoneNumber(profileData.mobileNumber)
          }
        }
        const [remotePrefs] = await Promise.all([fetchPrefs(profileData.id)])
        setPrefs({ ...emptyPrefs, ...remotePrefs })
        setUserPrefs(remotePrefs)
      } catch {
        // keep cached values
      }

      const [storedGoals, storedPlans, storedActivePlan, storedReminders, storedWeights, storedActivities] =
        await Promise.all([
          getGoals(),
          getPlans(),
          getActivePlanId(),
          getReminders(),
          getWeights(),
          getActivities()
        ])
      setGoalsState(storedGoals)
      setPlansState(storedPlans)
      setActivePlanIdState(storedActivePlan)
      setRemindersState(storedReminders)
      setWeightsState(storedWeights)
      setActivitiesState(storedActivities)

      const storedHealth = await getHealthPrefs()
      setRestrictions(storedHealth.restrictions)
      setAllergens(storedHealth.allergens)
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
      await setHealthPrefs({ restrictions, allergens })
      setStatus("Saved")
    } catch {
      setStatus("Saved locally.")
      await setUserPrefs(prefs)
      await setHealthPrefs({ restrictions, allergens })
    }
  }

  const handleGoalsSave = async () => {
    await setGoals(goals)
    setStatus("Goals saved locally.")
  }

  const handleCreatePlan = async () => {
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
    await setPlans(updated)
    setPlansState(updated)
    setPlanName("")
    setStatus("Plan created.")
  }

  const handleActivatePlan = async (planId: string) => {
    await setActivePlan(planId)
    setActivePlanIdState(planId)
    const plan = plans.find((item) => item.id === planId)
    if (plan) {
      setGoalsState(plan.goals)
      await setGoals(plan.goals)
      setStatus("Plan activated.")
    }
  }

  const handleReminderSave = async () => {
    await setReminders(reminders)
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

  const handleAddReminderTime = () => {
    const trimmed = reminderInput.trim()
    if (!trimmed) return
    if (!reminders.times.includes(trimmed)) {
      setRemindersState((prev) => ({ ...prev, times: [...prev.times, trimmed] }))
    }
    setReminderInput("")
  }

  const handleRemoveReminderTime = (time: string) => {
    setRemindersState((prev) => ({
      ...prev,
      times: prev.times.filter((item) => item !== time)
    }))
  }

  const handleAddWeight = () => {
    const value = Number(weightInput)
    if (!Number.isFinite(value)) {
      setStatus("Enter a valid weight.")
      return
    }
    const entry = { id: `${Date.now()}`, date: new Date().toISOString().slice(0, 10), weightKg: value }
    addWeight(entry).then((updated) => {
      setWeightsState(updated)
      setWeightInput("")
      setStatus("Weight logged.")
    })
  }

  const handleAddActivity = () => {
    const value = Number(activityInput)
    if (!Number.isFinite(value)) {
      setStatus("Enter valid calories.")
      return
    }
    const entry = { id: `${Date.now()}`, date: new Date().toISOString().slice(0, 10), caloriesBurned: value }
    addActivity(entry).then((updated) => {
      setActivitiesState(updated)
      setActivityInput("")
      setStatus("Activity logged.")
    })
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
          <View style={styles.phoneRow}>
            <TextInput
              style={styles.codeInput}
              value={countryCode}
              onChangeText={(value) => {
                setCountryCode(value)
                setProfileState({ ...profile, mobileNumber: `${value} ${phoneNumber}`.trim() })
              }}
              placeholder="+1"
              placeholderTextColor={theme.colors.muted}
            />
            <TextInput
              style={styles.phoneInput}
              value={phoneNumber}
              onChangeText={(value) => {
                setPhoneNumber(value)
                setProfileState({ ...profile, mobileNumber: `${countryCode} ${value}`.trim() })
              }}
              placeholder="Mobile number"
              placeholderTextColor={theme.colors.muted}
              keyboardType="phone-pad"
            />
          </View>
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
          <Text style={styles.label}>Gender</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={profile.gender ?? "other"}
              onValueChange={(value) =>
                setProfileState({ ...profile, gender: value as UserProfile["gender"] })
              }
            >
              <Picker.Item label="Male" value="male" />
              <Picker.Item label="Female" value="female" />
              <Picker.Item label="Other" value="other" />
            </Picker>
          </View>

          <Text style={styles.label}>Activity level</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={profile.activityLevel ?? "moderate"}
              onValueChange={(value) =>
                setProfileState({ ...profile, activityLevel: value as UserProfile["activityLevel"] })
              }
            >
              <Picker.Item label="Sedentary" value="sedentary" />
              <Picker.Item label="Light" value="light" />
              <Picker.Item label="Moderate" value="moderate" />
              <Picker.Item label="Active" value="active" />
            </Picker>
          </View>

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
        <Text style={styles.sectionTitle}>Common dietary restrictions</Text>
        <MultiSelect
          label="Select restrictions"
          options={restrictionOptions}
          selected={restrictions}
          onChange={setRestrictions}
          placeholder="Search dietary restrictions"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Allergens</Text>
        <MultiSelect
          label="Select allergens"
          options={allergenOptions}
          selected={allergens}
          onChange={setAllergens}
          placeholder="Search allergens"
        />
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
        <View style={styles.reminderHeader}>
          <View>
            <Text style={styles.label}>Meal reminders</Text>
            <Text style={styles.helperText}>Choose times to nudge meal logging.</Text>
          </View>
          <Switch
            value={reminders.enabled}
            onValueChange={(value) =>
              setRemindersState((prev) => ({ ...prev, enabled: value }))
            }
          />
        </View>

        <View style={styles.reminderInputRow}>
          <TextInput
            style={styles.reminderInput}
            value={reminderInput}
            onChangeText={setReminderInput}
            placeholder="Add time (e.g., 08:00)"
            placeholderTextColor={theme.colors.muted}
          />
          <Pressable style={styles.addTimeButton} onPress={handleAddReminderTime}>
            <Text style={styles.addTimeText}>Add</Text>
          </Pressable>
        </View>

        <View style={styles.reminderChips}>
          {reminders.times.length === 0 ? (
            <Text style={styles.bodyMuted}>No reminder times yet.</Text>
          ) : (
            reminders.times.map((time) => (
              <Pressable
                key={time}
                style={styles.reminderChip}
                onPress={() => handleRemoveReminderTime(time)}
              >
                <Text style={styles.reminderChipText}>{time}</Text>
                <Ionicons name="close" size={14} color={theme.colors.muted} />
              </Pressable>
            ))
          )}
        </View>

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
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 6,
    fontFamily: theme.font.heading
  },
  subtitle: {
    color: theme.colors.muted,
    marginBottom: theme.spacing.md
  },
  card: {
    backgroundColor: theme.colors.glass,
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
  planRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10
  },
  planButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 12,
    marginBottom: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.glassStrong
  },
  phoneRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16
  },
  codeInput: {
    width: 80,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 12,
    color: theme.colors.text,
    backgroundColor: theme.colors.glassStrong
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 12,
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
  reminderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  helperText: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: 4
  },
  reminderInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12
  },
  reminderInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.glassStrong,
    color: theme.colors.text
  },
  addTimeButton: {
    backgroundColor: theme.colors.accent2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999
  },
  addTimeText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12
  },
  reminderChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12
  },
  reminderChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.panelAlt
  },
  reminderChipText: {
    color: theme.colors.text,
    fontSize: 12
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
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
