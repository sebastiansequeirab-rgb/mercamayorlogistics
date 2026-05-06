'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { useOrders } from '@/lib/hooks/useOrders'
import { useProfile } from '@/lib/hooks/useProfile'
import { OrderCard } from '@/components/orders/OrderCard'
import { OrderDetailModal } from '@/components/orders/OrderDetailModal'
import { Skeleton } from '@/components/ui/skeleton'
import type { Order, OrderStatus } from '@/lib/types/database'
import { isToday } from 'date-fns'

type FilterTab = 'todos' | 'recibido' | 'en_transito'

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'recibido', label: 'Recibidos' },
  { id: 'en_transito', label: 'En Tránsito' },
]

export default function DashboardPage() {
  const { data: orders = [], isLoading } = useOrders('active')
  const { data: profile } = useProfile()
  const { data: allOrders = [] } = useOrders()

  const [filter, setFilter] = useState<FilterTab>('todos')
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // Metrics
  const metrics = useMemo(() => {
    const recibidos = orders.filter((o) => o.status === 'recibido').length
    const enTransito = orders.filter((o) => o.status === 'en_transito').length
    const entregadosHoy = allOrders.filter(
      (o) => o.status === 'entregado' && o.delivered_at && isToday(new Date(o.delivered_at))
    ).length
    return { recibidos, enTransito, entregadosHoy }
  }, [orders, allOrders])

  // Filtered orders
  const filtered = useMemo(() => {
    let result = orders
    if (filter !== 'todos') {
      result = result.filter((o) => o.status === filter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((o) => o.vendor_client.toLowerCase().includes(q))
    }
    return result
  }, [orders, filter, search])

  const userRole = profile?.role ?? 'vendedor'

  return (
    <div className="px-4 md:px-6 py-5 max-w-4xl mx-auto">
      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <MetricCard label="Recibidos" value={metrics.recibidos} color="var(--status-recibido)" />
        <MetricCard label="En Tránsito" value={metrics.enTransito} color="var(--status-transito)" />
        <MetricCard label="Entregados Hoy" value={metrics.entregadosHoy} color="var(--status-entregado)" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-1 p-1 rounded-lg border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className="px-3 py-1.5 rounded-md text-sm transition-all"
              style={{
                background: filter === tab.id ? 'var(--bg-surface)' : 'transparent',
                color: filter === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: filter === tab.id ? 500 : 400,
              }}
            >
              {tab.label}
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
            placeholder="Buscar cliente..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Order list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" style={{ background: 'var(--bg-card)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {search ? 'Sin resultados para esta búsqueda.' : 'No hay pedidos activos.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              userRole={userRole}
              onViewDetail={setSelectedOrder}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      <OrderDetailModal
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        userRole={userRole}
      />
    </div>
  )
}

function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="rounded-lg border p-4 text-center"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
    >
      <p className="text-2xl font-bold font-mono" style={{ color }}>{value}</p>
      <p className="text-xs mt-1 leading-tight" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  )
}
