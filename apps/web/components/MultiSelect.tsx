import { useMemo, useState } from "react"

type Option = {
  value: string
  label: string
  description?: string
}

type Props = {
  label: string
  options: Option[]
  selected: string[]
  onChange: (values: string[]) => void
  placeholder?: string
}

const optionMeta: Record<
  string,
  {
    color: string
    label: string
  }
> = {
  vegan: { color: "#1ABC9C", label: "V" },
  vegetarian: { color: "#2C7BE5", label: "Ve" },
  gluten_free: { color: "#F4A261", label: "G" },
  lactose_free: { color: "#4EA8DE", label: "D" },
  nut_allergy: { color: "#E76F51", label: "N" },
  halal: { color: "#0EA5A5", label: "H" },
  kosher: { color: "#6366F1", label: "K" },
  pescatarian: { color: "#3B82F6", label: "P" },
  hindu: { color: "#F97316", label: "Hi" },
  keto: { color: "#8B5CF6", label: "K" },
  diabetic: { color: "#EF4444", label: "D" },
  low_sodium: { color: "#0F766E", label: "LS" },
  milk: { color: "#60A5FA", label: "M" },
  eggs: { color: "#F59E0B", label: "E" },
  peanuts: { color: "#D97706", label: "P" },
  tree_nuts: { color: "#A16207", label: "TN" },
  fish: { color: "#3B82F6", label: "F" },
  shellfish: { color: "#EF4444", label: "C" },
  wheat: { color: "#FBBF24", label: "W" },
  soy: { color: "#22C55E", label: "S" },
  sesame: { color: "#F97316", label: "Se" }
}

export default function MultiSelect({ label, options, selected, onChange, placeholder }: Props) {
  const [query, setQuery] = useState("")
  const [custom, setCustom] = useState("")

  const filtered = useMemo(() => {
    if (!query.trim()) return options
    const lower = query.toLowerCase()
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(lower) ||
        option.description?.toLowerCase().includes(lower)
    )
  }, [options, query])

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value))
      return
    }
    onChange([...selected, value])
  }

  const addCustom = () => {
    const trimmed = custom.trim()
    if (!trimmed) return
    if (!selected.includes(trimmed)) {
      onChange([...selected, trimmed])
    }
    setCustom("")
  }

  return (
    <div className="mb-4">
      <label className="form-label">{label}</label>
      <div className="input-group mb-2">
        <span className="input-group-text">Search</span>
        <input
          className="form-control"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder || "Search"}
        />
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3">
        {selected.length === 0 && <span className="text-muted small">No selections yet.</span>}
        {selected.map((value) => {
          const option = options.find((item) => item.value === value)
          return (
            <button
              key={value}
              type="button"
              className="chip"
              onClick={() => toggle(value)}
            >
              {option?.label ?? value} x
            </button>
          )
        })}
      </div>

      <div className="input-group mb-3">
        <span className="input-group-text">Other</span>
        <input
          className="form-control"
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          placeholder="Add custom item"
        />
        <button className="btn btn-outline-light" type="button" onClick={addCustom}>
          Add
        </button>
      </div>

      <div className="list-group multi-select-list">
        {filtered.map((option) => {
          const isSelected = selected.includes(option.value)
          return (
            <button
              key={option.value}
              type="button"
              className={`list-group-item list-group-item-action d-flex justify-content-between align-items-start ${
                isSelected ? "is-selected" : ""
              }`}
              onClick={() => toggle(option.value)}
            >
              <div className="d-flex gap-2 align-items-start">
                <span
                  className="option-icon"
                  style={{
                    backgroundColor: optionMeta[option.value]?.color || "rgba(26,188,156,0.16)"
                  }}
                >
                  {optionMeta[option.value]?.label || option.label.slice(0, 1)}
                </span>
                <div>
                  <div className="fw-semibold">{option.label}</div>
                  {option.description && (
                    <div className="small text-muted">{option.description}</div>
                  )}
                </div>
              </div>
              <span className="fw-semibold">{isSelected ? "✓" : ""}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
