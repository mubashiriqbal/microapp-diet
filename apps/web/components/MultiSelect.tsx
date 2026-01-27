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

export default function MultiSelect({ label, options, selected, onChange, placeholder }: Props) {
  const [query, setQuery] = useState("")

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
              {option?.label ?? value} ×
            </button>
          )
        })}
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
              <div>
                <div className="fw-semibold">{option.label}</div>
                {option.description && (
                  <div className="small text-muted">{option.description}</div>
                )}
              </div>
              <span>{isSelected ? "✓" : ""}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
