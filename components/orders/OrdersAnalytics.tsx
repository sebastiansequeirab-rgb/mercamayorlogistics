'use client'

import { useMemo, useState } from 'react'
import type { Order } from '@/lib/types/database'

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

interface Props {
  orders: Order[]
  /**
   * Initial tab. Default: 'analisis'.
   */
  initialView?: 'analisis' | 'marcas' | 'items'
}

export function OrdersAnalytics({ orders, initialView = 'analisis' }: Props) {
  const [view, setView] = useState<'analisis' | 'marcas' | 'items'>(initialView)

  const productTotals = useMemo((): ProductTotal[] => {
    const totals = new Map<string, ProductTotal>()
    for (const order of orders) {
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
  }, [orders])

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
  const uniqueClients = useMemo(
    () => new Set(orders.map((o) => o.client?.name ?? o.vendor_client)).size,
    [orders]
  )

  const hasWeightData = grandTotalWeight > 0
  const maxBrandDisplay = brandGroups.length > 0
    ? Math.max(...brandGroups.map((g) => hasWeightData ? g.totalWeight : g.totalQuantity))
    : 1
  const maxProductQty = productTotals.length > 0 ? productTotals[0].quantity : 1

  if (orders.length === 0) {
    return (
      <div className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
        Sin pedidos para analizar.
      </div>
    )
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
      {/* Tab switcher */}
      <div className="flex border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
        {(['analisis', 'marcas', 'items'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className="flex-1 px-3 py-2 text-xs font-medium transition-colors"
            style={{
              background: view === v ? 'var(--accent-primary)' : 'transparent',
              color: view === v ? '#fff' : 'var(--text-muted)',
            }}
          >
            {v === 'analisis' ? 'Análisis' : v === 'marcas' ? 'Por Marca' : 'Por Ítem'}
          </button>
        ))}
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
                value: String(orders.length),
                sub: `${uniqueClients} cliente${uniqueClients !== 1 ? 's' : ''}`,
                color: '#8B5CF6',
              },
              {
                label: hasWeightData ? 'Kg / Pedido' : 'Unid / Pedido',
                value: hasWeightData
                  ? (grandTotalWeight / orders.length).toFixed(1)
                  : (grandTotalUnits / orders.length).toFixed(1),
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

          {/* Brand bars */}
          {brandGroups.length > 0 && (
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
          )}

          {/* Category distribution */}
          {categoryGroups.length > 1 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
                Distribución por Categoría
              </p>
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
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                {categoryGroups.map((g) => {
                  const color = CATEGORIA_COLORS[g.categoria] ?? '#6B7280'
                  const total = hasWeightData ? grandTotalWeight : grandTotalUnits
                  const value = hasWeightData ? g.totalWeight : g.totalQuantity
                  const pct = total > 0 ? (value / total) * 100 : 0
                  return (
                    <div key={g.categoria} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{g.categoria}</span>
                      <span className="text-xs font-mono font-semibold" style={{ color }}>
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Top products */}
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
              {orders.map((order, i, arr) => {
                const orderWeight = (order.items ?? []).reduce(
                  (sum, item) => sum + (item.product?.peso_kg ?? 0) * item.quantity,
                  0
                )
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
                          {order.client?.name ?? order.vendor_client}
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
  )
}
