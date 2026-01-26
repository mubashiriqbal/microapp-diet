import Constants from "expo-constants"

const extra = Constants.expoConfig?.extra || {}
const fallbackApiBase = "http://76.13.100.119:4000"

export const apiBase =
  (process.env.EXPO_PUBLIC_API_BASE as string) ||
  (extra.apiBase as string) ||
  fallbackApiBase

export const defaultUserId =
  (process.env.EXPO_PUBLIC_USER_ID as string) ||
  (extra.userId as string) ||
  "demo-user-1"
