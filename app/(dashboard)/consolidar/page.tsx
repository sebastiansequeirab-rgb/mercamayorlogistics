'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import { useOrders, useConsolidarOrders } from '@/lib/hooks/useOrders'
import { useProfile } from '@/lib/hooks/useProfile'
import { Skeleton } from '@/components/ui/skeleton'
import toast from 'react-hot-toast'

type ProductTotal = {
  name: string
  code: string
  quantity: number
  marca: string | null
  categoria: string | null
  peso_kg: number | null
  totalWeight: number
}

type BrandGroup = {
  marca: string
  products: ProductTotal[]
  totalWeight: number
  totalQuantity: number
}

type CategoryGroup = {
  categoria: string
  totalWeight: number
  totalQuantity: number
}

const MARCA_COLORS: Record<string, string> = {
  'De Primera':   '#F59E0B',
  'Key':          '#3B82F6',
  'La Rendidora': '#8B5CF6',
  'Tulipan':      '#22C55E',
}

const CATEGORIA_COLORS: Record<string, string> = {
  'Aceite de Palma':  '#F59E0B',
  'Aceite Vegetal':   '#3B82F6',
  'Manteca Vegetal':  '#8B5CF6',
  'Margarina':        '#EC4899',
  'Mayonesa':         '#F97316',
  'Oleina de Palma':  '#22C55E',
}

export default function ConsolidarPage() {
  const { data: orders = [], isLoading } = useOrders('recibido')
  const { data: profile } = useProfile()
  const consolidar = useConsolidarOrders()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')
  const [view, setView] = useState<'analisis' | 'marcas' | 'items'>('analisis')

  const userRole = profile?.role ?? 'vendedor'
  const canConsolidar = userRole === 'admin' || userRole === 'gestora'

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const productTotals = useMemo((): ProductTotal[] => {
    const selectedOrders = orders.filter((o) => selectedIds.has(o.id))
    const totals = new Map<string, ProductTotal>()
    for (const order of selectedOrders) {
      for (const item of order.items ?? []) {
        const key = item.product_id
        const existing = totals.get(key)
        const pesoKg = item.product?.peso_kg ?? null
        if (existing) {
          existing.quantity += item.quantity
          existing.totalWeight += (pesoKg ?? 0) * item.quantity
        } else {
          totals.set(key, {
            name: item.product?.name ?? '—',
            code: item.product?.code ?? '—',
            quantity: item.quantity,
            marca: item.product?.marca ?? null,
            categoria: item.product?.categoria ?? null,
            peso_kg: pesoKg,
            totalWeight: (pesoKg ?? 0) * item.quantity,
          })
        }
      }
    }
    return Array.from(totals.values()).sort((a, b) => b.quantity - a.quantity)
  }, [orders, selectedIds])

  const brandGroups = useMemo((): BrandGroup[] => {
    const groups = new Map<string, { products: ProductTotal[]; totalWeight: number; totalQuantity: number }>()
    for (const p of productTotals) {
      const key = p.marca ?? 'Sin marca'
      const g = groups.get(key) ?? { products: [], totalWeight: 0, totalQuantity: 0 }
      g.products.push(p)
      g.totalWeight += p.totalWeight
      g.totalQuantity += p.quantity
      groups.set(key, g)
    }
    return Array.from(groups.entries())
      .map(([marca, g]) => ({ marca, ...g }))
      .sort((a, b) => b.totalWeight - a.totalWeight || b.totalQuantity - a.totalQuantity)
  }, [productTotals])

  const categoryGroups = useMemo((): CategoryGroup[] => {
    const groups = new Map<string, { totalWeight: number; totalQuantity: number }>()
    for (const p of productTotals) {
      const key = p.categoria ?? 'Sin categoría'
      const g = groups.get(key) ?? { totalWeight: 0, totalQuantity: 0 }
      g.totalWeight += p.totalWeight
      g.totalQuantity += p.quantity
      groups.set(key, g)
    }
    return Array.from(groups.entries())
      .map(([categoria, g]) => ({ categoria, ...g }))
      .sort((a, b) => b.totalWeight - a.totalWeight || b.totalQuantity - a.totalQuantity)
  }, [productTotals])

  const grandTotalWeight = useMemo(
    () => productTotals.reduce((sum, p) => sum + p.totalWeight, 0),
    [productTotals]
  )

  const grandTotalUnits = useMemo(
    () => productTotals.reduce((sum, p) => sum + p.quantity, 0),
    [productTotals]
  )

  const uniqueClients = useMemo(() => {
    const selected = orders.filter((o) => selectedIds.has(o.id))
    return new Set(selected.map((o) => o.vendor_client)).size
  }, [orders, selectedIds])

  async function handleConsolidar() {
    if (selectedIds.size === 0) {
      toast.error('Selecciona al menos un pedido')
      return
    }
    try {
      await consolidar.mutateAsync({ orderIds: Array.from(selectedIds), notes })
      const n = selectedIds.size
      toast.success(`🚛 ${n} pedido${n > 1 ? 's' : ''} enviado${n > 1 ? 's' : ''} al camión`)
      setSelectedIds(new Set())
      setNotes('')
    } catch {
      toast.error('Error al consolidar pedidos')
    }
  }

  if (!canConsolidar) {
    return (
      <div className="px-4 md:px-6 py-5 max-w-4xl mx-auto">
        <div className="rounded-xl border p-8 text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tienes permisos para esta sección.</p>
        </div>
      </div>
    )
  }

  const hasWeightData = grandTotalWeight > 0
  const maxBrandDisplay = brandGroups.length > 0
    ? Math.max(...brandGroups.map((g) => hasWeightData ? g.totalWeight : g.totalQuantity))
    : 1
  const maxProductQty = productTotals.length > 0 ? productTotals[0].quantity : 1

  return (
    <div className="px-4 md:px-6 py-5 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Consolidar Camión</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Selecciona los pedidos recibidos para enviar al camión Valencia → Caracas
        </p>
      </div>

      {/* Order selection */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Pedidos Recibidos
            {selectedIds.size > 0 && (
              <span className="ml-2 text-xs font-normal" style={{ color: 'var(--accent-primary)' }}>
                ({selectedIds.size} seleccionado{selectedIds.size > 1 ? 's' : ''})
              </span>
            )}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setSelectedIds(new Set(orders.map((o) => o.id)))} className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>Todos</button>
            <button onClick={() => setSelectedIds(new Set())} className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>Limpiar</button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2" style={{ background: 'var(--bg-card)' }}>
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" style={{ background: 'var(--bg-surface)' }} />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
            No hay pedidos recibidos pendientes.
          </div>
        ) : (
          <div style={{ background: 'var(--bg-card)' }}>
            {orders.map((order, i) => {
              const selected = selectedIds.has(order.id)
              return (
                <label
                  key={order.id}
                  className="flex items-start gap-3 px-4 py-3.5 cursor-pointer hover:bg-white/5 transition-colors"
                  style={{
                    borderBottom: i < orders.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    background: selected ? 'rgba(37,99,235,0.05)' : 'transparent',
                  }}
                >
                  <input type="checkbox" checked={selected} onChange={() => toggleSelect(order.id)} className="mt-0.5 shrink-0 accent-blue-500" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-muted)' }}>#{String(order.order_number).padStart(3, '0')}</span>
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{order.vendor_client}</span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {order.price_list === 'lista_50' ? 'Lista 50' : 'Lista 60'}{' · '}
                      {order.billing_type === 'factura' ? 'Factura' : 'Nota de Entrega'}{' · '}
                      {(order.items ?? []).length} producto{(order.items ?? []).length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </label>
              )
            })}
          </div>
        )}
      </div>

      {/* Analysis + detail panel */}
      {selectedIds.size > 0 && productTotals.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
          {/* Panel header + tabs */}
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Resumen del Camión</p>
              {hasWeightData && (
                <p className="text-xs mt-0.5 font-mono font-bold" style={{ color: 'var(--accent-primary)' }}>
                  {grandTotalWeight.toFixed(1)} kg · {grandTotalUnits} unidades
                </p>
              )}
            </div>
            <div className="flex rounded-lg overflow-hidden border text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
              {(['analisis', 'marcas', 'items'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="px-3 py-1.5 font-medium transition-colors"
                  style={{
                    background: view === v ? 'var(--accent-primary)' : 'transparent',
                    color: view === v ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  {v === 'analisis' ? 'Análisis' : v === 'marcas' ? 'Por Marca' : 'Por Ítem'}
                </button>
              ))}
            </div>
          </div>

          {/* ── ANÁLISIS ── */}
          {view === 'analisis' && (
            <div className="p-4 space-y-6" style={{ background: 'var(--bg-card)' }}>

              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    label: 'Peso Total',
                    value: hasWeightData ? `${grandTotalWeight.toFixed(1)} kg` : '—',
                    sub: hasWeightData ? 'estimado' : 'sin datos de peso',
                    color: 'var(--accent-primary)',
                  },
                  {
                    label: 'Unidades',
                    value: grandTotalUnits.toLocaleString('es-VE'),
                    sub: `${productTotals.length} SKU${productTotals.length !== 1 ? 's' : ''}`,
                    color: '#3B82F6',
                  },
                  {
                    label: 'Pedidos',
                    value: String(selectedIds.size),
                    sub: `${uniqueClients} cliente${uniqueClients !== 1 ? 's' : ''}`,
                    color: '#8B5CF6',
                  },
                  {
                    label: hasWeightData ? 'Kg / Pedido' : 'Unid / Pedido',
                    value: hasWeightData
                      ? (grandTotalWeight / selectedIds.size).toFixed(1)
                      : (grandTotalUnits / selectedIds.size).toFixed(1),
                    sub: 'promedio',
                    color: '#F59E0B',
                  },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl p-3 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                    <p className="text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                    <p className="text-2xl font-bold font-mono leading-none" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Weight / Quantity by brand */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
                  {hasWeightData ? 'Carga por Marca (kg)' : 'Volumen por Marca (unidades)'}
                </p>
                <div className="space-y-4">
                  {brandGroups.map((g) => {
                    const color = MARCA_COLORS[g.marca] ?? '#6B7280'
                    const displayValue = hasWeightData ? g.totalWeight : g.totalQuantity
                    const pct = maxBrandDisplay > 0 ? (displayValue / maxBrandDisplay) * 100 : 0
                    const shareOfTotal = hasWeightData && grandTotalWeight > 0
                      ? (g.totalWeight / grandTotalWeight) * 100
                      : grandTotalUnits > 0
                        ? (g.totalQuantity / grandTotalUnits) * 100
                        : 0
                    return (
                      <div key={g.marca}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{g.marca}</span>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {g.products.length} SKU{g.products.length !== 1 ? 's' : ''} · ×{g.totalQuantity}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold font-mono" style={{ color }}>
                              {hasWeightData ? `${g.totalWeight.toFixed(1)} kg` : `×${g.totalQuantity}`}
                            </span>
                            <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                              {shareOfTotal.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: `linear-gradient(90deg, ${color}cc, ${color})`,
                              transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Category distribution bar */}
              {categoryGroups.length > 1 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
                    Distribución por Categoría
                  </p>
                  {/* Segmented bar */}
                  <div className="h-7 rounded-xl overflow-hidden flex gap-px" style={{ background: 'var(--bg-surface)' }}>
                    {categoryGroups.map((g) => {
                      const color = CATEGORIA_COLORS[g.categoria] ?? '#6B7280'
                      const total = hasWeightData ? grandTotalWeight : grandTotalUnits
                      const value = hasWeightData ? g.totalWeight : g.totalQuantity
                      const pct = total > 0 ? (value / total) * 100 : 0
                      if (pct < 1) return null
                      return (
                        <div
                          key={g.categoria}
                          title={`${g.categoria}: ${hasWeightData ? `${g.totalWeight.toFixed(1)} kg` : `×${g.totalQuantity}`} (${pct.toFixed(1)}%)`}
                          style={{
                            width: `${pct}%`,
                            background: color,
                            opacity: 0.85,
                            transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                            minWidth: pct > 3 ? undefined : '2px',
                          }}
                        />
                      )
                    })}
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                    {categoryGroups.map((g) => {
                      const color = CATEGORIA_COLORS[g.categoria] ?? '#6B7280'
                      const total = hasWeightData ? grandTotalWeight : grandTotalUnits
                      const value = hasWeightData ? g.totalWeight : g.totalQuantity
                      const pct = total > 0 ? (value / total) * 100 : 0
                      return (
                        <div key={g.categoria} className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {g.categoria}
                          </span>
                          <span className="text-xs font-mono font-semibold" style={{ color }}>
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Top products by quantity */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
                  Top Productos
                </p>
                <div className="space-y-3">
                  {productTotals.slice(0, 12).map((p, i) => {
                    const color = MARCA_COLORS[p.marca ?? ''] ?? '#6B7280'
                    const pct = maxProductQty > 0 ? (p.quantity / maxProductQty) * 100 : 0
                    return (
                      <div key={p.code} className="flex items-center gap-3">
                        <span
                          className="text-xs font-mono w-5 text-right shrink-0 font-bold"
                          style={{ color: i < 3 ? color : 'var(--text-muted)' }}
                        >
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="min-w-0 flex-1 mr-3">
                              <span className="text-xs font-medium block truncate" style={{ color: 'var(--text-primary)' }}>
                                {p.name}
                              </span>
                              {p.marca && (
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.marca}</span>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-sm font-bold font-mono block" style={{ color }}>×{p.quantity}</span>
                              {p.totalWeight > 0 && (
                                <span className="text-xs font-mono block" style={{ color: 'var(--text-muted)' }}>
                                  {p.totalWeight.toFixed(0)} kg
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                background: color,
                                opacity: 0.7,
                                transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Per-order breakdown */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                  Detalle por Pedido
                </p>
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
                  {orders.filter((o) => selectedIds.has(o.id)).map((order, i, arr) => {
                    const orderWeight = (order.items ?? []).reduce((sum, item) => {
                      return sum + (item.product?.peso_kg ?? 0) * item.quantity
                    }, 0)
                    const orderUnits = (order.items ?? []).reduce((s, it) => s + it.quantity, 0)
                    return (
                      <div
                        key={order.id}
                        className="flex items-center justify-between px-3 py-2.5"
                        style={{
                          borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                          background: i % 2 === 0 ? 'var(--bg-surface)' : 'transparent',
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold shrink-0" style={{ color: 'var(--text-muted)' }}>
                              #{String(order.order_number).padStart(3, '0')}
                            </span>
                            <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                              {order.vendor_client}
                            </span>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {(order.items ?? []).length} SKUs · ×{orderUnits}
                          </p>
                        </div>
                        {hasWeightData && orderWeight > 0 && (
                          <span className="text-sm font-mono font-semibold ml-3 shrink-0" style={{ color: 'var(--accent-primary)' }}>
                            {orderWeight.toFixed(1)} kg
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── POR MARCA ── */}
          {view === 'marcas' && (
            <div style={{ background: 'var(--bg-card)' }}>
              {brandGroups.map((group, gi) => {
                const color = MARCA_COLORS[group.marca] ?? '#6B7280'
                return (
                  <div key={group.marca} style={{ borderBottom: gi < brandGroups.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <div className="flex items-center justify-between px-4 py-2.5" style={{ background: 'var(--bg-surface)' }}>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{group.marca}</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>×{group.totalQuantity}</span>
                      </div>
                      {group.totalWeight > 0 && (
                        <span className="text-xs font-mono font-semibold" style={{ color }}>
                          {group.totalWeight.toFixed(1)} kg
                        </span>
                      )}
                    </div>
                    {group.products.map((p, pi) => (
                      <div
                        key={p.code}
                        className="flex items-center justify-between px-4 py-3 pl-9"
                        style={{
                          borderTop: '1px solid var(--border-subtle)',
                          background: pi % 2 === 0 ? 'var(--bg-card)' : 'rgba(255,255,255,0.02)',
                        }}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{p.code}</p>
                          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                          {p.peso_kg != null && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {p.totalWeight.toFixed(1)} kg total · {p.peso_kg} kg/u
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-bold font-mono ml-4 shrink-0" style={{ color: 'var(--accent-primary)' }}>
                          ×{p.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── POR ÍTEM ── */}
          {view === 'items' && (
            <div style={{ background: 'var(--bg-card)' }}>
              {productTotals.map((p, i) => (
                <div
                  key={p.code}
                  className="flex items-center justify-between px-4 py-3"
                  style={{
                    borderBottom: i < productTotals.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-surface)',
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{p.code}</p>
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                    {p.totalWeight > 0 && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {p.totalWeight.toFixed(1)} kg total
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-bold font-mono ml-4 shrink-0" style={{ color: 'var(--accent-primary)' }}>
                    ×{p.quantity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notes + action */}
      <div className="space-y-3">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas del envío (opcional)..."
          rows={2}
          className="w-full rounded-lg px-3 py-2.5 text-sm border outline-none resize-none"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
        />
        <button
          onClick={handleConsolidar}
          disabled={consolidar.isPending || selectedIds.size === 0}
          className="w-full py-3 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
          style={{ background: 'var(--accent-primary)', color: '#fff' }}
        >
          {consolidar.isPending
            ? 'Procesando...'
            : `🚛 Enviar al Camión (${selectedIds.size} pedido${selectedIds.size !== 1 ? 's' : ''})`}
        </button>
      </div>
    </div>
  )
}
