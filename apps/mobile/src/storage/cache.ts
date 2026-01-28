import AsyncStorage from "@react-native-async-storage/async-storage"
import type { ScanHistory, UserPrefs, UserProfile } from "@wimf/shared"

const HISTORY_KEY = "wimf.history"
const PREFS_KEY = "wimf.prefs"
const USER_KEY = "wimf.user_id"
const TOKEN_KEY = "wimf.token"
const PROFILE_KEY = "wimf.profile"
const LAST_ANALYSIS_KEY = "wimf.last_analysis"
const HEALTH_PREFS_KEY = "wimf.health_prefs"
const PROFILE_PREFS_KEY = "wimf.profile_prefs"
const SCAN_IMAGE_KEY = "wimf.scan_images"

type HealthPrefs = {
  restrictions: string[]
  allergens: string[]
  allergyOther?: string
}

type ProfilePrefs = {
  photoUri?: string | null
  dob?: string | null
  country?: string | null
  dietaryOther?: string
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

const defaultProfilePrefs: ProfilePrefs = {
  photoUri: null,
  dob: null,
  country: null,
  dietaryOther: "",
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

export async function getUserPrefs(): Promise<UserPrefs | null> {
  const raw = await AsyncStorage.getItem(PREFS_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as UserPrefs
  } catch {
    return null
  }
}

export async function setUserPrefs(prefs: UserPrefs): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
}

export async function getUserId(): Promise<string | null> {
  return AsyncStorage.getItem(USER_KEY)
}

export async function setUserId(userId: string): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, userId)
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY)
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token)
}

export async function clearAuth(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, PROFILE_KEY, USER_KEY])
}

export async function getProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as UserProfile
  } catch {
    return null
  }
}

export async function setProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export async function getLastAnalysis(): Promise<unknown | null> {
  const raw = await AsyncStorage.getItem(LAST_ANALYSIS_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

export async function setLastAnalysis(analysis: unknown): Promise<void> {
  await AsyncStorage.setItem(LAST_ANALYSIS_KEY, JSON.stringify(analysis))
}

export async function getHealthPrefs(): Promise<HealthPrefs> {
  const raw = await AsyncStorage.getItem(HEALTH_PREFS_KEY)
  if (!raw) return { restrictions: [], allergens: [] }
  try {
    return JSON.parse(raw) as HealthPrefs
  } catch {
    return { restrictions: [], allergens: [] }
  }
}

export async function setHealthPrefs(prefs: HealthPrefs): Promise<void> {
  await AsyncStorage.setItem(HEALTH_PREFS_KEY, JSON.stringify(prefs))
}

export async function getProfilePrefs(): Promise<ProfilePrefs> {
  const raw = await AsyncStorage.getItem(PROFILE_PREFS_KEY)
  if (!raw) return defaultProfilePrefs
  try {
    return { ...defaultProfilePrefs, ...(JSON.parse(raw) as ProfilePrefs) }
  } catch {
    return defaultProfilePrefs
  }
}

export async function setProfilePrefs(prefs: ProfilePrefs): Promise<void> {
  await AsyncStorage.setItem(PROFILE_PREFS_KEY, JSON.stringify(prefs))
}

type ScanImageMap = Record<string, string>

export async function getScanImageMap(): Promise<ScanImageMap> {
  const raw = await AsyncStorage.getItem(SCAN_IMAGE_KEY)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as ScanImageMap
  } catch {
    return {}
  }
}

export async function setScanImageForId(id: string, uri: string): Promise<void> {
  const map = await getScanImageMap()
  map[id] = uri
  await AsyncStorage.setItem(SCAN_IMAGE_KEY, JSON.stringify(map))
}

export async function getScanImageForId(id: string): Promise<string | null> {
  const map = await getScanImageMap()
  return map[id] || null
}

export async function getScanHistoryCache(): Promise<ScanHistory[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as ScanHistory[]
  } catch {
    return []
  }
}

export async function setScanHistoryCache(items: ScanHistory[]): Promise<void> {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(items))
}
