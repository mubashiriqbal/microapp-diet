import { useState } from "react"
import { useRouter } from "next/router"
import { signUp } from "@wimf/shared"
import { setProfile, setToken } from "../lib/auth"
import MultiSelect from "../components/MultiSelect"
import { setHealthPrefs } from "../lib/healthPrefs"

const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"

export default function Signup() {
  const router = useRouter()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState("")
  const [restrictions, setRestrictions] = useState<string[]>([])
  const [allergens, setAllergens] = useState<string[]>([])

  const restrictionOptions = [
    { value: "vegan", label: "Vegan", description: "Excludes all animal-derived foods." },
    { value: "vegetarian", label: "Vegetarian", description: "No meat or fish; may include eggs/dairy." },
    { value: "gluten_free", label: "Gluten-Free", description: "No wheat, barley, or rye." },
    { value: "lactose_free", label: "Dairy-Free", description: "Avoids milk-based products." },
    { value: "nut_allergy", label: "Nut Allergies", description: "Avoid peanuts and tree nuts." },
    { value: "halal", label: "Halal", description: "Complies with Islamic dietary laws." },
    { value: "kosher", label: "Kosher", description: "Complies with Jewish dietary laws." },
    { value: "hindu", label: "Hindu", description: "Commonly restricts beef; some avoid all meat." },
    { value: "keto", label: "Keto", description: "High fat, low carb." },
    { value: "diabetic", label: "Diabetic", description: "Manages sugar and carbohydrates." },
    { value: "low_sodium", label: "Low-Sodium / Low-Fat", description: "Used for cardiovascular health." }
  ]

  const allergenOptions = [
    { value: "milk", label: "Milk" },
    { value: "eggs", label: "Eggs" },
    { value: "peanuts", label: "Peanuts" },
    { value: "tree_nuts", label: "Tree Nuts", description: "Almonds, walnuts, pecans, etc." },
    { value: "fish", label: "Fish", description: "Salmon, cod, flounder, etc." },
    { value: "shellfish", label: "Crustacean Shellfish", description: "Shrimp, crab, lobster." },
    { value: "wheat", label: "Wheat" },
    { value: "soy", label: "Soy" },
    { value: "sesame", label: "Sesame", description: "Recognized as major allergen (2023)." }
  ]

  const handleSubmit = async () => {
    setStatus("Creating account...")
    try {
      const response = await signUp({ baseUrl: apiBase }, { fullName, email, password })
      setToken(response.token)
      setProfile({ id: response.profile.id, fullName: response.profile.fullName, email: response.profile.email })
      setHealthPrefs({ restrictions, allergens })
      router.push("/settings")
    } catch (error) {
      setStatus((error as Error).message)
    }
  }

  return (
    <main className="container page-shell">
      <div className="row justify-content-center">
        <div className="col-lg-5">
          <div className="glass-card">
            <div className="text-center mb-4">
              <div className="fw-bold fs-4">SafePlate AI</div>
              <div className="text-muted">I can trust this app with my health.</div>
            </div>
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

            <MultiSelect
              label="Common dietary restrictions"
              options={restrictionOptions}
              selected={restrictions}
              onChange={setRestrictions}
              placeholder="Search dietary restrictions"
            />

            <MultiSelect
              label="Allergens"
              options={allergenOptions}
              selected={allergens}
              onChange={setAllergens}
              placeholder="Search allergens"
            />
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
