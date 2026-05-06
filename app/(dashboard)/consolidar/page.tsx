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
}

type BrandGroup = {
  marca: string
  products: ProductTotal[]
  totalWeight: number
}

const MARCA_COLORS: Record<string, string> = {
  'De Primera':  '#F59E0B',
  'Key':         '#3B82F6',
  'La Rendidora':'#8B5CF6',
  'Tulipan':     '#22C55E',
}

export default function ConsolidarPage() {
  const { data: orders = [], isLoading } = useOrders('recibido')
  const { data: profile } = useProfile()
  const consolidar = useConsolidarOrders()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')
  const [view, setView] = useState<'items' | 'marcas'>('marcas')

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
        if (existing) {
          existing.quantity += item.quantity
        } else {
          totals.set(key, {
            name: item.product?.name ?? '—',
            code: item.product?.code ?? '—',
            quantity: item.quantity,
            marca: item.product?.marca ?? null,
            categoria: item.product?.categoria ?? null,
            peso_kg: item.product?.peso_kg ?? null,
          })
        }
      }
    }
    return Array.from(totals.values()).sort((a, b) => b.quantity - a.quantity)
  }, [orders, selectedIds])

  const brandGroups = useMemo((): BrandGroup[] => {
    const groups = new Map<string, ProductTotal[]>()
    for (const p of productTotals) {
      const key = p.marca ?? 'Sin marca'
      const arr = groups.get(key) ?? []
      arr.push(p)
      groups.set(key, arr)
    }
    return Array.from(groups.entries())
      .map(([marca, products]) => ({
        marca,
        products,
        totalWeight: products.reduce((sum, p) => sum + (p.peso_kg ?? 0) * p.quantity, 0),
      }))
      .sort((a, b) => b.totalWeight - a.totalWeight)
  }, [productTotals])

  const grandTotalWeight = useMemo(
    () => productTotals.reduce((sum, p) => sum + (p.peso_kg ?? 0) * p.quantity, 0),
    [productTotals]
  )

  async function handleConsolidar() {
    if (selectedIds.size === 0) {
      toast.error('Selecciona al menos un pedido')
      return
    }
    try {
      await consolidar.mutateAsync(Array.from(selectedIds))
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
        <div
          className="rounded-xl border p-8 text-center"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tienes permisos para esta sección.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 md:px-6 py-5 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Consolidar Envío</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Selecciona los pedidos recibidos para enviar al camión Valencia → Caracas
        </p>
      </div>

      {/* Order selection */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
        <div
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Pedidos Recibidos
            {selectedIds.size > 0 && (
              <span className="ml-2 text-xs font-normal" style={{ color: 'var(--accent-primary)' }}>
                ({selectedIds.size} seleccionado{selectedIds.size > 1 ? 's' : ''})
              </span>
            )}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedIds(new Set(orders.map((o) => o.id)))}
              className="text-xs hover:underline"
              style={{ color: 'var(--text-muted)' }}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs hover:underline"
              style={{ color: 'var(--text-muted)' }}
            >
              Limpiar
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2" style={{ background: 'var(--bg-card)' }}>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" style={{ background: 'var(--bg-surface)' }} />
            ))}
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
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSelect(order.id)}
                    className="mt-0.5 shrink-0 accent-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-muted)' }}>
                        #{String(order.order_number).padStart(3, '0')}
                      </span>
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {order.vendor_client}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {order.price_list === 'lista_50' ? 'Lista 50' : 'Lista 60'}
                      {' · '}
                      {order.billing_type === 'factura' ? 'Factura' : 'Nota de Entrega'}
                      {' · '}
                      {(order.items ?? []).length} producto{(order.items ?? []).length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </label>
              )
            })}
          </div>
        )}
      </div>

      {/* Consolidated view */}
      {selectedIds.size > 0 && productTotals.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
          {/* Panel header with view toggle */}
          <div
            className="px-4 py-3 border-b flex items-center justify-between"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Consolidado{' '}
                <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>
                  ({selectedIds.size} pedido{selectedIds.size > 1 ? 's' : ''})
                </span>
              </p>
              {grandTotalWeight > 0 && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--accent-primary)' }}>
                  Peso total estimado: <span className="font-bold font-mono">{grandTotalWeight.toFixed(1)} kg</span>
                </p>
              )}
            </div>
            {/* View toggle */}
            <div
              className="flex rounded-md overflow-hidden border text-xs"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {(['marcas', 'items'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="px-3 py-1.5 font-medium transition-colors"
                  style={{
                    background: view === v ? 'var(--accent-primary)' : 'transparent',
                    color: view === v ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  {v === 'marcas' ? 'Por Marca' : 'Por Ítem'}
                </button>
              ))}
            </div>
          </div>

          {/* By brand */}
          {view === 'marcas' && (
            <div style={{ background: 'var(--bg-card)' }}>
              {brandGroups.map((group, gi) => {
                const color = MARCA_COLORS[group.marca] ?? 'var(--text-muted)'
                return (
                  <div
                    key={group.marca}
                    style={{ borderBottom: gi < brandGroups.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                  >
                    {/* Brand header */}
                    <div
                      className="flex items-center justify-between px-4 py-2.5"
                      style={{ background: 'var(--bg-surface)' }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: color }}
                        />
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>
                          {group.marca}
                        </span>
                      </div>
                      {group.totalWeight > 0 && (
                        <span className="text-xs font-mono font-semibold" style={{ color }}>
                          {group.totalWeight.toFixed(1)} kg
                        </span>
                      )}
                    </div>
                    {/* Brand products */}
                    {group.products.map((p, pi) => (
                      <div
                        key={p.code}
                        className="flex items-center justify-between px-4 py-3 pl-8"
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
                              {(p.peso_kg * p.quantity).toFixed(1)} kg total · {p.peso_kg} kg/u
                            </p>
                          )}
                        </div>
                        <span
                          className="text-sm font-bold font-mono ml-4 shrink-0"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          ×{p.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}

          {/* By item (flat list) */}
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
                    {p.peso_kg != null && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {(p.peso_kg * p.quantity).toFixed(1)} kg total
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
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
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
