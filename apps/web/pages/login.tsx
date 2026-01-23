import { useState } from "react"
import { useRouter } from "next/router"
import { logIn } from "@wimf/shared"
import { setProfile, setToken } from "../lib/auth"

const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState("")

  const handleSubmit = async () => {
    setStatus("Signing in...")
    try {
      const response = await logIn({ baseUrl: apiBase }, { email, password })
      setToken(response.token)
      setProfile({ id: response.profile.id, fullName: response.profile.fullName, email: response.profile.email })
      router.push("/")
    } catch (error) {
      setStatus((error as Error).message)
    }
  }

  return (
    <main className="container page-shell">
      <div className="row justify-content-center">
        <div className="col-lg-5">
          <div className="glass-card">
            <h1 className="mb-3">Log in</h1>
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
            </div>
            <button className="btn btn-primary w-100" onClick={handleSubmit}>
              Log in
            </button>
            <div className="mt-3 text-center">
              <a className="text-muted" href="/forgot-password">
                Forgot password?
              </a>
            </div>
            {status && <div className="text-muted mt-2">{status}</div>}
          </div>
        </div>
      </div>
    </main>
  )
}
