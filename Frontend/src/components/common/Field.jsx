const Field = ({
  label,
  htmlFor,
  required = false,
  error,
  hint,
  className = '',
  children,
}) => (
  <div className={`field ${error ? 'has-error' : ''} ${className}`.trim()}>
    {label && (
      <label className="field__label" htmlFor={htmlFor}>
        {label}
        {required && <span className="required">*</span>}
      </label>
    )}
    {children}
    {error ? <span className="field__error">{error}</span> : hint ? <span className="field__hint">{hint}</span> : null}
  </div>
)

export default Field
