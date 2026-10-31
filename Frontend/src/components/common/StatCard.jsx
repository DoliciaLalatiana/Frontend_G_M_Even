import { Minus, TrendingDown, TrendingUp } from 'lucide-react'

const StatCard = ({
  icon,
  label,
  value,
  unit,
  trend,
  trendDirection = 'up',
  foot,
  tone = 'var(--cyan)',
}) => {
  const TrendIcon =
    trendDirection === 'down' ? TrendingDown : trendDirection === 'flat' ? Minus : TrendingUp

  return (
    <div className="stat-card" style={{ '--tone': tone }}>
      <div className="stat-card__top">
        <div className="stat-card__icon">{icon}</div>
        {trend && (
          <span className="stat-card__trend">
            <TrendIcon size={10} />
            {trend}
          </span>
        )}
      </div>
      <div className="stat-card__body">
        <span className="stat-card__label">{label}</span>
        <div className="stat-card__value-row">
          <span className="stat-card__value">{value}</span>
          {unit && <span className="stat-card__unit">{unit}</span>}
        </div>
        {foot && <p className="stat-card__foot">{foot}</p>}
      </div>
    </div>
  )
}

export default StatCard
