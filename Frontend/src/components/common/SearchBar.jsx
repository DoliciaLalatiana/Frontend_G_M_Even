import { Search, X } from 'lucide-react'

const SearchBar = ({
  value,
  onChange,
  placeholder = 'Rechercher…',
  className = '',
  ariaLabel = 'Rechercher',
  inputRef = null,
  onFocus,
}) => (
  <div className={`search-field ${className}`.trim()}>
    <Search size={15} className="search-field__icon" />
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onFocus={onFocus}
      placeholder={placeholder}
      aria-label={ariaLabel}
    />
    {value && (
      <button
        type="button"
        className="search-field__clear"
        onClick={() => onChange('')}
        aria-label="Effacer la recherche"
      >
        <X size={11} />
      </button>
    )}
  </div>
)

export default SearchBar
