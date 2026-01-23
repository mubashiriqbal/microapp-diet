export type StoredProfile = {
  id: string
  fullName?: string | null
  email: string
}

const TOKEN_KEY = "wimf.token"
const PROFILE_KEY = "wimf.profile"

export const getToken = () => {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export const setToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token)
}

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(PROFILE_KEY)
}

export const getProfile = (): StoredProfile | null => {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(PROFILE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredProfile
  } catch {
    return null
  }
}

export const setProfile = (profile: StoredProfile) => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}
