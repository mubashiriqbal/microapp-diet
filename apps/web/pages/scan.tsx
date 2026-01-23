import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/router"
import { analyzeFromImages, postHistory } from "@wimf/shared"
import { getProfile, getToken } from "../lib/auth"

const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"

export default function Scan() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [labelFile, setLabelFile] = useState<File | null>(null)

  const progress = useMemo(() => (labelFile ? 100 : 0), [labelFile])

  useEffect(() => {
    const storedToken = getToken()
    const profile = getProfile()
    if (!storedToken || !profile) {
      router.push("/login")
      return
    }
    setToken(storedToken)
    setUserId(profile.id)
  }, [router])

  const handleSubmit = async () => {
    if (!labelFile) {
      setError("Please upload a clear food or label photo.")
      return
    }

    setLoading(true)
    setError("")

    const formData = new FormData()
    formData.append("frontImage", labelFile)
    if (userId) {
      formData.append("userId", userId)
    }

    try {
      const response = await analyzeFromImages({ baseUrl: apiBase, token: token || undefined }, formData)
      if (userId) {
        await postHistory(
          {
            baseUrl: apiBase,
            token: token || undefined
          },
          {
            userId,
            analysisSnapshot: response,
            extractedText: response.parsing.extractedText,
            parsedIngredients: response.ingredientBreakdown.map((item) => item.name),
            parsedNutrition: response.nutritionHighlights
          }
        )
      }

      sessionStorage.setItem("wimf.analysis", JSON.stringify(response))
      router.push("/results")
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="container page-shell">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="mb-2">Scan a food photo</h1>
          <p className="text-muted mb-0">
            Upload one clear food or label photo. We will estimate ingredients and nutrition when possible.
          </p>
        </div>
        <div className="metric-card">
          <div className="text-muted small">Capture progress</div>
          <div className="metric-number">{progress}%</div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-5">
          <div className="capture-guide mb-3">
            <h2 className="h6">Capture guide</h2>
            <ul className="text-muted mb-0">
              <li>Food-only photos work; labels improve accuracy.</li>
              <li>Keep the subject large, flat, and well lit.</li>
              <li>Avoid blur, glare, and shadows.</li>
            </ul>
          </div>
          <div className="metric-card">
            <div className="text-muted small">Status</div>
            <div className="fw-semibold">
              {loading ? "Analyzing image..." : "Ready for upload"}
            </div>
            <div className="footer-note mt-2">Educational, not medical advice.</div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="scan-step">
            <div className="d-flex justify-content-between">
              <div>
                <div className="text-muted small">Single step</div>
                <div className="fw-semibold">Food or label photo</div>
                <div className="text-muted small">
                  One image for product name, ingredients, and nutrition estimates.
                </div>
              </div>
              <span className="chip">{labelFile ? "Captured" : "Required"}</span>
            </div>
            <input
              className="form-control mt-3"
              type="file"
              accept="image/*"
              onChange={(event) => setLabelFile(event.target.files?.[0] || null)}
              disabled={loading}
            />
          </div>
          <button
            className="btn btn-primary mt-3"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Analyzing..." : "Analyze image"}
          </button>
          <button
            className="btn btn-outline-light mt-3 ms-2"
            onClick={() => setLabelFile(null)}
            disabled={loading}
          >
            Reupload image
          </button>
          {error && <div className="alert alert-warning mt-3">{error}</div>}
        </div>
      </div>
    </main>
  )
}
