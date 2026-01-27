const KEY = "wimf.health_prefs"

export type HealthPrefs = {
  restrictions: string[]
  allergens: string[]
  allergyOther?: string
}

export const getHealthPrefs = (): HealthPrefs => {
  if (typeof window === "undefined") return { restrictions: [], allergens: [] }
  const raw = window.localStorage.getItem(KEY)
  if (!raw) return { restrictions: [], allergens: [] }
  try {
    return JSON.parse(raw) as HealthPrefs
  } catch {
    return { restrictions: [], allergens: [] }
  }
}

export const setHealthPrefs = (prefs: HealthPrefs) => {
  if (typeof window === "undefined") return
  window.localStorage.setItem(KEY, JSON.stringify(prefs))
}
