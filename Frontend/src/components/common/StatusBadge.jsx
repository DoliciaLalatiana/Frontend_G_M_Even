import { STATUT_TONE } from '../../utils/constants'

const StatusBadge = ({ status, tone, dot = true, className = '' }) => {
  if (!status) return null
  const resolvedTone = tone || STATUT_TONE(status)

  return (
    <span className={`badge badge--${resolvedTone} ${className}`.trim()}>
      {dot && <span className="badge__dot" />}
      {status}
    </span>
  )
}

export default StatusBadge
