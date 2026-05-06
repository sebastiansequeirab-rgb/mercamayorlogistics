'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, Download } from 'lucide-react'
import { useOrders } from '@/lib/hooks/useOrders'
import { useProfile } from '@/lib/hooks/useProfile'
import { OrderDetailModal } from '@/components/orders/OrderDetailModal'
import { Skeleton } from '@/components/ui/skeleton'
import type { Order } from '@/lib/types/database'

export default function HistorialPage() {
  const { data: orders = [], isLoading } = useOrders('entregado')
  const { data: profile } = useProfile()
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const userRole = profile?.role ?? 'vendedor'

  const filtered = useMemo(() => {
    if (!search.trim()) return orders
    const q = search.toLowerCase()
    return orders.filter((o) => o.vendor_client.toLowerCase().includes(q))
  }, [orders, search])

  function exportCSV() {
    const rows = [
      ['#', 'Cliente', 'Lista', 'Documento', 'Productos', 'Fecha Entrega', 'Creado Por'],
      ...filtered.map((o) => [
        String(o.order_number).padStart(3, '0'),
        o.vendor_client,
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

  return (
    <div className="px-4 md:px-6 py-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          Historial de Pedidos
        </h1>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors hover:bg-white/5"
          style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}
        >
          <Download size={13} />
          Exportar CSV
        </button>
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
          placeholder="Buscar cliente..."
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" style={{ background: 'var(--bg-card)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {search ? 'Sin resultados.' : 'No hay pedidos entregados aún.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((order) => (
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
                  {order.vendor_client}
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
      )}

      <OrderDetailModal
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        userRole={userRole}
      />
    </div>
  )
}
