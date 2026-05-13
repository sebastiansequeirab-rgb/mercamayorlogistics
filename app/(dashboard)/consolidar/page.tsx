'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Minus, Package2, Plus, Scale } from 'lucide-react'
import { useOrders, useConsolidarOrders } from '@/lib/hooks/useOrders'
import { useProfile } from '@/lib/hooks/useProfile'
import { OrdersAnalytics } from '@/components/orders/OrdersAnalytics'
import { ConsolidarConfirmDialog } from '@/components/shipments/ConsolidarConfirmDialog'
import { PRICE_LIST_LABELS, BILLING_TYPE_LABELS } from '@/lib/utils/order-status'
import { Skeleton } from '@/components/ui/skeleton'
import toast from 'react-hot-toast'
import type { Order, ShipmentAllocationInput } from '@/lib/types/database'

type AllocMap = Map<string, number> // key = `${order_id}:${product_id}`

function allocKey(orderId: string, productId: string) {
  return `${orderId}:${productId}`
}

export default function ConsolidarPage() {
  const { data: orders = [], isLoading } = useOrders('recibido')
  const { data: profile } = useProfile()
  const consolidar = useConsolidarOrders()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [overrides, setOverrides] = useState<AllocMap>(new Map())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [bottomView, setBottomView] = useState<'analytics' | 'por_item'>('analytics')

  const userRole = profile?.role ?? 'vendedor'
  const canConsolidar = userRole === 'admin' || userRole === 'gestora'

  function getQty(order: Order, productId: string, defaultQty: number): number {
    const k = allocKey(order.id, productId)
    return overrides.has(k) ? (overrides.get(k) as number) : defaultQty
  }

  function setQty(orderId: string, productId: string, qty: number, max: number) {
    const clamped = Math.max(0, Math.min(max, Math.floor(qty)))
    setOverrides((prev) => {
      const next = new Map(prev)
      next.set(allocKey(orderId, productId), clamped)
      return next
    })
  }

  function resetOrderToFull(order: Order) {
    setOverrides((prev) => {
      const next = new Map(prev)
      for (const it of order.items ?? []) {
        next.delete(allocKey(order.id, it.product_id))
      }
      return next
    })
  }

  function toggleSelect(order: Order) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(order.id)) {
        next.delete(order.id)
        // Limpiar overrides cuando se deselecciona
        setOverrides((o) => {
          const m = new Map(o)
          for (const it of order.items ?? []) {
            m.delete(allocKey(order.id, it.product_id))
          }
          return m
        })
      } else {
        next.add(order.id)
        // Auto-expandir
        setExpandedIds((e) => new Set(e).add(order.id))
      }
      return next
    })
  }

  function toggleExpand(orderId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) next.delete(orderId)
      else next.add(orderId)
      return next
    })
  }

  const selectedOrders = useMemo(
    () => orders.filter((o) => selectedIds.has(o.id)),
    [orders, selectedIds]
  )

  // Allocations actuales: por cada item de cada orden seleccionada, la cantidad que va al camión.
  const allocations: ShipmentAllocationInput[] = useMemo(() => {
    const out: ShipmentAllocationInput[] = []
    for (const o of selectedOrders) {
      for (const it of o.items ?? []) {
        const q = getQty(o, it.product_id, it.quantity)
        if (q > 0) {
          out.push({ order_id: o.id, product_id: it.product_id, quantity: q })
        }
      }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrders, overrides])

  const totalUnits = useMemo(() => allocations.reduce((s, a) => s + a.quantity, 0), [allocations])

  const totalWeight = useMemo(() => {
    let w = 0
    for (const o of selectedOrders) {
      for (const it of o.items ?? []) {
        const q = getQty(o, it.product_id, it.quantity)
        w += (it.product?.peso_kg ?? 0) * q
      }
    }
    return w
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrders, overrides])

  // Agregado por producto para la vista "Por Ítem"
  const byProduct = useMemo(() => {
    const map = new Map<
      string,
      {
        code: string
        name: string
        marca: string | null
        unit: string
        consolidated: number
        requested: number
        weight: number
      }
    >()
    for (const o of selectedOrders) {
      for (const it of o.items ?? []) {
        const q = getQty(o, it.product_id, it.quantity)
        const k = it.product_id
        const ex = map.get(k)
        const peso = it.product?.peso_kg ?? 0
        if (ex) {
          ex.consolidated += q
          ex.requested += it.quantity
          ex.weight += peso * q
        } else {
          map.set(k, {
            code: it.product?.code ?? '—',
            name: it.product?.name ?? '—',
            marca: it.product?.marca ?? null,
            unit: it.product?.unit ?? 'u',
            consolidated: q,
            requested: it.quantity,
            weight: peso * q,
          })
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.consolidated - a.consolidated)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrders, overrides])

  function openConfirm() {
    if (allocations.length === 0) {
      toast.error('Selecciona al menos un ítem')
      return
    }
    setConfirmOpen(true)
  }

  async function handleConfirm({ name, notes }: { name: string; notes: string }) {
    try {
      await consolidar.mutateAsync({
        allocations,
        name,
        notes: notes || undefined,
      })
      const nOrders = selectedIds.size
      toast.success(`🚛 Camión "${name}" creado con ${nOrders} pedido${nOrders > 1 ? 's' : ''}`)
      setSelectedIds(new Set())
      setExpandedIds(new Set())
      setOverrides(new Map())
      setConfirmOpen(false)
    } catch {
      toast.error('Error al crear el camión')
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

  return (
    <div className="px-4 md:px-6 py-5 max-w-5xl mx-auto space-y-5 pb-32">
      <div>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Consolidar</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Selecciona pedidos. Ajusta cantidades por ítem si quieres dejar saldo pendiente para otro camión.
        </p>
      </div>

      {/* Order list */}
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
            <button onClick={() => { setSelectedIds(new Set()); setOverrides(new Map()) }} className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>Limpiar</button>
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
              const expanded = expandedIds.has(order.id)
              const items = order.items ?? []
              const totalRequested = items.reduce((s, it) => s + it.quantity, 0)
              const totalConsolidated = items.reduce(
                (s, it) => s + (selected ? getQty(order, it.product_id, it.quantity) : 0),
                0
              )
              const totalWeightOrder = items.reduce(
                (s, it) => s + (it.product?.peso_kg ?? 0) * (selected ? getQty(order, it.product_id, it.quantity) : 0),
                0
              )
              const isPartial =
                selected && (totalConsolidated < totalRequested || totalConsolidated === 0)

              return (
                <div
                  key={order.id}
                  style={{
                    borderBottom: i < orders.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    background: selected ? 'rgba(37,99,235,0.05)' : 'transparent',
                  }}
                >
                  <div
                    onClick={() => toggleSelect(order)}
                    className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      readOnly
                      tabIndex={-1}
                      className="shrink-0 accent-blue-500 pointer-events-none"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-muted)' }}>
                          #{String(order.order_number).padStart(3, '0')}
                        </span>
                        <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {order.client?.name ?? order.vendor_client}
                        </span>
                        {selected && isPartial && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                            style={{ color: '#F59E0B', background: 'rgba(245,158,11,0.1)' }}
                          >
                            PARCIAL
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {PRICE_LIST_LABELS[order.price_list]}{' · '}
                        {BILLING_TYPE_LABELS[order.billing_type]}{' · '}
                        {items.length} producto{items.length !== 1 ? 's' : ''}
                        {selected
                          ? ` · ${totalConsolidated}/${totalRequested} unid`
                          : ` · ×${totalRequested}`}
                      </p>
                    </div>
                    {selected && totalWeightOrder > 0 && (
                      <span
                        className="text-xs font-mono font-semibold shrink-0 px-2 py-1 rounded"
                        style={{ color: 'var(--accent-primary)', background: 'rgba(59,130,246,0.1)' }}
                      >
                        {totalWeightOrder.toFixed(1)} kg
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleExpand(order.id)
                      }}
                      className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
                      aria-label={expanded ? 'Contraer' : 'Expandir'}
                    >
                      {expanded ? (
                        <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
                      ) : (
                        <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                      )}
                    </button>
                  </div>

                  {/* Items con cantidad editable cuando está seleccionado */}
                  {expanded && items.length > 0 && (
                    <div
                      className="px-4 pb-4 pt-1 space-y-2"
                      style={{ background: 'var(--bg-surface)' }}
                    >
                      {selected && (
                        <div className="flex items-center justify-end gap-2 text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                          <button
                            type="button"
                            onClick={() => resetOrderToFull(order)}
                            className="hover:underline"
                          >
                            Restablecer a completa
                          </button>
                          <span>·</span>
                          <button
                            type="button"
                            onClick={() => {
                              for (const it of items) setQty(order.id, it.product_id, 0, it.quantity)
                            }}
                            className="hover:underline"
                          >
                            Vaciar
                          </button>
                        </div>
                      )}
                      {order.notes && (
                        <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>📝 {order.notes}</p>
                      )}
                      <div className="rounded-md overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
                        {items.map((item, j) => {
                          const q = selected ? getQty(order, item.product_id, item.quantity) : item.quantity
                          const peso = item.product?.peso_kg ?? 0
                          const itemWeight = peso * q
                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-3 px-3 py-2.5"
                              style={{
                                borderTop: j > 0 ? '1px solid var(--border-subtle)' : 'none',
                                background: j % 2 === 0 ? 'var(--bg-card)' : 'transparent',
                              }}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                                  {item.product?.code ?? '—'}
                                </p>
                                <p className="text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>
                                  {item.product?.name ?? '—'}
                                </p>
                                {peso > 0 && (
                                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                    {peso} kg/u
                                  </p>
                                )}
                              </div>

                              {selected ? (
                                <div className="flex items-center gap-2 shrink-0">
                                  <div
                                    className="flex items-center rounded-md border overflow-hidden"
                                    style={{ borderColor: 'var(--border-subtle)' }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => setQty(order.id, item.product_id, q - 1, item.quantity)}
                                      disabled={q <= 0}
                                      className="px-2 py-1 hover:bg-white/5 disabled:opacity-30"
                                      aria-label="Disminuir"
                                    >
                                      <Minus size={12} style={{ color: 'var(--text-secondary)' }} />
                                    </button>
                                    <input
                                      type="number"
                                      min={0}
                                      max={item.quantity}
                                      value={q}
                                      onChange={(e) => setQty(order.id, item.product_id, parseInt(e.target.value || '0', 10), item.quantity)}
                                      className="w-12 text-center text-sm font-mono font-bold bg-transparent outline-none"
                                      style={{ color: q === 0 ? 'var(--text-muted)' : 'var(--accent-primary)' }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setQty(order.id, item.product_id, q + 1, item.quantity)}
                                      disabled={q >= item.quantity}
                                      className="px-2 py-1 hover:bg-white/5 disabled:opacity-30"
                                      aria-label="Aumentar"
                                    >
                                      <Plus size={12} style={{ color: 'var(--text-secondary)' }} />
                                    </button>
                                  </div>
                                  <span className="text-xs font-mono shrink-0 min-w-[40px] text-right" style={{ color: 'var(--text-muted)' }}>
                                    / {item.quantity}
                                  </span>
                                  {itemWeight > 0 && (
                                    <span className="text-xs font-mono shrink-0 min-w-[55px] text-right" style={{ color: 'var(--text-muted)' }}>
                                      {itemWeight.toFixed(1)} kg
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm font-bold font-mono shrink-0" style={{ color: 'var(--accent-primary)' }}>
                                  ×{item.quantity}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom: tabs + analytics or per-item view */}
      {selectedOrders.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
            {(['analytics', 'por_item'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setBottomView(v)}
                className="flex-1 px-3 py-2 text-xs font-medium transition-colors"
                style={{
                  background: bottomView === v ? 'var(--accent-primary)' : 'transparent',
                  color: bottomView === v ? '#fff' : 'var(--text-muted)',
                }}
              >
                {v === 'analytics' ? 'Análisis del camión' : 'Resumen por Ítem'}
              </button>
            ))}
          </div>
          {bottomView === 'analytics' ? (
            <OrdersAnalytics orders={selectedOrders} hideBrands />
          ) : (
            <div style={{ background: 'var(--bg-card)' }}>
              {byProduct.length === 0 ? (
                <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  Aún no hay ítems para consolidar.
                </div>
              ) : (
                byProduct.map((p, i) => {
                  const partial = p.consolidated < p.requested
                  return (
                    <div
                      key={p.code}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                      style={{
                        borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none',
                        background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-surface)',
                      }}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{p.code}</p>
                        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                        {p.weight > 0 && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {p.weight.toFixed(1)} kg total
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold font-mono" style={{ color: partial ? '#F59E0B' : 'var(--accent-primary)' }}>
                          ×{p.consolidated}
                        </span>
                        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                          de {p.requested}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* Sticky action bar */}
      {selectedOrders.length > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 md:left-56 border-t z-20"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: 'var(--text-muted)' }}>
              <span className="flex items-center gap-1.5">
                <Package2 size={13} />
                <span style={{ color: 'var(--text-primary)' }} className="font-semibold">{selectedIds.size}</span> pedidos
              </span>
              <span>·</span>
              <span>
                <span style={{ color: 'var(--text-primary)' }} className="font-semibold font-mono">×{totalUnits}</span> unidades
              </span>
              {totalWeight > 0 && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1.5">
                    <Scale size={13} style={{ color: 'var(--accent-primary)' }} />
                    <span style={{ color: 'var(--accent-primary)' }} className="font-semibold font-mono">{totalWeight.toFixed(1)} kg</span>
                  </span>
                </>
              )}
            </div>
            <button
              onClick={openConfirm}
              disabled={consolidar.isPending || allocations.length === 0}
              className="py-2.5 px-5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 shrink-0"
              style={{ background: 'var(--accent-primary)', color: '#fff' }}
            >
              {consolidar.isPending ? 'Procesando...' : 'Validar y crear camión'}
            </button>
          </div>
        </div>
      )}

      <ConsolidarConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        orderCount={selectedIds.size}
        totalWeight={totalWeight}
        totalUnits={totalUnits}
        isPending={consolidar.isPending}
        onConfirm={handleConfirm}
      />
    </div>
  )
}
