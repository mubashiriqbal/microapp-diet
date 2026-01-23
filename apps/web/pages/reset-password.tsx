import { useState } from "react"
import { resetPassword } from "@wimf/shared"

const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"

export default function ResetPassword() {
  const [email, setEmail] = useState("")
  const [token, setToken] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [status, setStatus] = useState("")

  const handleSubmit = async () => {
    setStatus("Resetting...")
    try {
      const response = await resetPassword(
        { baseUrl: apiBase },
        { email, token, newPassword }
      )
      setStatus(response.message)
    } catch (error) {
      setStatus((error as Error).message)
    }
  }

  return (
    <main className="container page-shell">
      <div className="row justify-content-center">
        <div className="col-lg-5">
          <div className="glass-card">
            <h1 className="mb-3">Reset password</h1>
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
              <label className="form-label">Reset token</label>
              <input
                className="form-control"
                value={token}
                onChange={(event) => setToken(event.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">New password</label>
              <input
                className="form-control"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <button className="btn btn-primary w-100" onClick={handleSubmit}>
              Reset password
            </button>
            {status && <div className="text-muted mt-2">{status}</div>}
          </div>
        </div>
      </div>
    </main>
  )
}
