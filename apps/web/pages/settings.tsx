import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { getPrefs, getProfile, savePrefs, updateProfile } from "@wimf/shared"
import type { UserPrefs, UserProfile } from "@wimf/shared"
import { getToken } from "../lib/auth"
import { getHealthPrefs, setHealthPrefs } from "../lib/healthPrefs"
import { getProfilePrefs, setProfilePrefs } from "../lib/profilePrefs"

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

const countryOptions = ["United States", "United Kingdom", "Pakistan", "United Arab Emirates", "Saudi Arabia", "Canada", "Australia"]
const countryCodes = ["+1", "+44", "+92", "+971", "+966", "+61"]

const dietaryToggles = [
  { key: "halal", label: "Halal", icon: "H", color: "#1ABC9C" },
  { key: "kosher", label: "Kosher", icon: "K", color: "#2C7BE5" },
  { key: "vegetarian", label: "Vegetarian", icon: "V", color: "#22C55E" },
  { key: "vegan", label: "Vegan", icon: "Vg", color: "#16A34A" },
  { key: "pescatarian", label: "Pescatarian", icon: "P", color: "#3B82F6" },
  { key: "keto", label: "Keto", icon: "K", color: "#F97316" },
  { key: "low_carb", label: "Low Carb", icon: "LC", color: "#14B8A6" },
  { key: "low_sodium", label: "Low Sodium", icon: "LS", color: "#0EA5E9" },
  { key: "low_sugar", label: "Low Sugar", icon: "LS", color: "#E11D48" },
  { key: "high_protein", label: "High Protein", icon: "HP", color: "#2563EB" },
  { key: "gluten_free", label: "Gluten-Free", icon: "G", color: "#F59E0B" },
  { key: "dairy_free", label: "Dairy-Free", icon: "D", color: "#8B5CF6" }
]

const allergyChecks = [
  { key: "peanuts", label: "Peanuts", icon: "P", color: "#E63946" },
  { key: "tree_nuts", label: "Tree Nuts", icon: "TN", color: "#B45309" },
  { key: "dairy", label: "Dairy", icon: "D", color: "#2563EB" },
  { key: "eggs", label: "Eggs", icon: "E", color: "#F59E0B" },
  { key: "shellfish", label: "Shellfish", icon: "S", color: "#EF4444" },
  { key: "fish", label: "Fish", icon: "F", color: "#3B82F6" },
  { key: "soy", label: "Soy", icon: "S", color: "#22C55E" },
  { key: "wheat_gluten", label: "Wheat / Gluten", icon: "W", color: "#F97316" },
  { key: "sesame", label: "Sesame", icon: "Se", color: "#F59E0B" },
  { key: "sulfites", label: "Sulfites", icon: "Su", color: "#EF4444" }
]

const alertToggles = [
  { key: "highRisk", label: "High-Risk Ingredients" },
  { key: "allergenDetected", label: "Allergen Detected" },
  { key: "nonCompliant", label: "Non-Compliant Food" },
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
  const [countryCode, setCountryCode] = useState("+1")
  const [phoneNumber, setPhoneNumber] = useState("")
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
        const prefsData = await getPrefs({ baseUrl: apiBase, token }, profileData.id).catch(() => null)
        setProfile(profileData)
        if (prefsData) {
          setPrefs({ ...prefsData })
        }
        if (profileData.mobileNumber) {
          const match = profileData.mobileNumber.match(/^(\+\d+)\s*(.*)$/)
          if (match) {
            setCountryCode(match[1])
            setPhoneNumber(match[2])
          } else {
            setPhoneNumber(profileData.mobileNumber)
          }
        }
        const storedHealth = getHealthPrefs()
        const storedProfilePrefs = getProfilePrefs()
        setProfilePrefsState({
          ...storedProfilePrefs,
          dietaryOther: storedProfilePrefs.dietaryOther || "",
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

  const handleProfileSave = async () => {
    if (!token || !profile) return
    setStatus("Saving profile...")
    try {
      const payload = {
        ...profile,
        mobileNumber: `${countryCode} ${phoneNumber}`.trim()
      }
      const saved = await updateProfile({ baseUrl: apiBase, token }, payload)
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
      const restrictions = Object.entries(profilePrefs.dietary || {})
        .filter(([, value]) => value)
        .map(([key]) => key)
      if (profilePrefs.dietaryOther?.trim()) {
        restrictions.push(profilePrefs.dietaryOther.trim())
      }
      const allergens = Object.entries(profilePrefs.allergies || {})
        .filter(([, value]) => value)
        .map(([key]) => key)
      setHealthPrefs({ restrictions, allergens, allergyOther: profilePrefs.allergyOther || "" })
      setProfilePrefs(profilePrefs)
      setStatus("Preferences saved locally.")
    } catch (error) {
      setStatus((error as Error).message)
    }
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
                <label className="form-label">Email address</label>
                <input className="form-control" value={profile.email ?? ""} disabled />
              </div>
              <div className="col-md-6">
                <label className="form-label">Phone number</label>
                <div className="input-group">
                  <select
                    className="form-select"
                    style={{ maxWidth: 120 }}
                    value={countryCode}
                    onChange={(event) => {
                      setCountryCode(event.target.value)
                      setProfile((prev) =>
                        prev ? { ...prev, mobileNumber: `${event.target.value} ${phoneNumber}`.trim() } : prev
                      )
                    }}
                  >
                    {countryCodes.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                  <input
                    className="form-control"
                    value={phoneNumber}
                    onChange={(event) => {
                      setPhoneNumber(event.target.value)
                      setProfile((prev) =>
                        prev ? { ...prev, mobileNumber: `${countryCode} ${event.target.value}`.trim() } : prev
                      )
                    }}
                  />
                </div>
              </div>
              <div className="col-md-6">
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
              <div className="col-md-6">
                <label className="form-label">Country</label>
                <select
                  className="form-select"
                  value={profilePrefs.country ?? ""}
                  onChange={(event) =>
                    setProfilePrefsState((prev) => ({ ...prev, country: event.target.value }))
                  }
                >
                  {countryOptions.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
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
              <div className="col-md-6">
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
              <div className="col-md-6">
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
              <div className="col-md-6">
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
                  <div className="form-check form-switch d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-2">
                      <span className="pref-icon" style={{ backgroundColor: item.color }}>{item.icon}</span>
                      <label className="form-check-label">{item.label}</label>
                    </div>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={!!profilePrefs.dietary?.[item.key]}
                      onChange={(event) => setDietaryToggle(item.key, event.target.checked)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <label className="form-label mt-3">Other (custom)</label>
            <input
              className="form-control"
              value={profilePrefs.dietaryOther ?? ""}
              onChange={(event) =>
                setProfilePrefsState((prev) => ({ ...prev, dietaryOther: event.target.value }))
              }
              placeholder="Add custom restriction"
            />
          </div>

          <div className="glass-card mb-3">
            <h2 className="h5 mb-3">Allergies & intolerances</h2>
            <div className="row g-2">
              {allergyChecks.map((item) => (
                <div className="col-md-6" key={item.key}>
                  <div className="form-check d-flex align-items-center gap-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={!!profilePrefs.allergies?.[item.key]}
                      onChange={(event) => setAllergyToggle(item.key, event.target.checked)}
                    />
                    <span className="pref-icon" style={{ backgroundColor: item.color }}>{item.icon}</span>
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
            <button className="btn btn-primary mt-3" onClick={handlePrefsSave}>
              Save preferences
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
            <div className="text-muted small mt-2">This app does not provide medical advice.</div>
          </div>

          <div className="glass-card mt-3">
            <h2 className="h5 mb-3">Scoring preferences</h2>
            <div className="mb-3">
              <label className="form-label">Prioritize allergies ({profilePrefs.scoring.allergies})</label>
              <input
                type="range"
                className="form-range"
                min={0}
                max={100}
                value={profilePrefs.scoring.allergies}
                onChange={(event) => setScoringValue("allergies", Number(event.target.value))}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Prioritize dietary rules ({profilePrefs.scoring.dietary})</label>
              <input
                type="range"
                className="form-range"
                min={0}
                max={100}
                value={profilePrefs.scoring.dietary}
                onChange={(event) => setScoringValue("dietary", Number(event.target.value))}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Prioritize processing level ({profilePrefs.scoring.processing})</label>
              <input
                type="range"
                className="form-range"
                min={0}
                max={100}
                value={profilePrefs.scoring.processing}
                onChange={(event) => setScoringValue("processing", Number(event.target.value))}
              />
            </div>
            <div className="form-check form-switch">
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
