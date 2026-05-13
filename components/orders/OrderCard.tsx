'use client'

import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { MessageSquare, Package2, Truck, User } from 'lucide-react'
import { OrderStatusBadge } from './OrderStatusBadge'
import { OrderStatusChanger } from './OrderStatusChanger'
import { getStatusConfig, PRICE_LIST_SHORT, BILLING_TYPE_LABELS } from '@/lib/utils/order-status'
import type { Order, UserRole } from '@/lib/types/database'

interface Props {
  order: Order
  userRole: UserRole
  onViewDetail: (order: Order) => void
  onOpenShipment?: (shipmentId: string) => void
}

export function OrderCard({ order, userRole, onViewDetail, onOpenShipment }: Props) {
  const config = getStatusConfig(order.status)
  const canChangeStatus = userRole === 'admin' || userRole === 'gestora'
  const itemCount = order.items?.length ?? 0
  const commentCount = order.comments?.length ?? 0

  return (
    <div
      className="order-card rounded-lg border relative overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-subtle)',
        borderLeftColor: config.color,
        borderLeftWidth: 3,
      }}
    >
      <div className="px-4 py-3.5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="text-xs font-mono font-bold shrink-0"
              style={{ color: 'var(--text-muted)' }}
            >
              #{String(order.order_number).padStart(3, '0')}
            </span>
            <OrderStatusBadge status={order.status} size="sm" />
          </div>
        </div>

        {/* Client name */}
        <p className="text-base font-semibold leading-tight mb-1.5 truncate" style={{ color: 'var(--text-primary)' }}>
          {order.vendor_client}
        </p>

        {/* Meta tags */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
            {PRICE_LIST_SHORT[order.price_list]}
          </span>
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
            {BILLING_TYPE_LABELS[order.billing_type]}
          </span>
        </div>

        {/* Shipment pill — clickeable, abre el detalle del camión */}
        {order.shipment && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onOpenShipment?.(order.shipment!.id)
            }}
            disabled={!onOpenShipment}
            className="mb-3 inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded border transition-colors hover:bg-white/5 disabled:cursor-default"
            style={{ color: 'var(--accent-primary)', borderColor: 'color-mix(in oklab, var(--accent-primary) 40%, transparent)' }}
            title={onOpenShipment ? 'Ver camión' : undefined}
          >
            <Truck size={11} />
            Camión #{String(order.shipment.shipment_number).padStart(3, '0')}
            {order.shipment.name ? ` — ${order.shipment.name}` : ''}
          </button>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-3">
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Package2 size={12} />
            {itemCount} {itemCount === 1 ? 'producto' : 'productos'}
          </span>
          {commentCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <MessageSquare size={12} />
              {commentCount} {commentCount === 1 ? 'comentario' : 'comentarios'}
            </span>
          )}
        </div>

        {/* Creator + time */}
        <div className="flex items-center gap-1.5 mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          <User size={11} />
          <span>{order.creator?.full_name ?? 'Usuario'}</span>
          <span>·</span>
          <span>{formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: es })}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewDetail(order)}
            className="flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}
          >
            Ver detalle
          </button>
          {canChangeStatus && <OrderStatusChanger orderId={order.id} currentStatus={order.status} />}
        </div>
      </div>
    </div>
  )
}
