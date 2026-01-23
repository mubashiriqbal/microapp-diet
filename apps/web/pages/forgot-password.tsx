import { useState } from "react"
import { requestPasswordReset } from "@wimf/shared"

const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState("")
  const [token, setToken] = useState<string | null>(null)

  const handleSubmit = async () => {
    setStatus("Requesting reset...")
    try {
      const response = await requestPasswordReset({ baseUrl: apiBase }, { email })
      setStatus(response.message)
      setToken(response.token || null)
    } catch (error) {
      setStatus((error as Error).message)
    }
  }

  return (
    <main className="container page-shell">
      <div className="row justify-content-center">
        <div className="col-lg-5">
          <div className="glass-card">
            <h1 className="mb-3">Forgot password</h1>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                className="form-control"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <button className="btn btn-primary w-100" onClick={handleSubmit}>
              Request reset
            </button>
            {status && <div className="text-muted mt-2">{status}</div>}
            {token && (
              <div className="alert alert-warning mt-3">
                Dev reset token: <strong>{token}</strong>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
