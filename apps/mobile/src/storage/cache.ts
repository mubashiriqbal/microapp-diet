import AsyncStorage from "@react-native-async-storage/async-storage"
import type { ScanHistory, UserPrefs, UserProfile } from "@wimf/shared"

const HISTORY_KEY = "wimf.history"
const PREFS_KEY = "wimf.prefs"
const USER_KEY = "wimf.user_id"
const TOKEN_KEY = "wimf.token"
const PROFILE_KEY = "wimf.profile"
const LAST_ANALYSIS_KEY = "wimf.last_analysis"

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
