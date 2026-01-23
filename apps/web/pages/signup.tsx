import { useState } from "react"
import { useRouter } from "next/router"
import { signUp } from "@wimf/shared"
import { setProfile, setToken } from "../lib/auth"

const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"

export default function Signup() {
  const router = useRouter()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState("")

  const handleSubmit = async () => {
    setStatus("Creating account...")
    try {
      const response = await signUp({ baseUrl: apiBase }, { fullName, email, password })
      setToken(response.token)
      setProfile({ id: response.profile.id, fullName: response.profile.fullName, email: response.profile.email })
      router.push("/profile")
    } catch (error) {
      setStatus((error as Error).message)
    }
  }

  return (
    <main className="container page-shell">
      <div className="row justify-content-center">
        <div className="col-lg-5">
          <div className="glass-card">
            <h1 className="mb-3">Create account</h1>
            <div className="mb-3">
              <label className="form-label">Full name</label>
              <input
                className="form-control"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                className="form-control"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input
                className="form-control"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <div className="text-muted small mt-1">At least 8 characters.</div>
            </div>
            <button className="btn btn-primary w-100" onClick={handleSubmit}>
              Sign up
            </button>
            {status && <div className="text-muted mt-2">{status}</div>}
          </div>
        </div>
      </div>
    </main>
  )
}
