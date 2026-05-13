'use client'

export const dynamic = 'force-dynamic'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ArrowLeftRight,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Minus,
  Pencil,
  Plus,
  Trash2,
  Truck,
} from 'lucide-react'
import {
  useShipment,
  useShipments,
  useUpdateShipment,
  useUpdateShipmentItem,
  useRemoveOrderFromShipment,
  useMoveOrderToShipment,
} from '@/lib/hooks/useShipments'
import { useProfile } from '@/lib/hooks/useProfile'
import { OrdersAnalytics } from '@/components/orders/OrdersAnalytics'
import { ShipmentStatusBadge } from '@/components/shipments/ShipmentStatusBadge'
import { ShipmentStatusChanger } from '@/components/shipments/ShipmentStatusChanger'
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Skeleton } from '@/components/ui/skeleton'
import toast from 'react-hot-toast'
import type { Order, ShipmentItem } from '@/lib/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function CamionDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: profile } = useProfile()
  const userRole = profile?.role ?? 'vendedor'
  const canEdit = userRole === 'admin' || userRole === 'gestora'

  const { data: shipment, isLoading } = useShipment(id)
  const { data: allShipments = [] } = useShipments('all')
  const updateShipment = useUpdateShipment()
  const updateItem = useUpdateShipmentItem()
  const removeOrder = useRemoveOrderFromShipment()
  const moveOrder = useMoveOrderToShipment()

  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesDraft, setNotesDraft] = useState('')
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (shipment) {
      setNameDraft(shipment.name ?? '')
      setNotesDraft(shipment.notes ?? '')
      // Expandir todas las órdenes por default
      setExpandedOrders(new Set((shipment.orders ?? []).map((o) => o.id)))
    }
  }, [shipment])

  // Indexar shipment_items por orden y por product_id
  const allocByOrder = useMemo(() => {
    const map = new Map<string, Map<string, ShipmentItem>>()
    for (const it of shipment?.shipment_items ?? []) {
      let inner = map.get(it.order_id)
      if (!inner) {
        inner = new Map()
        map.set(it.order_id, inner)
      }
      inner.set(it.product_id, it)
    }
    return map
  }, [shipment?.shipment_items])

  // KPIs del camión (basados en shipment_items)
  const kpis = useMemo(() => {
    let units = 0
    let weight = 0
    let skus = 0
    const productSet = new Set<string>()
    for (const it of shipment?.shipment_items ?? []) {
      units += it.quantity
      weight += (it.product?.peso_kg ?? 0) * it.quantity
      productSet.add(it.product_id)
    }
    skus = productSet.size
    return {
      units,
      weight,
      skus,
      orderCount: shipment?.orders?.length ?? 0,
    }
  }, [shipment?.shipment_items, shipment?.orders])

  // Convertir shipment_items en un Order[] sintético para alimentar OrdersAnalytics
  const ordersForAnalytics: Order[] = useMemo(() => {
    if (!shipment?.orders) return []
    return shipment.orders.map((o) => {
      const allocs = allocByOrder.get(o.id)
      const items = (o.items ?? [])
        .map((it) => {
          const alloc = allocs?.get(it.product_id)
          if (!alloc) return null
          return { ...it, quantity: alloc.quantity }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
      return { ...o, items }
    })
  }, [shipment?.orders, allocByOrder])

  if (isLoading || !shipment) {
    return (
      <div className="px-4 md:px-6 py-5 max-w-[1400px] mx-auto space-y-4">
        <Skeleton className="h-10 w-40 rounded" style={{ background: 'var(--bg-card)' }} />
        <Skeleton className="h-24 rounded-xl" style={{ background: 'var(--bg-card)' }} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" style={{ background: 'var(--bg-card)' }} />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" style={{ background: 'var(--bg-card)' }} />
      </div>
    )
  }

  async function handleSaveName() {
    if (!nameDraft.trim()) {
      toast.error('El camión necesita un nombre')
      return
    }
    try {
      await updateShipment.mutateAsync({ shipmentId: id, payload: { name: nameDraft } })
      toast.success('Nombre actualizado')
      setEditingName(false)
    } catch {
      toast.error('Error al guardar el nombre')
    }
  }

  async function handleSaveNotes() {
    try {
      await updateShipment.mutateAsync({ shipmentId: id, payload: { notes: notesDraft } })
      toast.success('Notas actualizadas')
      setEditingNotes(false)
    } catch {
      toast.error('Error al guardar las notas')
    }
  }

  async function handleQtyChange(itemId: string, qty: number) {
    try {
      await updateItem.mutateAsync({ shipmentItemId: itemId, quantity: qty, shipmentId: id })
    } catch {
      toast.error('Error al actualizar cantidad')
    }
  }

  async function handleRemoveOrder(orderId: string) {
    try {
      await removeOrder.mutateAsync({ orderId, shipmentId: id })
      toast.success('Pedido removido del camión')
    } catch {
      toast.error('Error al quitar pedido')
    }
  }

  async function handleMoveOrder(orderId: string, toShipmentId: string) {
    try {
      await moveOrder.mutateAsync({ orderId, fromShipmentId: id, toShipmentId })
      toast.success('Pedido movido a otro camión')
    } catch {
      toast.error('Error al mover pedido')
    }
  }

  function toggleExpand(orderId: string) {
    setExpandedOrders((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) next.delete(orderId)
      else next.add(orderId)
      return next
    })
  }

  const otherShipments = allShipments.filter((s) => s.id !== id)

  return (
    <div className="px-4 md:px-6 py-5 max-w-[1400px] mx-auto">
      {/* Top: back nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs hover:underline"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={13} />
          Volver
        </button>
      </div>

      {/* Hero */}
      <div
        className="rounded-2xl border p-5 md:p-6 mb-5"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1.5">
              <div className="p-2 rounded-lg" style={{ background: 'rgba(59,130,246,0.1)' }}>
                <Truck size={20} style={{ color: 'var(--accent-primary)' }} />
              </div>
              <div>
                <p className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Camión
                </p>
                <p className="text-2xl md:text-3xl font-bold font-mono leading-none" style={{ color: 'var(--text-primary)' }}>
                  #{String(shipment.shipment_number).padStart(3, '0')}
                </p>
              </div>
            </div>

            {editingName ? (
              <div className="flex items-center gap-2 mt-3 max-w-md">
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder="Nombre del camión"
                  className="flex-1 rounded-md px-3 py-2 text-base font-semibold border outline-none"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName()
                    if (e.key === 'Escape') {
                      setNameDraft(shipment.name ?? '')
                      setEditingName(false)
                    }
                  }}
                />
                <button
                  onClick={handleSaveName}
                  disabled={updateShipment.isPending}
                  className="px-3 py-2 rounded-md text-xs font-semibold disabled:opacity-50"
                  style={{ background: 'var(--accent-primary)', color: '#fff' }}
                >
                  Guardar
                </button>
                <button
                  onClick={() => {
                    setNameDraft(shipment.name ?? '')
                    setEditingName(false)
                  }}
                  className="px-3 py-2 rounded-md text-xs border hover:bg-white/5"
                  style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => canEdit && setEditingName(true)}
                disabled={!canEdit}
                className="group flex items-center gap-2 mt-2 text-xl md:text-2xl font-semibold disabled:cursor-default"
                style={{ color: shipment.name ? 'var(--text-primary)' : 'var(--text-muted)' }}
              >
                {shipment.name || 'Sin nombre'}
                {canEdit && (
                  <Pencil size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }} />
                )}
              </button>
            )}

            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <ShipmentStatusBadge status={shipment.status} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Creado por {shipment.creator?.full_name ?? '—'} · {format(new Date(shipment.created_at), "d 'de' MMMM, HH:mm", { locale: es })}
              </span>
            </div>
          </div>

          {canEdit && (
            <ShipmentStatusChanger shipmentId={shipment.id} currentStatus={shipment.status} />
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Peso total" value={`${kpis.weight.toFixed(1)} kg`} color="var(--accent-primary)" sub="estimado" />
        <KpiCard label="Unidades" value={kpis.units.toLocaleString('es-VE')} color="#3B82F6" sub={`${kpis.skus} ítem${kpis.skus !== 1 ? 's' : ''} distintos`} />
        <KpiCard label="Pedidos" value={String(kpis.orderCount)} color="#8B5CF6" sub="en el camión" />
        <KpiCard
          label="Kg/Pedido"
          value={kpis.orderCount > 0 ? (kpis.weight / kpis.orderCount).toFixed(1) : '—'}
          color="#F59E0B"
          sub="promedio"
        />
      </div>

      {/* Notas */}
      <div
        className="rounded-xl border p-4 mb-5"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>
            Notas
          </p>
          {canEdit && !editingNotes && (
            <button
              onClick={() => setEditingNotes(true)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs hover:bg-white/5"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Pencil size={11} /> Editar
            </button>
          )}
        </div>
        {editingNotes ? (
          <div className="space-y-2">
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              rows={2}
              placeholder="Ruta, chofer, observaciones..."
              className="w-full rounded-md px-3 py-2 text-sm border outline-none resize-none"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setNotesDraft(shipment.notes ?? '')
                  setEditingNotes(false)
                }}
                className="px-3 py-1.5 rounded-md text-xs border hover:bg-white/5"
                style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNotes}
                disabled={updateShipment.isPending}
                className="px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-50"
                style={{ background: 'var(--accent-primary)', color: '#fff' }}
              >
                {updateShipment.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm" style={{ color: shipment.notes ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {shipment.notes || 'Sin notas'}
          </p>
        )}
      </div>

      {/* Main 2-col */}
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-5">
        {/* Left: orders + items */}
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Pedidos en el camión ({shipment.orders?.length ?? 0})
            </p>
          </div>

          {(!shipment.orders || shipment.orders.length === 0) ? (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
              Este camión está vacío.
            </div>
          ) : (
            <div style={{ background: 'var(--bg-card)' }}>
              {shipment.orders.map((order, oi, arr) => {
                const allocs = allocByOrder.get(order.id) ?? new Map<string, ShipmentItem>()
                const items = order.items ?? []
                const totalRequested = items.reduce((s, it) => s + it.quantity, 0)
                const totalAllocated = Array.from(allocs.values()).reduce((s, a) => s + a.quantity, 0)
                const isPartial = totalAllocated < totalRequested
                const expanded = expandedOrders.has(order.id)

                return (
                  <div
                    key={order.id}
                    style={{
                      borderBottom: oi < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    }}
                  >
                    {/* Order header */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleExpand(order.id)}
                        className="p-1 rounded hover:bg-white/10 transition-colors shrink-0"
                        aria-label={expanded ? 'Contraer' : 'Expandir'}
                      >
                        {expanded ? (
                          <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
                        ) : (
                          <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-muted)' }}>
                            #{String(order.order_number).padStart(3, '0')}
                          </span>
                          <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {order.client?.name ?? order.vendor_client}
                          </span>
                          <OrderStatusBadge status={order.status} size="sm" />
                          {isPartial && totalAllocated > 0 && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                              style={{ color: '#F59E0B', background: 'rgba(245,158,11,0.1)' }}
                            >
                              PARCIAL
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {totalAllocated} de {totalRequested} unidades
                        </p>
                      </div>

                      {canEdit && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Popover>
                            <PopoverTrigger
                              className="flex items-center gap-1 px-2 py-1 rounded text-xs border hover:bg-white/5"
                              style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}
                              title="Mover a otro camión"
                              disabled={otherShipments.length === 0}
                            >
                              <ArrowLeftRight size={11} />
                              Mover
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-72 p-0"
                              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                            >
                              <Command style={{ background: 'transparent' }}>
                                <CommandInput placeholder="Buscar camión..." style={{ color: 'var(--text-primary)' }} />
                                <CommandList key={otherShipments.length}>
                                  <CommandEmpty style={{ color: 'var(--text-muted)' }}>Sin camiones disponibles.</CommandEmpty>
                                  <CommandGroup>
                                    {otherShipments.map((s) => (
                                      <CommandItem
                                        key={s.id}
                                        value={`${s.shipment_number} ${s.name ?? ''}`}
                                        onSelect={() => handleMoveOrder(order.id, s.id)}
                                        className="cursor-pointer"
                                        style={{ color: 'var(--text-primary)' }}
                                      >
                                        <Truck size={11} className="mr-2" style={{ color: 'var(--text-muted)' }} />
                                        <span className="font-mono text-xs mr-2" style={{ color: 'var(--text-muted)' }}>
                                          #{String(s.shipment_number).padStart(3, '0')}
                                        </span>
                                        <span className="text-sm truncate">{s.name ?? '—'}</span>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <button
                            type="button"
                            onClick={() => handleRemoveOrder(order.id)}
                            disabled={removeOrder.isPending}
                            className="p-1.5 rounded hover:bg-white/10 transition-colors disabled:opacity-50"
                            title="Quitar del camión"
                          >
                            <Trash2 size={13} style={{ color: 'var(--text-muted)' }} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Items table */}
                    {expanded && items.length > 0 && (
                      <div className="px-4 pb-4 pt-1" style={{ background: 'var(--bg-surface)' }}>
                        <div className="rounded-md overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
                          {items.map((it, ii) => {
                            const alloc = allocs.get(it.product_id)
                            const qty = alloc?.quantity ?? 0
                            const peso = it.product?.peso_kg ?? 0
                            const itemWeight = peso * qty
                            const partial = qty < it.quantity
                            return (
                              <div
                                key={it.id}
                                className="flex items-center justify-between gap-3 px-3 py-2.5"
                                style={{
                                  borderTop: ii > 0 ? '1px solid var(--border-subtle)' : 'none',
                                  background: ii % 2 === 0 ? 'var(--bg-card)' : 'transparent',
                                }}
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                                    {it.product?.code ?? '—'}
                                  </p>
                                  <p className="text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>
                                    {it.product?.name ?? '—'}
                                  </p>
                                  {peso > 0 && (
                                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                      {peso} kg/u
                                    </p>
                                  )}
                                </div>

                                {canEdit && alloc ? (
                                  <div className="flex items-center gap-2 shrink-0">
                                    <div
                                      className="flex items-center rounded-md border overflow-hidden"
                                      style={{ borderColor: 'var(--border-subtle)' }}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => handleQtyChange(alloc.id, qty - 1)}
                                        disabled={updateItem.isPending}
                                        className="px-2 py-1 hover:bg-white/5 disabled:opacity-30"
                                        aria-label="Disminuir"
                                      >
                                        <Minus size={12} style={{ color: 'var(--text-secondary)' }} />
                                      </button>
                                      <input
                                        type="number"
                                        min={0}
                                        max={it.quantity}
                                        value={qty}
                                        onChange={(e) => {
                                          const v = Math.max(
                                            0,
                                            Math.min(it.quantity, parseInt(e.target.value || '0', 10))
                                          )
                                          handleQtyChange(alloc.id, v)
                                        }}
                                        className="w-12 text-center text-sm font-mono font-bold bg-transparent outline-none"
                                        style={{ color: partial ? '#F59E0B' : 'var(--accent-primary)' }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleQtyChange(alloc.id, qty + 1)}
                                        disabled={qty >= it.quantity || updateItem.isPending}
                                        className="px-2 py-1 hover:bg-white/5 disabled:opacity-30"
                                        aria-label="Aumentar"
                                      >
                                        <Plus size={12} style={{ color: 'var(--text-secondary)' }} />
                                      </button>
                                    </div>
                                    <span className="text-xs font-mono shrink-0 min-w-[40px] text-right" style={{ color: 'var(--text-muted)' }}>
                                      / {it.quantity}
                                    </span>
                                    {itemWeight > 0 && (
                                      <span className="text-xs font-mono shrink-0 min-w-[55px] text-right" style={{ color: 'var(--text-muted)' }}>
                                        {itemWeight.toFixed(1)} kg
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span
                                      className="text-sm font-bold font-mono"
                                      style={{ color: qty > 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                                    >
                                      ×{qty}
                                    </span>
                                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                                      / {it.quantity}
                                    </span>
                                  </div>
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

        {/* Right: analytics */}
        <div className="space-y-3">
          {ordersForAnalytics.length > 0 ? (
            <OrdersAnalytics orders={ordersForAnalytics} hideBrands />
          ) : (
            <div
              className="rounded-xl border p-6 text-center text-sm"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
            >
              El camión no tiene ítems asignados.
            </div>
          )}
        </div>
      </div>

      {/* Footer breadcrumb back to list */}
      <div className="mt-6 text-xs" style={{ color: 'var(--text-muted)' }}>
        <Link href="/camiones" className="hover:underline">← Volver a Camiones</Link>
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub: string
  color: string
}) {
  return (
    <div className="rounded-xl p-4 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
      <p className="text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-2xl font-bold font-mono leading-none" style={{ color }}>{value}</p>
      <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>
    </div>
  )
}
