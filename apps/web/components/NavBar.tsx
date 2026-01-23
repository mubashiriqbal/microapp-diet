import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { clearToken, getProfile, getToken } from "../lib/auth"

export default function NavBar() {
  const router = useRouter()
  const [isAuthed, setIsAuthed] = useState(false)
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    const profile = getProfile()
    setIsAuthed(!!token)
    setName(profile?.fullName || profile?.email || null)
  }, [router.asPath])

  const handleLogout = () => {
    clearToken()
    setIsAuthed(false)
    router.push("/login")
  }

  return (
    <nav className="app-nav">
      <div className="container d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-3">
          <Link className="app-logo" href="/">
            microapp-diet
          </Link>
          <div className="app-links d-none d-lg-flex">
            <Link href="/">Home</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/scan">Scan</Link>
            <Link href="/results">Results</Link>
            <Link href="/journal">Journal</Link>
            <Link href="/history">History</Link>
            <Link href="/settings">Profile</Link>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          {!isAuthed && (
            <>
              <Link className="btn btn-outline-light btn-sm" href="/login">
                Log in
              </Link>
              <Link className="btn btn-primary btn-sm" href="/signup">
                Sign up
              </Link>
            </>
          )}
          {isAuthed && (
            <>
              <span className="chip d-none d-md-inline">{name || "Account"}</span>
              <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
                Logout
              </button>
            </>
          )}
        </div>
      </div>
      <div className="container app-links d-flex d-lg-none mt-2">
        <Link href="/">Home</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/scan">Scan</Link>
        <Link href="/results">Results</Link>
        <Link href="/journal">Journal</Link>
        <Link href="/history">History</Link>
        <Link href="/settings">Profile</Link>
      </div>
    </nav>
  )
}
