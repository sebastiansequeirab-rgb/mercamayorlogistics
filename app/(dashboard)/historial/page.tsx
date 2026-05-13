'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, Download, Truck } from 'lucide-react'
import { useOrders } from '@/lib/hooks/useOrders'
import { useProfile } from '@/lib/hooks/useProfile'
import { OrderDetailModal } from '@/components/orders/OrderDetailModal'
import { Skeleton } from '@/components/ui/skeleton'
import { PRICE_LIST_LABELS, BILLING_TYPE_LABELS } from '@/lib/utils/order-status'
import type { Order } from '@/lib/types/database'

export default function HistorialPage() {
  const router = useRouter()
  const { data: profile } = useProfile()
  const userRole = profile?.role ?? 'vendedor'

  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const openShipment = (sid: string) => router.push(`/camiones/${sid}`)

  const { data: orders = [], isLoading } = useOrders('entregado')

  const q = search.trim().toLowerCase()

  const filteredOrders = useMemo(() => {
    if (!q) return orders
    return orders.filter(
      (o) =>
        String(o.order_number).includes(q) ||
        (o.client?.name ?? o.vendor_client ?? '').toLowerCase().includes(q) ||
        (o.shipment?.name ?? '').toLowerCase().includes(q)
    )
  }, [orders, q])

  function exportCSV() {
    const rows = [
      ['#', 'Cliente', 'RIF', 'Lista', 'Documento', 'Camión', 'Productos', 'Fecha Entrega', 'Creado Por'],
      ...filteredOrders.map((o) => [
        String(o.order_number).padStart(3, '0'),
        o.client?.name ?? o.vendor_client,
        o.client?.rif ?? '',
        PRICE_LIST_LABELS[o.price_list],
        BILLING_TYPE_LABELS[o.billing_type],
        o.shipment
          ? `#${String(o.shipment.shipment_number).padStart(3, '0')}${o.shipment.name ? ` ${o.shipment.name}` : ''}`
          : '',
        (o.items ?? []).map((i) => `${i.product?.name} x${i.quantity}`).join(' | '),
        o.delivered_at ? format(new Date(o.delivered_at), 'dd/MM/yyyy HH:mm') : '',
        o.creator?.full_name ?? '',
      ]),
    ]
    const csv = rows.map((r) => r.map((c) => `"${String(c)}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `historial-mercamayor-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="px-4 md:px-6 py-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Historial de Pedidos</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Pedidos entregados. Click para ver el detalle e ir al camión.
          </p>
        </div>
        {filteredOrders.length > 0 && (
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}
          >
            <Download size={13} />
            Exportar CSV
          </button>
        )}
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg border mb-5"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
      >
        <Search size={14} style={{ color: 'var(--text-muted)' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar pedido, cliente o camión..."
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" style={{ background: 'var(--bg-card)' }} />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <EmptyState text={q ? 'Sin resultados.' : 'No hay pedidos entregados aún.'} />
      ) : (
        <div className="space-y-2">
          {filteredOrders.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => setSelectedOrder(order)}
              className="w-full flex items-start justify-between gap-4 px-4 py-3.5 rounded-lg border text-left transition-colors hover:bg-white/5"
              style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                borderLeftColor: 'var(--status-entregado)',
                borderLeftWidth: 3,
              }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-muted)' }}>
                    #{String(order.order_number).padStart(3, '0')}
                  </span>
                  {order.shipment && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
                      style={{ color: 'var(--accent-primary)', background: 'color-mix(in oklab, var(--accent-primary) 10%, transparent)' }}
                    >
                      <Truck size={9} />
                      #{String(order.shipment.shipment_number).padStart(3, '0')}
                      {order.shipment.name ? ` — ${order.shipment.name}` : ''}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {order.client?.name ?? order.vendor_client}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {PRICE_LIST_LABELS[order.price_list]} · {(order.items ?? []).length} productos
                  {order.delivered_at
                    ? ` · Entregado el ${format(new Date(order.delivered_at), "d 'de' MMMM, HH:mm", { locale: es })}`
                    : ''}
                  {order.creator?.full_name ? ` · ${order.creator.full_name}` : ''}
                </p>
              </div>
              <span
                className="shrink-0 px-3 py-1.5 rounded-md text-xs font-medium border self-center"
                style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}
              >
                Ver detalle
              </span>
            </button>
          ))}
        </div>
      )}

      <OrderDetailModal
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        userRole={userRole}
        onOpenShipment={openShipment}
      />
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{text}</p>
    </div>
  )
}
