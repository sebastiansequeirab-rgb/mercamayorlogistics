import { getStatusConfig } from '@/lib/utils/order-status'
import type { OrderStatus } from '@/lib/types/database'

interface Props {
  status: OrderStatus
  size?: 'sm' | 'md'
}

export function OrderStatusBadge({ status, size = 'md' }: Props) {
  const config = getStatusConfig(status)

  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono font-semibold tracking-wider rounded-full border"
      style={{
        color: config.color,
        background: config.bg,
        borderColor: `${config.color}30`,
        fontSize: size === 'sm' ? '10px' : '11px',
        padding: size === 'sm' ? '2px 8px' : '3px 10px',
      }}
    >
      <span
        className="rounded-full shrink-0"
        style={{
          width: size === 'sm' ? 5 : 6,
          height: size === 'sm' ? 5 : 6,
          background: config.color,
        }}
      />
      {config.label}
    </span>
  )
}
