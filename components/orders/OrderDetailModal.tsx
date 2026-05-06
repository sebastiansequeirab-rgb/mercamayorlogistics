'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { X } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { OrderStatusBadge } from './OrderStatusBadge'
import { OrderStatusChanger } from './OrderStatusChanger'
import { CommentsSection } from './CommentsSection'
import { PRICE_LIST_LABELS, BILLING_TYPE_LABELS } from '@/lib/utils/order-status'
import type { Order, UserRole } from '@/lib/types/database'

interface Props {
  order: Order | null
  open: boolean
  onClose: () => void
  userRole: UserRole
}

export function OrderDetailModal({ order, open, onClose, userRole }: Props) {
  if (!order) return null

  const canChangeStatus = userRole === 'admin' || userRole === 'gestora'

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto flex flex-col gap-0 p-0"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-base font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                Pedido #{String(order.order_number).padStart(3, '0')}
              </SheetTitle>
              <div className="mt-1.5">
                <OrderStatusBadge status={order.status} />
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors">
              <X size={18} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Order info */}
          <div className="space-y-2">
            <InfoRow label="Cliente" value={order.vendor_client} />
            <InfoRow label="Lista" value={PRICE_LIST_LABELS[order.price_list]} />
            <InfoRow label="Documento" value={BILLING_TYPE_LABELS[order.billing_type]} />
            <InfoRow label="Creado por" value={order.creator?.full_name ?? '—'} />
            <InfoRow
              label="Fecha"
              value={format(new Date(order.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
            />
            {order.notes && <InfoRow label="Notas" value={order.notes} />}
          </div>

          <Separator style={{ background: 'var(--border-subtle)' }} />

          {/* Products */}
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>
              Productos
            </p>
            <div className="space-y-1.5">
              {(order.items ?? []).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 py-2 px-3 rounded-md"
                  style={{ background: 'var(--bg-surface)' }}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      {item.product?.code}
                    </p>
                    <p className="text-sm leading-tight mt-0.5" style={{ color: 'var(--text-primary)' }}>
                      {item.product?.name}
                    </p>
                  </div>
                  <span
                    className="text-sm font-semibold font-mono shrink-0"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    ×{item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Separator style={{ background: 'var(--border-subtle)' }} />

          {/* Comments */}
          <CommentsSection
            orderId={order.id}
            comments={order.comments ?? []}
          />
        </div>

        {/* Footer — status changer */}
        {canChangeStatus && order.status !== 'entregado' && (
          <div
            className="px-5 py-4 border-t flex justify-end"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <OrderStatusChanger orderId={order.id} currentStatus={order.status} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs w-24 shrink-0 pt-0.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  )
}
