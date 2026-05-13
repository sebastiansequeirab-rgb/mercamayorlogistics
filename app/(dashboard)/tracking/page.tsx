'use client'

export const dynamic = 'force-dynamic'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { ChevronDown, Search, Truck, X } from 'lucide-react'
import { useOrders, useUpdateOrderStatus } from '@/lib/hooks/useOrders'
import { useProfile } from '@/lib/hooks/useProfile'
import { OrderCard } from '@/components/orders/OrderCard'
import { OrderDetailModal } from '@/components/orders/OrderDetailModal'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Skeleton } from '@/components/ui/skeleton'
import {
  PRICE_LIST_OPTIONS,
  PRICE_LIST_SHORT,
  PRICE_LIST_LABELS,
} from '@/lib/utils/order-status'
import toast from 'react-hot-toast'
import type { Order, OrderStatus, PriceList, UserRole } from '@/lib/types/database'

const COL_RECIBIDO = 'col-recibido'
const COL_ENRUTADO = 'col-en_transito'
const COL_ENTREGADO = 'col-entregado'

const COL_TO_STATUS: Record<string, OrderStatus> = {
  [COL_RECIBIDO]: 'recibido',
  [COL_ENRUTADO]: 'en_transito',
  [COL_ENTREGADO]: 'entregado',
}

export default function TrackingPage() {
  const router = useRouter()
  const { data: profile } = useProfile()
  const userRole = profile?.role ?? 'vendedor'
  const canMove = userRole === 'admin' || userRole === 'gestora'

  const { data: allOrders = [], isLoading } = useOrders('active_plus_delivered')
  const updateStatus = useUpdateOrderStatus()

  const [search, setSearch] = useState('')
  const [priceFilter, setPriceFilter] = useState<Set<PriceList>>(new Set())
  const [shipmentFilter, setShipmentFilter] = useState<string | null>(null)
  const [shipmentPopOpen, setShipmentPopOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const openShipment = (sid: string) => router.push(`/camiones/${sid}`)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  )

  // Camiones únicos derivados de los pedidos visibles (para el filtro)
  const allShipmentsInOrders = useMemo(() => {
    const map = new Map<string, { id: string; shipment_number: number; name: string | null }>()
    for (const o of allOrders) {
      if (o.shipment) {
        map.set(o.shipment.id, {
          id: o.shipment.id,
          shipment_number: o.shipment.shipment_number,
          name: o.shipment.name ?? null,
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.shipment_number - a.shipment_number)
  }, [allOrders])

  const q = search.trim().toLowerCase()
  const filtered = useMemo(() => {
    return allOrders.filter((o) => {
      if (q) {
        const matches =
          String(o.order_number).includes(q) ||
          (o.client?.name ?? o.vendor_client ?? '').toLowerCase().includes(q) ||
          (o.shipment?.name ?? '').toLowerCase().includes(q)
        if (!matches) return false
      }
      if (priceFilter.size > 0 && !priceFilter.has(o.price_list)) return false
      if (shipmentFilter && o.shipment_id !== shipmentFilter) return false
      return true
    })
  }, [allOrders, q, priceFilter, shipmentFilter])

  const cols = useMemo(() => {
    const recibido: Order[] = []
    const enrutado: Order[] = []
    const entregado: Order[] = []
    for (const o of filtered) {
      if (o.status === 'recibido') recibido.push(o)
      else if (o.status === 'en_transito') enrutado.push(o)
      else if (o.status === 'entregado') entregado.push(o)
    }
    return { recibido, enrutado, entregado }
  }, [filtered])

  const draggingOrder = draggingId ? allOrders.find((o) => o.id === draggingId) : null

  async function moveOrder(orderId: string, status: OrderStatus) {
    try {
      await updateStatus.mutateAsync({ orderId, status })
      const label =
        status === 'recibido' ? 'Recibido' : status === 'en_transito' ? 'Enrutado' : 'Entregado'
      toast.success(`Pedido movido a ${label}`)
    } catch {
      toast.error('Error al cambiar estado')
    }
  }

  function handleDragStart(e: DragStartEvent) {
    if (!canMove) return
    setDraggingId(String(e.active.id))
  }

  async function handleDragEnd(e: DragEndEvent) {
    setDraggingId(null)
    if (!canMove) return
    const { active, over } = e
    if (!over) return
    const orderId = String(active.id)
    const sourceStatus = active.data.current?.status as OrderStatus | undefined
    const targetStatus = COL_TO_STATUS[String(over.id)]
    if (!targetStatus || targetStatus === sourceStatus) return
    await moveOrder(orderId, targetStatus)
  }

  function togglePrice(list: PriceList) {
    setPriceFilter((prev) => {
      const next = new Set(prev)
      if (next.has(list)) next.delete(list)
      else next.add(list)
      return next
    })
  }

  function clearFilters() {
    setSearch('')
    setPriceFilter(new Set())
    setShipmentFilter(null)
  }

  const hasFilters = q.length > 0 || priceFilter.size > 0 || shipmentFilter !== null
  const shipmentLabel = shipmentFilter
    ? (() => {
        const s = allShipmentsInOrders.find((x) => x.id === shipmentFilter)
        if (!s) return 'Camión'
        return `#${String(s.shipment_number).padStart(3, '0')}${s.name ? ` — ${s.name}` : ''}`
      })()
    : null

  return (
    <div className="px-4 md:px-6 py-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Tracking</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Recibido · Enrutado · Entregado — cada pedido se mueve manualmente.
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
            placeholder="Buscar #, cliente o camión..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Lista:
        </span>
        {PRICE_LIST_OPTIONS.map((list) => {
          const active = priceFilter.has(list)
          return (
            <button
              key={list}
              type="button"
              onClick={() => togglePrice(list)}
              className="px-2.5 py-1 rounded-full text-xs border transition-colors"
              style={{
                background: active ? 'var(--accent-primary)' : 'transparent',
                borderColor: active ? 'var(--accent-primary)' : 'var(--border-subtle)',
                color: active ? '#fff' : 'var(--text-secondary)',
              }}
              title={PRICE_LIST_LABELS[list]}
            >
              {PRICE_LIST_SHORT[list]}
            </button>
          )
        })}

        <div className="h-4 w-px mx-1" style={{ background: 'var(--border-subtle)' }} />

        <Popover open={shipmentPopOpen} onOpenChange={setShipmentPopOpen}>
          <PopoverTrigger
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors hover:bg-white/5"
            style={{
              background: shipmentFilter ? 'var(--accent-primary)' : 'transparent',
              borderColor: shipmentFilter ? 'var(--accent-primary)' : 'var(--border-subtle)',
              color: shipmentFilter ? '#fff' : 'var(--text-secondary)',
            }}
          >
            <Truck size={11} />
            {shipmentLabel ?? 'Filtrar camión'}
            <ChevronDown size={11} />
          </PopoverTrigger>
          <PopoverContent
            className="w-72 p-0"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
          >
            <Command style={{ background: 'transparent' }}>
              <CommandInput placeholder="Buscar camión..." style={{ color: 'var(--text-primary)' }} />
              <CommandList key={allShipmentsInOrders.length}>
                <CommandEmpty style={{ color: 'var(--text-muted)' }}>Sin camiones.</CommandEmpty>
                <CommandGroup>
                  {allShipmentsInOrders.map((s) => (
                    <CommandItem
                      key={s.id}
                      value={`${s.shipment_number} ${s.name ?? ''}`}
                      onSelect={() => {
                        setShipmentFilter(s.id)
                        setShipmentPopOpen(false)
                      }}
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

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-white/5"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={11} /> Limpiar
          </button>
        )}
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DroppableColumn id={COL_RECIBIDO} title="Recibido" count={cols.recibido.length} color="#F59E0B">
            {isLoading ? (
              <ColumnSkeleton />
            ) : cols.recibido.length === 0 ? (
              <ColumnEmpty text={hasFilters ? 'Sin resultados' : 'No hay pedidos recibidos'} />
            ) : (
              cols.recibido.map((order) => (
                <DraggableOrderCard
                  key={order.id}
                  order={order}
                  userRole={userRole}
                  draggable={canMove}
                  onViewDetail={setSelectedOrder}
                  onOpenShipment={openShipment}
                />
              ))
            )}
          </DroppableColumn>

          <DroppableColumn id={COL_ENRUTADO} title="Enrutado" count={cols.enrutado.length} color="#3B82F6">
            {isLoading ? (
              <ColumnSkeleton />
            ) : cols.enrutado.length === 0 ? (
              <ColumnEmpty text={hasFilters ? 'Sin resultados' : 'No hay pedidos enrutados'} />
            ) : (
              cols.enrutado.map((order) => (
                <DraggableOrderCard
                  key={order.id}
                  order={order}
                  userRole={userRole}
                  draggable={canMove}
                  onViewDetail={setSelectedOrder}
                  onOpenShipment={openShipment}
                />
              ))
            )}
          </DroppableColumn>

          <DroppableColumn id={COL_ENTREGADO} title="Entregado" count={cols.entregado.length} color="#22C55E">
            {isLoading ? (
              <ColumnSkeleton />
            ) : cols.entregado.length === 0 ? (
              <ColumnEmpty text={hasFilters ? 'Sin resultados' : 'No hay pedidos entregados'} />
            ) : (
              cols.entregado.map((order) => (
                <DraggableOrderCard
                  key={order.id}
                  order={order}
                  userRole={userRole}
                  draggable={canMove}
                  onViewDetail={setSelectedOrder}
                  onOpenShipment={openShipment}
                />
              ))
            )}
          </DroppableColumn>
        </div>

        <DragOverlay>
          {draggingOrder ? (
            <div style={{ opacity: 0.9, transform: 'rotate(2deg)' }}>
              <OrderCard
                order={draggingOrder}
                userRole={userRole}
                onViewDetail={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <OrderDetailModal
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        userRole={userRole}
        onOpenShipment={openShipment}
      />
    </div>
  )
}

function DroppableColumn({
  id,
  title,
  count,
  color,
  children,
}: {
  id: string
  title: string
  count: number
  color: string
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className="rounded-xl border flex flex-col transition-colors"
      style={{
        borderColor: isOver ? color : 'var(--border-subtle)',
        background: isOver ? `${color}08` : undefined,
        minHeight: 200,
      }}
    >
      <div
        className="px-4 py-2.5 border-b flex items-center justify-between sticky top-0 z-10 rounded-t-xl"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: color }} />
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
        </div>
        <span
          className="text-xs font-mono font-bold px-2 py-0.5 rounded-full"
          style={{ color, background: `${color}18` }}
        >
          {count}
        </span>
      </div>
      <div className="p-3 space-y-3 flex-1" style={{ background: 'var(--bg-card)' }}>
        {children}
      </div>
    </div>
  )
}

function DraggableOrderCard({
  order,
  userRole,
  draggable,
  onViewDetail,
  onOpenShipment,
}: {
  order: Order
  userRole: UserRole
  draggable: boolean
  onViewDetail: (o: Order) => void
  onOpenShipment: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: order.id,
    disabled: !draggable,
    data: { status: order.status },
  })

  return (
    <div
      ref={setNodeRef}
      {...(draggable ? attributes : {})}
      {...(draggable ? listeners : {})}
      style={{ opacity: isDragging ? 0.4 : 1, cursor: draggable ? 'grab' : 'default' }}
    >
      <OrderCard
        order={order}
        userRole={userRole}
        onViewDetail={onViewDetail}
        onOpenShipment={onOpenShipment}
      />
    </div>
  )
}

function ColumnSkeleton() {
  return (
    <>
      {[...Array(2)].map((_, i) => (
        <Skeleton key={i} className="h-40 rounded-lg" style={{ background: 'var(--bg-surface)' }} />
      ))}
    </>
  )
}

function ColumnEmpty({ text }: { text: string }) {
  return (
    <div className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>
      {text}
    </div>
  )
}
