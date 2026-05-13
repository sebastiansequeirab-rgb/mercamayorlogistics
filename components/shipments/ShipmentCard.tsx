'use client'

import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Package2, Scale, Truck, User } from 'lucide-react'
import { ShipmentStatusBadge } from './ShipmentStatusBadge'
import { getShipmentStatusConfig } from '@/lib/utils/order-status'
import type { ReactNode } from 'react'
import type { ShipmentWithOrders } from '@/lib/hooks/useShipments'

interface Props {
  shipment: ShipmentWithOrders
  onView: (id: string) => void
  /** Extra action(s) shown next to "Ver detalle" — e.g. "→ Entregado" button */
  actionButton?: ReactNode
  /** Visual cue for draggable cards */
  draggable?: boolean
}

export function ShipmentCard({ shipment, onView, actionButton, draggable }: Props) {
  const config = getShipmentStatusConfig(shipment.status)
  const orders = shipment.orders ?? []
  const orderCount = orders.length

  let units = 0
  let weight = 0
  for (const o of orders) {
    for (const it of o.items ?? []) {
      const qty = it.quantity ?? 0
      const w = it.product?.peso_kg ?? 0
      units += qty
      weight += qty * w
    }
  }

  return (
    <div
      className="rounded-lg border relative overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-subtle)',
        borderLeftColor: config.color,
        borderLeftWidth: 3,
        cursor: draggable ? 'grab' : 'default',
      }}
    >
      <div className="px-4 py-3.5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Truck size={14} style={{ color: 'var(--text-muted)' }} className="shrink-0" />
            <span
              className="text-xs font-mono font-bold shrink-0"
              style={{ color: 'var(--text-muted)' }}
            >
              #{String(shipment.shipment_number).padStart(3, '0')}
            </span>
            {shipment.name && (
              <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {shipment.name}
              </span>
            )}
            <ShipmentStatusBadge status={shipment.status} size="sm" />
          </div>
        </div>

        {/* Metrics */}
        <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 mb-3">
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <Package2 size={12} />
            {orderCount} {orderCount === 1 ? 'pedido' : 'pedidos'}
          </span>
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            ×{units} unidades
          </span>
          {weight > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-mono font-semibold" style={{ color: 'var(--accent-primary)' }}>
              <Scale size={12} />
              {weight.toFixed(1)} kg
            </span>
          )}
        </div>

        {/* Creator + time */}
        <div className="flex items-center gap-1.5 mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          <User size={11} />
          <span>{shipment.creator?.full_name ?? 'Usuario'}</span>
          <span>·</span>
          <span>{formatDistanceToNow(new Date(shipment.created_at), { addSuffix: true, locale: es })}</span>
        </div>

        {/* Notes */}
        {shipment.notes && (
          <p className="text-xs mb-3 italic truncate" style={{ color: 'var(--text-muted)' }}>
            📝 {shipment.notes}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onView(shipment.id)}
            className="flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}
          >
            Ver detalle
          </button>
          {actionButton}
        </div>
      </div>
    </div>
  )
}
