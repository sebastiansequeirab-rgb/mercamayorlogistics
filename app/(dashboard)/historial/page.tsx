'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, Download } from 'lucide-react'
import { useOrders } from '@/lib/hooks/useOrders'
import { useShipments } from '@/lib/hooks/useShipments'
import { useProfile } from '@/lib/hooks/useProfile'
import { OrderDetailModal } from '@/components/orders/OrderDetailModal'
import { ShipmentDetailModal } from '@/components/shipments/ShipmentDetailModal'
import { ShipmentCard } from '@/components/shipments/ShipmentCard'
import { Skeleton } from '@/components/ui/skeleton'
import type { Order } from '@/lib/types/database'

type View = 'pedido' | 'camion'

export default function HistorialPage() {
  const { data: profile } = useProfile()
  const userRole = profile?.role ?? 'vendedor'

  const [view, setView] = useState<View>('pedido')
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null)

  // Pedidos entregados
  const { data: orders = [], isLoading: loadingOrders } = useOrders('entregado')
  // Camiones (todos los estados — el historial muestra el track record completo)
  const { data: shipments = [], isLoading: loadingShipments } = useShipments('all')

  const q = search.trim().toLowerCase()

  const filteredOrders = useMemo(() => {
    if (!q) return orders
    return orders.filter(
      (o) =>
        String(o.order_number).includes(q) ||
        (o.client?.name ?? o.vendor_client ?? '').toLowerCase().includes(q)
    )
  }, [orders, q])

  const filteredShipments = useMemo(() => {
    if (!q) return shipments
    return shipments.filter(
      (s) =>
        String(s.shipment_number).includes(q) ||
        (s.notes ?? '').toLowerCase().includes(q) ||
        (s.orders ?? []).some((o) =>
          (o.client?.name ?? o.vendor_client ?? '').toLowerCase().includes(q)
        )
    )
  }, [shipments, q])

  function exportCSV() {
    const rows = [
      ['#', 'Cliente', 'RIF', 'Lista', 'Documento', 'Productos', 'Fecha Entrega', 'Creado Por'],
      ...filteredOrders.map((o) => [
        String(o.order_number).padStart(3, '0'),
        o.client?.name ?? o.vendor_client,
        o.client?.rif ?? '',
        o.price_list === 'lista_50' ? 'Lista 50' : 'Lista 60',
        o.billing_type === 'factura' ? 'Factura' : 'Nota de Entrega',
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

  const isLoading = view === 'pedido' ? loadingOrders : loadingShipments

  return (
    <div className="px-4 md:px-6 py-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Historial</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Track record completo de pedidos y camiones
          </p>
        </div>
        {view === 'pedido' && filteredOrders.length > 0 && (
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

      {/* Tabs + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-1 p-1 rounded-lg border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
          {(['pedido', 'camion'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 py-1.5 rounded-md text-sm transition-all"
              style={{
                background: view === v ? 'var(--bg-surface)' : 'transparent',
                color: view === v ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: view === v ? 500 : 400,
              }}
            >
              {v === 'pedido' ? 'Por Pedido' : 'Por Camión'}
            </button>
          ))}
        </div>
        <div
          className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={view === 'pedido' ? 'Buscar pedido o cliente...' : 'Buscar camión, cliente o notas...'}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" style={{ background: 'var(--bg-card)' }} />
          ))}
        </div>
      ) : view === 'pedido' ? (
        filteredOrders.length === 0 ? (
          <EmptyState text={q ? 'Sin resultados.' : 'No hay pedidos entregados aún.'} />
        ) : (
          <div className="space-y-2">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-start justify-between gap-4 px-4 py-3.5 rounded-lg border"
                style={{
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                  borderLeftColor: 'var(--status-entregado)',
                  borderLeftWidth: 3,
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-muted)' }}>
                      #{String(order.order_number).padStart(3, '0')}
                    </span>
                  </div>
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {order.client?.name ?? order.vendor_client}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {(order.items ?? []).length} productos
                    {order.delivered_at
                      ? ` · Entregado el ${format(new Date(order.delivered_at), "d 'de' MMMM, HH:mm", { locale: es })}`
                      : ''}
                    {order.creator?.full_name ? ` · ${order.creator.full_name}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(order)}
                  className="shrink-0 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors hover:bg-white/5"
                  style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}
                >
                  Ver detalle
                </button>
              </div>
            ))}
          </div>
        )
      ) : filteredShipments.length === 0 ? (
        <EmptyState text={q ? 'Sin resultados.' : 'Aún no hay camiones consolidados.'} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredShipments.map((shipment) => (
            <ShipmentCard
              key={shipment.id}
              shipment={shipment}
              onView={setSelectedShipmentId}
            />
          ))}
        </div>
      )}

      <OrderDetailModal
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        userRole={userRole}
      />
      <ShipmentDetailModal
        shipmentId={selectedShipmentId}
        open={!!selectedShipmentId}
        onClose={() => setSelectedShipmentId(null)}
        userRole={userRole}
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
