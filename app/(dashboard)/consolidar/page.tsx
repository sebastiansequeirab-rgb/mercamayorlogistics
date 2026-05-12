'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useOrders, useConsolidarOrders } from '@/lib/hooks/useOrders'
import { useProfile } from '@/lib/hooks/useProfile'
import { OrdersAnalytics } from '@/components/orders/OrdersAnalytics'
import { Skeleton } from '@/components/ui/skeleton'
import toast from 'react-hot-toast'

export default function ConsolidarPage() {
  const { data: orders = [], isLoading } = useOrders('recibido')
  const { data: profile } = useProfile()
  const consolidar = useConsolidarOrders()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')

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

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedOrders = useMemo(
    () => orders.filter((o) => selectedIds.has(o.id)),
    [orders, selectedIds]
  )

  const grandTotalWeight = useMemo(() => {
    let w = 0
    for (const o of selectedOrders) {
      for (const it of o.items ?? []) {
        w += (it.product?.peso_kg ?? 0) * it.quantity
      }
    }
    return w
  }, [selectedOrders])

  const grandTotalUnits = useMemo(() => {
    let u = 0
    for (const o of selectedOrders) {
      for (const it of o.items ?? []) {
        u += it.quantity
      }
    }
    return u
  }, [selectedOrders])

  async function handleConsolidar() {
    if (selectedIds.size === 0) {
      toast.error('Selecciona al menos un pedido')
      return
    }
    try {
      await consolidar.mutateAsync({ orderIds: Array.from(selectedIds), notes })
      const n = selectedIds.size
      toast.success(`🚛 ${n} pedido${n > 1 ? 's' : ''} enviado${n > 1 ? 's' : ''} a Programados`)
      setSelectedIds(new Set())
      setExpandedIds(new Set())
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

  return (
    <div className="px-4 md:px-6 py-5 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Consolidar</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Selecciona los pedidos recibidos para programar un camión. Click en la flecha para ver el detalle.
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
              const expanded = expandedIds.has(order.id)
              const items = order.items ?? []
              const orderWeight = items.reduce(
                (s, it) => s + (it.product?.peso_kg ?? 0) * it.quantity,
                0
              )
              const orderUnits = items.reduce((s, it) => s + it.quantity, 0)
              return (
                <div
                  key={order.id}
                  style={{
                    borderBottom: i < orders.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    background: selected ? 'rgba(37,99,235,0.05)' : 'transparent',
                  }}
                >
                  {/* Row */}
                  <div
                    onClick={() => toggleSelect(order.id)}
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
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-muted)' }}>
                          #{String(order.order_number).padStart(3, '0')}
                        </span>
                        <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {order.client?.name ?? order.vendor_client}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {order.price_list === 'lista_50' ? 'Lista 50' : 'Lista 60'}{' · '}
                        {order.billing_type === 'factura' ? 'Factura' : 'Nota de Entrega'}{' · '}
                        {items.length} producto{items.length !== 1 ? 's' : ''} · ×{orderUnits}
                      </p>
                    </div>
                    {orderWeight > 0 && (
                      <span
                        className="text-xs font-mono font-semibold shrink-0 px-2 py-1 rounded"
                        style={{ color: 'var(--accent-primary)', background: 'rgba(59,130,246,0.1)' }}
                      >
                        {orderWeight.toFixed(1)} kg
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

                  {/* Expanded details */}
                  {expanded && items.length > 0 && (
                    <div
                      className="px-4 pb-4 pt-1 space-y-1.5"
                      style={{ background: 'var(--bg-surface)' }}
                    >
                      {order.notes && (
                        <p className="text-xs italic mb-2" style={{ color: 'var(--text-muted)' }}>
                          📝 {order.notes}
                        </p>
                      )}
                      <div className="rounded-md overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
                        {items.map((item, j) => {
                          const itemWeight = (item.product?.peso_kg ?? 0) * item.quantity
                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between px-3 py-2"
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
                              </div>
                              <div className="text-right shrink-0 ml-3">
                                <span className="text-sm font-bold font-mono" style={{ color: 'var(--accent-primary)' }}>
                                  ×{item.quantity}
                                </span>
                                {itemWeight > 0 && (
                                  <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                                    {itemWeight.toFixed(1)} kg
                                  </p>
                                )}
                              </div>
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

      {/* Analytics panel */}
      {selectedOrders.length > 0 && (
        <div className="space-y-2">
          {grandTotalWeight > 0 && (
            <p className="text-xs font-mono font-bold text-right pr-1" style={{ color: 'var(--accent-primary)' }}>
              {grandTotalWeight.toFixed(1)} kg · {grandTotalUnits} unidades
            </p>
          )}
          <OrdersAnalytics orders={selectedOrders} />
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
            : `Validar y Enviar a Programados (${selectedIds.size} pedido${selectedIds.size !== 1 ? 's' : ''})`}
        </button>
      </div>
    </div>
  )
}
