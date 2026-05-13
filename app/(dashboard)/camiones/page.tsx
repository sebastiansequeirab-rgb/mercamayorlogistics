'use client'

export const dynamic = 'force-dynamic'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { useShipments } from '@/lib/hooks/useShipments'
import { ShipmentCard } from '@/components/shipments/ShipmentCard'
import { Skeleton } from '@/components/ui/skeleton'
import type { ShipmentStatus } from '@/lib/types/database'

type FilterValue = ShipmentStatus | 'all'

const FILTERS: { value: FilterValue; label: string; color: string }[] = [
  { value: 'all', label: 'Todos', color: 'var(--text-muted)' },
  { value: 'programado', label: 'Programado', color: '#F59E0B' },
  { value: 'en_camino', label: 'En camino', color: '#3B82F6' },
  { value: 'entregado', label: 'Entregado', color: '#22C55E' },
]

export default function CamionesPage() {
  const router = useRouter()

  const [filter, setFilter] = useState<FilterValue>('all')
  const [search, setSearch] = useState('')

  const { data: shipments = [], isLoading } = useShipments(filter)

  const q = search.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!q) return shipments
    return shipments.filter(
      (s) =>
        String(s.shipment_number).includes(q) ||
        (s.name ?? '').toLowerCase().includes(q) ||
        (s.notes ?? '').toLowerCase().includes(q) ||
        (s.orders ?? []).some((o) =>
          (o.client?.name ?? o.vendor_client ?? '').toLowerCase().includes(q)
        )
    )
  }, [shipments, q])

  return (
    <div className="px-4 md:px-6 py-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Camiones</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Todos los camiones consolidados. Click para ver pedidos y cambiar estado.
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg border w-full sm:w-80"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar camión, nombre o cliente..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map((f) => {
          const active = filter === f.value
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className="px-3 py-1 rounded-full text-xs border transition-colors"
              style={{
                background: active ? f.color : 'transparent',
                borderColor: active ? f.color : 'var(--border-subtle)',
                color: active ? '#0a0a0a' : 'var(--text-secondary)',
                fontWeight: active ? 600 : 400,
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" style={{ background: 'var(--bg-card)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {q ? 'Sin resultados.' : 'Aún no hay camiones consolidados.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((shipment) => (
            <ShipmentCard
              key={shipment.id}
              shipment={shipment}
              onView={(sid) => router.push(`/camiones/${sid}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
