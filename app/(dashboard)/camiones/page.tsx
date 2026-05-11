'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, Truck } from 'lucide-react'
import { useShipments } from '@/lib/hooks/useShipments'
import { useProfile } from '@/lib/hooks/useProfile'
import { ShipmentStatusBadge } from '@/components/shipments/ShipmentStatusBadge'
import { ShipmentDetailModal } from '@/components/shipments/ShipmentDetailModal'
import { Skeleton } from '@/components/ui/skeleton'
import type { ShipmentStatus } from '@/lib/types/database'

type FilterTab = 'todos' | ShipmentStatus

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'programado', label: 'Programados' },
  { id: 'en_camino', label: 'En Camino' },
  { id: 'entregado', label: 'Entregados' },
]

export default function CamionesPage() {
  const { data: shipments = [], isLoading } = useShipments('all')
  const { data: profile } = useProfile()
  const [filter, setFilter] = useState<FilterTab>('todos')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const userRole = profile?.role ?? 'vendedor'

  const filtered = useMemo(() => {
    let result = shipments
    if (filter !== 'todos') {
      result = result.filter((s) => s.status === filter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (s) =>
          String(s.shipment_number).includes(q) ||
          (s.notes ?? '').toLowerCase().includes(q) ||
          (s.orders ?? []).some((o) =>
            (o.client?.name ?? o.vendor_client ?? '').toLowerCase().includes(q)
          )
      )
    }
    return result
  }, [shipments, filter, search])

  return (
    <div className="px-4 md:px-6 py-5 max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Historial de Camiones</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {shipments.length} camiones registrados
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-1 p-1 rounded-lg border overflow-x-auto" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className="px-3 py-1.5 rounded-md text-sm transition-all whitespace-nowrap"
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
            placeholder="Buscar camión, cliente o notas..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" style={{ background: 'var(--bg-card)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {search || filter !== 'todos' ? 'Sin camiones para este filtro.' : 'Aún no hay camiones consolidados.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((shipment) => {
            const orderCount = shipment.orders?.length ?? 0
            const units = (shipment.orders ?? []).reduce(
              (sum, o) => sum + (o.items ?? []).reduce((s, it) => s + (it.quantity ?? 0), 0),
              0
            )
            const weight = (shipment.orders ?? []).reduce(
              (sum, o) =>
                sum +
                (o.items ?? []).reduce((s, it) => s + (it.quantity ?? 0) * (it.product?.peso_kg ?? 0), 0),
              0
            )
            return (
              <button
                key={shipment.id}
                onClick={() => setSelectedId(shipment.id)}
                className="w-full text-left rounded-lg border p-4 transition-colors hover:bg-white/5"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Truck size={16} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-sm font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                      #{String(shipment.shipment_number).padStart(3, '0')}
                    </span>
                  </div>
                  <ShipmentStatusBadge status={shipment.status} size="sm" />
                </div>
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                  {format(new Date(shipment.created_at), "d 'de' MMM yyyy, HH:mm", { locale: es })}
                </p>
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span>{orderCount} pedido{orderCount !== 1 ? 's' : ''}</span>
                  <span>·</span>
                  <span>{units} unidades</span>
                  {weight > 0 && (
                    <>
                      <span>·</span>
                      <span className="font-mono">{weight.toFixed(1)} kg</span>
                    </>
                  )}
                </div>
                {shipment.notes && (
                  <p className="text-xs mt-2 truncate" style={{ color: 'var(--text-muted)' }}>
                    📝 {shipment.notes}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}

      <ShipmentDetailModal
        shipmentId={selectedId}
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        userRole={userRole}
      />
    </div>
  )
}
