import { createContext } from "react"

export const AuthContext = createContext({
  setIsAuthed: (_value: boolean) => {}
})
