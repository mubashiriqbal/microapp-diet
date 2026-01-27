import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import {
  getPrefs,
  getProfile,
  savePrefs,
  updateProfile
} from "@wimf/shared"
import type { UserPrefs, UserProfile } from "@wimf/shared"
import { getToken } from "../lib/auth"
import { getHealthPrefs, setHealthPrefs } from "../lib/healthPrefs"
import { getProfilePrefs, setProfilePrefs } from "../lib/profilePrefs"
import {
  addActivity,
  addWeight,
  getActivePlanId,
  getActivities,
  getGoals,
  getPlans,
  getReminders,
  getWeights,
  setActivePlan,
  setGoals,
  setPlans,
  setReminders
} from "../lib/tracking"

const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"

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

export default function Settings() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [prefs, setPrefs] = useState<UserPrefs>(emptyPrefs)
  const [profilePrefs, setProfilePrefsState] = useState(getProfilePrefs())
  const [goals, setGoalsState] = useState(getGoals())
  const [plans, setPlansState] = useState(getPlans())
  const [activePlanId, setActivePlanIdState] = useState(getActivePlanId())
  const [planName, setPlanName] = useState("")
  const [reminders, setRemindersState] = useState(getReminders())
  const [weights, setWeightsState] = useState(getWeights())
  const [activities, setActivitiesState] = useState(getActivities())
  const [weightInput, setWeightInput] = useState("")
  const [activityInput, setActivityInput] = useState("")
  const [status, setStatus] = useState("")

  useEffect(() => {
    const storedToken = getToken()
    if (!storedToken) {
      router.push("/login")
      return
    }
    setToken(storedToken)
  }, [router])

  useEffect(() => {
    if (!token) return
    const load = async () => {
      try {
        const profileData = await getProfile({ baseUrl: apiBase, token })
        const [prefsData] = await Promise.all([
          getPrefs({ baseUrl: apiBase, token }, profileData.id).catch(() => null)
        ])
        setProfile(profileData)
        if (prefsData) {
          setPrefs({ ...prefsData })
        }
        const storedHealth = getHealthPrefs()
        const storedProfilePrefs = getProfilePrefs()
        setProfilePrefsState({
          ...storedProfilePrefs,
          allergyOther: storedProfilePrefs.allergyOther || storedHealth.allergyOther || "",
          dietary: {
            ...storedProfilePrefs.dietary,
            ...Object.fromEntries(storedHealth.restrictions.map((item) => [item, true]))
          },
          allergies: {
            ...storedProfilePrefs.allergies,
            ...Object.fromEntries(storedHealth.allergens.map((item) => [item, true]))
          }
        })
      } catch {
        setStatus("Unable to load profile.")
      }
    }

    load()
  }, [token])

  const dietaryToggles = [
    { key: "halal", label: "Halal" },
    { key: "kosher", label: "Kosher" },
    { key: "vegetarian", label: "Vegetarian" },
    { key: "vegan", label: "Vegan" },
    { key: "pescatarian", label: "Pescatarian" },
    { key: "keto", label: "Keto" },
    { key: "low_carb", label: "Low Carb" },
    { key: "low_sodium", label: "Low Sodium" },
    { key: "low_sugar", label: "Low Sugar" },
    { key: "high_protein", label: "High Protein" },
    { key: "gluten_free", label: "Gluten-Free" },
    { key: "dairy_free", label: "Dairy-Free" }
  ]

  const allergyChecks = [
    { key: "peanuts", label: "Peanuts" },
    { key: "tree_nuts", label: "Tree Nuts" },
    { key: "dairy", label: "Dairy" },
    { key: "eggs", label: "Eggs" },
    { key: "shellfish", label: "Shellfish" },
    { key: "fish", label: "Fish" },
    { key: "soy", label: "Soy" },
    { key: "wheat_gluten", label: "Wheat / Gluten" },
    { key: "sesame", label: "Sesame" },
    { key: "sulfites", label: "Sulfites" }
  ]

  const alertToggles = [
    { key: "highRisk", label: "High-Risk Ingredients" },
    { key: "allergenDetected", label: "Allergen Detected" },
    { key: "nonCompliant", label: "Non-Compliant Food (e.g. not Halal)" },
    { key: "processed", label: "Highly Processed Foods" },
    { key: "highSodiumSugar", label: "High Sodium / Sugar" },
    { key: "push", label: "Push Notifications" },
    { key: "email", label: "Email Alerts" },
    { key: "sms", label: "SMS Alerts" }
  ]

  const sensitivityToggles = [
    { key: "hypertension", label: "Hypertension-friendly" },
    { key: "diabetic", label: "Diabetic-friendly" },
    { key: "heartHealthy", label: "Heart-healthy" },
    { key: "weightLoss", label: "Weight-loss focused" }
  ]

  const handleProfileSave = async () => {
    if (!token || !profile) return
    setStatus("Saving profile...")
    try {
      const saved = await updateProfile({ baseUrl: apiBase, token }, profile)
      setProfile(saved)
      setStatus("Profile updated.")
    } catch (error) {
      setStatus((error as Error).message)
    }
  }

  const handlePrefsSave = async () => {
    if (!token || !profile) return
    setStatus("Saving preferences...")
    try {
      const nextPrefs = {
        ...prefs,
        userId: profile.id,
        halalCheckEnabled: !!profilePrefs.dietary?.halal,
        vegetarian: !!profilePrefs.dietary?.vegetarian,
        vegan: !!profilePrefs.dietary?.vegan
      }
      const saved = await savePrefs({ baseUrl: apiBase, token }, nextPrefs)
      setPrefs(saved)
      setStatus("Preferences saved.")
    } catch (error) {
      setStatus((error as Error).message)
    }
  }

  const handleGoalsSave = () => {
    setGoals(goals)
    setStatus("Goals updated.")
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

  const handleReminderSave = () => {
    setReminders(reminders)
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
      setStatus("Enter a valid calorie value.")
      return
    }
    const entry = { id: `${Date.now()}`, date: new Date().toISOString().slice(0, 10), caloriesBurned: value }
    const updated = addActivity(entry)
    setActivitiesState(updated)
    setActivityInput("")
    setStatus("Activity logged.")
  }

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

  const handlePhoto = (file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setProfilePrefsState((prev) => ({ ...prev, photoUri: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const handleHealthSave = () => {
    const restrictions = Object.entries(profilePrefs.dietary || {})
      .filter(([, value]) => value)
      .map(([key]) => key)
    const allergens = Object.entries(profilePrefs.allergies || {})
      .filter(([, value]) => value)
      .map(([key]) => key)
    setHealthPrefs({ restrictions, allergens, allergyOther: profilePrefs.allergyOther || "" })
    setProfilePrefs(profilePrefs)
    setStatus("Profile preferences saved locally.")
  }

  if (!profile) {
    return (
      <main className="container page-shell">
        <div className="text-muted">Loading profile...</div>
      </main>
    )
  }

  return (
    <main className="container page-shell">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="mb-1">Profile</h1>
          <div className="text-muted">Manage your preferences and alerts.</div>
        </div>
        <span className="chip">SafePlate AI</span>
      </div>

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="glass-card mb-3">
            <h2 className="h5 mb-3">Personal information</h2>
            <div className="d-flex align-items-center gap-3 mb-3">
              <div
                className="rounded-circle border d-flex align-items-center justify-content-center"
                style={{ width: 64, height: 64, overflow: "hidden" }}
              >
                {profilePrefs.photoUri ? (
                  <img src={profilePrefs.photoUri} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span className="text-muted small">Photo</span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                className="form-control"
                onChange={(event) => handlePhoto(event.target.files?.[0] || null)}
              />
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Full name</label>
                <input
                  className="form-control"
                  value={profile.fullName ?? ""}
                  onChange={(event) =>
                    setProfile((prev) => (prev ? { ...prev, fullName: event.target.value } : prev))
                  }
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Mobile number</label>
                <input
                  className="form-control"
                  value={profile.mobileNumber ?? ""}
                  onChange={(event) =>
                    setProfile((prev) =>
                      prev ? { ...prev, mobileNumber: event.target.value } : prev
                    )
                  }
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Age</label>
                <input
                  className="form-control"
                  value={profile.age ?? ""}
                  onChange={(event) =>
                    setProfile((prev) =>
                      prev ? { ...prev, age: toNumberOrNull(event.target.value) ?? undefined } : prev
                    )
                  }
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Date of birth</label>
                <input
                  className="form-control"
                  value={profilePrefs.dob ?? ""}
                  onChange={(event) =>
                    setProfilePrefsState((prev) => ({ ...prev, dob: event.target.value }))
                  }
                  placeholder="YYYY-MM-DD"
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Country</label>
                <input
                  className="form-control"
                  value={profilePrefs.country ?? ""}
                  onChange={(event) =>
                    setProfilePrefsState((prev) => ({ ...prev, country: event.target.value }))
                  }
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Gender</label>
                <select
                  className="form-select"
                  value={profile.gender ?? ""}
                  onChange={(event) =>
                    setProfile((prev) =>
                      prev ? { ...prev, gender: event.target.value as UserProfile["gender"] } : prev
                    )
                  }
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Race (optional)</label>
                <input
                  className="form-control"
                  value={profile.race ?? ""}
                  onChange={(event) =>
                    setProfile((prev) => (prev ? { ...prev, race: event.target.value } : prev))
                  }
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Height (cm)</label>
                <input
                  className="form-control"
                  value={profile.heightCm ?? ""}
                  onChange={(event) =>
                    setProfile((prev) =>
                      prev ? { ...prev, heightCm: toNumberOrNull(event.target.value) ?? undefined } : prev
                    )
                  }
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Weight (kg)</label>
                <input
                  className="form-control"
                  value={profile.weightKg ?? ""}
                  onChange={(event) =>
                    setProfile((prev) =>
                      prev ? { ...prev, weightKg: toNumberOrNull(event.target.value) ?? undefined } : prev
                    )
                  }
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Activity level</label>
                <select
                  className="form-select"
                  value={profile.activityLevel ?? ""}
                  onChange={(event) =>
                    setProfile((prev) =>
                      prev
                        ? {
                            ...prev,
                            activityLevel: event.target.value as UserProfile["activityLevel"]
                          }
                        : prev
                    )
                  }
                >
                  <option value="">Select</option>
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Light</option>
                  <option value="moderate">Moderate</option>
                  <option value="active">Active</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Dietary preference</label>
                <select
                  className="form-select"
                  value={profile.dietaryPreference ?? "none"}
                  onChange={(event) =>
                    setProfile((prev) =>
                      prev
                        ? {
                            ...prev,
                            dietaryPreference: event.target.value as UserProfile["dietaryPreference"]
                          }
                        : prev
                    )
                  }
                >
                  <option value="none">None</option>
                  <option value="halal">Halal</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Daily calorie goal</label>
                <input className="form-control" value={profile.dailyCalorieGoal ?? ""} disabled />
              </div>
            </div>
            <button className="btn btn-primary mt-3" onClick={handleProfileSave}>
              Save profile
            </button>
          </div>

          <div className="glass-card mb-3">
            <h2 className="h5 mb-3">Dietary restrictions</h2>
            <div className="row g-2">
              {dietaryToggles.map((item) => (
                <div className="col-md-6" key={item.key}>
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={!!profilePrefs.dietary?.[item.key]}
                      onChange={(event) => setDietaryToggle(item.key, event.target.checked)}
                    />
                    <label className="form-check-label">{item.label}</label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card mb-3">
            <h2 className="h5 mb-3">Allergies & intolerances</h2>
            <div className="row g-2">
              {allergyChecks.map((item) => (
                <div className="col-md-6" key={item.key}>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={!!profilePrefs.allergies?.[item.key]}
                      onChange={(event) => setAllergyToggle(item.key, event.target.checked)}
                    />
                    <label className="form-check-label">{item.label}</label>
                  </div>
                </div>
              ))}
            </div>
            <label className="form-label mt-3">Other (custom)</label>
            <input
              className="form-control"
              value={profilePrefs.allergyOther ?? ""}
              onChange={(event) =>
                setProfilePrefsState((prev) => ({ ...prev, allergyOther: event.target.value }))
              }
            />
            <button className="btn btn-primary mt-3" onClick={handleHealthSave}>
              Save profile preferences
            </button>
          </div>

          <div className="glass-card">
            <h2 className="h5 mb-3">Alert preferences</h2>
            <div className="row g-2">
              {alertToggles.map((item) => (
                <div className="col-md-6" key={item.key}>
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={!!profilePrefs.alerts?.[item.key]}
                      onChange={(event) => setAlertToggle(item.key, event.target.checked)}
                    />
                    <label className="form-check-label">{item.label}</label>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-primary mt-3" onClick={handlePrefsSave}>
              Save preferences
            </button>
          </div>

          <div className="glass-card mt-3">
            <h2 className="h5 mb-3">Health sensitivities</h2>
            <div className="row g-2">
              {sensitivityToggles.map((item) => (
                <div className="col-md-6" key={item.key}>
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={!!profilePrefs.sensitivities?.[item.key]}
                      onChange={(event) => setSensitivityToggle(item.key, event.target.checked)}
                    />
                    <label className="form-check-label">{item.label}</label>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-muted small mt-2">
              This app does not provide medical advice.
            </div>
          </div>

          <div className="glass-card mt-3">
            <h2 className="h5 mb-3">Scoring preferences</h2>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Prioritize allergies</label>
                <input
                  className="form-control"
                  value={profilePrefs.scoring.allergies}
                  onChange={(event) =>
                    setScoringValue("allergies", Number(event.target.value) || 0)
                  }
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Prioritize dietary rules</label>
                <input
                  className="form-control"
                  value={profilePrefs.scoring.dietary}
                  onChange={(event) =>
                    setScoringValue("dietary", Number(event.target.value) || 0)
                  }
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Prioritize processing</label>
                <input
                  className="form-control"
                  value={profilePrefs.scoring.processing}
                  onChange={(event) =>
                    setScoringValue("processing", Number(event.target.value) || 0)
                  }
                />
              </div>
            </div>
            <div className="form-check form-switch mt-3">
              <input
                className="form-check-input"
                type="checkbox"
                checked={profilePrefs.scoring.strictMode}
                onChange={(event) =>
                  setProfilePrefsState((prev) => ({
                    ...prev,
                    scoring: { ...prev.scoring, strictMode: event.target.checked }
                  }))
                }
              />
              <label className="form-check-label">Strict mode</label>
            </div>
          </div>

          <div className="glass-card mt-3">
            <h2 className="h5 mb-3">Goals & limits</h2>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Daily calories</label>
                <input
                  className="form-control"
                  value={goals.caloriesTarget}
                  onChange={(event) =>
                    setGoalsState((prev) => ({ ...prev, caloriesTarget: Number(event.target.value) }))
                  }
                />
              </div>
            </div>
            <button className="btn btn-outline-light mt-3" onClick={handleGoalsSave}>
              Save goals
            </button>
          </div>

          <div className="glass-card mt-3">
            <h2 className="h5 mb-3">Plans</h2>
            <div className="d-flex gap-2 mb-3">
              <input
                className="form-control"
                placeholder="Plan name"
                value={planName}
                onChange={(event) => setPlanName(event.target.value)}
              />
              <button className="btn btn-primary" onClick={handleCreatePlan}>
                Create
              </button>
            </div>
            {plans.length === 0 && <div className="text-muted">No plans yet.</div>}
            {plans.map((plan) => (
              <div className="d-flex justify-content-between align-items-center mb-2" key={plan.id}>
                <div>
                  <div className="fw-semibold">{plan.name}</div>
                  <div className="text-muted small">Calories {plan.goals.caloriesTarget}</div>
                </div>
                <button
                  className={`btn btn-sm ${activePlanId === plan.id ? "btn-primary" : "btn-outline-light"}`}
                  onClick={() => handleActivatePlan(plan.id)}
                >
                  {activePlanId === plan.id ? "Active" : "Activate"}
                </button>
              </div>
            ))}
          </div>

          <div className="glass-card mt-3">
            <h2 className="h5 mb-3">Reminders</h2>
            <div className="form-check form-switch mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                checked={reminders.enabled}
                onChange={(event) =>
                  setRemindersState((prev) => ({ ...prev, enabled: event.target.checked }))
                }
              />
              <label className="form-check-label">Enable reminders</label>
            </div>
            <label className="form-label">Reminder times (comma-separated HH:MM)</label>
            <input
              className="form-control"
              value={reminders.times.join(", ")}
              onChange={(event) =>
                setRemindersState((prev) => ({
                  ...prev,
                  times: event.target.value
                    .split(",")
                    .map((time) => time.trim())
                    .filter(Boolean)
                }))
              }
            />
            <button className="btn btn-outline-light mt-3" onClick={handleReminderSave}>
              Save reminders
            </button>
          </div>

          <div className="glass-card mt-3">
            <h2 className="h5 mb-3">Weight</h2>
            <div className="d-flex gap-2 mb-3">
              <input
                className="form-control"
                placeholder="Weight (kg)"
                value={weightInput}
                onChange={(event) => setWeightInput(event.target.value)}
              />
              <button className="btn btn-outline-light" onClick={handleAddWeight}>
                Add
              </button>
            </div>
            {weights.slice(-30).map((entry) => (
              <div className="text-muted small" key={entry.id}>
                {entry.date}: {entry.weightKg} kg
              </div>
            ))}
          </div>

          <div className="glass-card mt-3">
            <h2 className="h5 mb-3">Activity (manual)</h2>
            <div className="d-flex gap-2 mb-3">
              <input
                className="form-control"
                placeholder="Calories burned"
                value={activityInput}
                onChange={(event) => setActivityInput(event.target.value)}
              />
              <button className="btn btn-outline-light" onClick={handleAddActivity}>
                Add
              </button>
            </div>
            {activities.slice(-30).map((entry) => (
              <div className="text-muted small" key={entry.id}>
                {entry.date}: {entry.caloriesBurned} kcal
              </div>
            ))}
          </div>
        </div>

        <div className="col-lg-5">
          <div className="metric-card">
            <div className="text-muted small">Disclaimer</div>
            <div className="fw-semibold">Educational, not medical advice.</div>
            <div className="text-muted small mt-2">
              Preferences adjust flags only. They never change the base score.
            </div>
          </div>
        </div>
      </div>

      {status && <div className="text-muted mt-3">{status}</div>}
    </main>
  )
}
