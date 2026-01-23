import { useEffect, useState } from "react"
import { getHistory } from "@wimf/shared"
import type { ScanHistory } from "@wimf/shared"
import { getProfile, getToken } from "../lib/auth"

const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"

export default function History() {
  const [items, setItems] = useState<ScanHistory[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const profile = getProfile()
        const token = getToken()
        if (!profile || !token) {
          setError("Please log in to view history.")
          return
        }
        const data = await getHistory({ baseUrl: apiBase, token }, profile.id)
        setItems(data)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return (
    <main className="container page-shell">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">History</h1>
        <span className="chip">{items.length} scans</span>
      </div>
      {loading && <div className="text-muted">Loading...</div>}
      {error && <div className="alert alert-warning">{error}</div>}
      {!loading && !error && items.length === 0 && (
        <div className="text-muted">No scans yet.</div>
      )}
      <div className="row g-3">
        {items.map((entry) => (
          <div className="col-md-6" key={entry.id}>
            <div className="glass-card">
              <div className="fw-semibold">
                {entry.productName || entry.analysisSnapshot?.productName || "Scan"}
              </div>
              <div className="text-muted small">
                {new Date(entry.createdAt).toLocaleString()}
              </div>
              <div className="text-muted small mt-2">
                Score: {entry.analysisSnapshot?.score?.value ?? "Unknown"} | Calories/100g:{" "}
                {(() => {
                  const nutrition = entry.analysisSnapshot?.nutritionHighlights
                  if (!nutrition) return "Unknown"
                  if (nutrition.caloriesPer100g !== null && nutrition.caloriesPer100g !== undefined) {
                    return nutrition.caloriesPer100g
                  }
                  if (
                    nutrition.calories !== null &&
                    nutrition.calories !== undefined &&
                    nutrition.servingSizeG !== null &&
                    nutrition.servingSizeG !== undefined &&
                    nutrition.servingSizeG > 0
                  ) {
                    return Number(((nutrition.calories * 100) / nutrition.servingSizeG).toFixed(1))
                  }
                  return "Unknown"
                })()}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="footer-note mt-4">Educational, not medical advice.</div>
    </main>
  )
}
