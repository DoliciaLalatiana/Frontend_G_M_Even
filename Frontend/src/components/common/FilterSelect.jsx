import { ChevronDown } from 'lucide-react'

const FilterSelect = ({
  value,
  onChange,
  options = [],
  label = 'Filtrer',
  allLabel = 'Toutes',
  includeAll = true,
}) => {
  const normalized = options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  )

  return (
    <div className="select-field">
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}>
        {includeAll && <option value="">{allLabel}</option>}
        {normalized.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={13} className="select-field__chevron" />
    </div>
  )
}

export default FilterSelect
