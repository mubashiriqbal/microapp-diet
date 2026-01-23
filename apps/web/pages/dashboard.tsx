import { useEffect, useMemo, useState } from "react"
import {
  getJournalForDate,
  getGoals,
  getStreaks,
  getActivities
} from "../lib/tracking"

const todayKey = () => new Date().toISOString().slice(0, 10)

export default function Dashboard() {
  const [date] = useState(todayKey())
  const [totals, setTotals] = useState({
    calories: 0,
    protein_g: 0,
    sugar_g: 0,
    sodium_mg: 0,
    missingNutritionCount: 0
  })
  const [goals, setGoals] = useState({
    caloriesTarget: 2000,
    proteinTarget: 80,
    sodiumLimit: 2000,
    sugarLimit: 50
  })
  const [streaks, setStreaks] = useState({ current: 0, longest: 0 })
  const [activityCalories, setActivityCalories] = useState(0)
  const [status, setStatus] = useState("")

  useEffect(() => {
    const load = async () => {
      const log = getJournalForDate(date)
      const goal = getGoals()
      const streak = getStreaks()
      const activity = getActivities()
      const todayActivity = activity
        .filter((entry) => entry.date === date)
        .reduce((sum, entry) => sum + entry.caloriesBurned, 0)

      setTotals({
        calories: log.totals.calories,
        protein_g: log.totals.protein_g,
        sugar_g: log.totals.sugar_g,
        sodium_mg: log.totals.sodium_mg,
        missingNutritionCount: log.missingNutritionCount
      })
      setGoals(goal)
      setStreaks(streak)
      setActivityCalories(Math.round(todayActivity))
    }
    load()
  }, [date])

  const shareText = useMemo(() => {
    return [
      "Today summary (educational only):",
      `Calories: ${totals.calories}/${goals.caloriesTarget}`,
      `Protein: ${totals.protein_g}g`,
      `Sugar: ${totals.sugar_g}g`,
      `Sodium: ${totals.sodium_mg}mg`,
      "Educational, not medical advice."
    ].join("\n")
  }, [totals, goals])

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText })
      } else {
        await navigator.clipboard.writeText(shareText)
        setStatus("Share text copied to clipboard.")
      }
    } catch {
      setStatus("Unable to share.")
    }
  }

  return (
    <main className="container page-shell">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">Dashboard</h1>
        <button className="btn btn-outline-light" onClick={handleShare}>
          Share today
        </button>
      </div>

      <div className="row g-3">
        <div className="col-md-6">
          <div className="metric-card h-100">
            <div className="text-muted small">Calories today</div>
            <div className="metric-number">
              {totals.calories} / {goals.caloriesTarget}
            </div>
            <div className="progress mt-3">
              <div
                className="progress-bar"
                role="progressbar"
                style={{
                  width: `${Math.min(100, (totals.calories / goals.caloriesTarget) * 100)}%`
                }}
              />
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="metric-card h-100">
            <div className="text-muted small">Protein today</div>
            <div className="metric-number">
              {totals.protein_g}g / {goals.proteinTarget}g
            </div>
            <div className="progress mt-3">
              <div
                className="progress-bar"
                role="progressbar"
                style={{
                  width: `${Math.min(100, (totals.protein_g / goals.proteinTarget) * 100)}%`
                }}
              />
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="metric-card h-100">
            <div className="text-muted small">Sodium today</div>
            <div className="metric-number">
              {totals.sodium_mg}mg / {goals.sodiumLimit}mg
            </div>
            <div className="progress mt-3">
              <div
                className="progress-bar bg-warning"
                role="progressbar"
                style={{
                  width: `${Math.min(100, (totals.sodium_mg / goals.sodiumLimit) * 100)}%`
                }}
              />
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="metric-card h-100">
            <div className="text-muted small">Sugar today</div>
            <div className="metric-number">
              {totals.sugar_g}g / {goals.sugarLimit}g
            </div>
            <div className="progress mt-3">
              <div
                className="progress-bar bg-info"
                role="progressbar"
                style={{
                  width: `${Math.min(100, (totals.sugar_g / goals.sugarLimit) * 100)}%`
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {totals.missingNutritionCount > 0 && (
        <div className="alert alert-warning mt-3">
          Some items are missing nutrition. Totals may be incomplete.
        </div>
      )}

      <div className="row g-3 mt-3">
        <div className="col-md-6">
          <div className="metric-card">
            <div className="text-muted small">Activity calories (manual)</div>
            <div className="metric-number">{activityCalories}</div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="metric-card">
            <div className="text-muted small">Streaks</div>
            <div className="metric-number">Current: {streaks.current} days</div>
            <div className="metric-sub">Longest: {streaks.longest} days</div>
          </div>
        </div>
      </div>

      <div className="d-flex gap-2 mt-4">
        <a className="btn btn-primary" href="/journal">
          Log a meal
        </a>
        <a className="btn btn-outline-light" href="/scan">
          Scan a label
        </a>
      </div>

      {status && <div className="text-muted mt-3">{status}</div>}
      <div className="footer-note mt-4">Educational, not medical advice.</div>
    </main>
  )
}
