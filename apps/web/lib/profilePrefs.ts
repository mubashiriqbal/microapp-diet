type ProfilePrefs = {
  photoUri?: string | null
  dob?: string | null
  country?: string | null
  dietary: Record<string, boolean>
  allergies: Record<string, boolean>
  allergyOther?: string
  alerts: Record<string, boolean>
  sensitivities: Record<string, boolean>
  scoring: {
    allergies: number
    dietary: number
    processing: number
    strictMode: boolean
  }
}

const KEY = "wimf.profile_prefs"

const defaults: ProfilePrefs = {
  photoUri: null,
  dob: null,
  country: null,
  dietary: {},
  allergies: {},
  allergyOther: "",
  alerts: {
    highRisk: true,
    allergenDetected: true,
    nonCompliant: true,
    processed: true,
    highSodiumSugar: true,
    push: true,
    email: true,
    sms: true
  },
  sensitivities: {
    hypertension: false,
    diabetic: false,
    heartHealthy: false,
    weightLoss: false
  },
  scoring: {
    allergies: 70,
    dietary: 60,
    processing: 40,
    strictMode: true
  }
}

export function getProfilePrefs(): ProfilePrefs {
  if (typeof window === "undefined") return defaults
  const raw = window.localStorage.getItem(KEY)
  if (!raw) return defaults
  try {
    return { ...defaults, ...(JSON.parse(raw) as ProfilePrefs) }
  } catch {
    return defaults
  }
}

export function setProfilePrefs(prefs: ProfilePrefs) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(KEY, JSON.stringify(prefs))
}

export type { ProfilePrefs }
