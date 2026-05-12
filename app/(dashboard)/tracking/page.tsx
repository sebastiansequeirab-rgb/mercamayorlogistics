'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
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
import { ArrowLeft, ArrowRight, Search } from 'lucide-react'
import { useOrders } from '@/lib/hooks/useOrders'
import { useShipments, useUpdateShipment, type ShipmentWithOrders } from '@/lib/hooks/useShipments'
import { useProfile } from '@/lib/hooks/useProfile'
import { OrderCard } from '@/components/orders/OrderCard'
import { OrderDetailModal } from '@/components/orders/OrderDetailModal'
import { ShipmentCard } from '@/components/shipments/ShipmentCard'
import { ShipmentDetailModal } from '@/components/shipments/ShipmentDetailModal'
import { Skeleton } from '@/components/ui/skeleton'
import toast from 'react-hot-toast'
import type { Order } from '@/lib/types/database'

const DROP_PROGRAMADO = 'col-programado'
const DROP_ENTREGADO = 'col-entregado'

export default function TrackingPage() {
  const { data: profile } = useProfile()
  const userRole = profile?.role ?? 'vendedor'
  const canMove = userRole === 'admin' || userRole === 'gestora'

  const { data: recibidos = [], isLoading: loadingRec } = useOrders('recibido')
  const { data: programados = [], isLoading: loadingProg } = useShipments('programado')
  const { data: entregados = [], isLoading: loadingEnt } = useShipments('entregado')

  const updateShipment = useUpdateShipment()

  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  )

  const q = search.trim().toLowerCase()
  const matchOrder = (o: Order) =>
    !q ||
    String(o.order_number).includes(q) ||
    (o.client?.name ?? o.vendor_client ?? '').toLowerCase().includes(q)
  const matchShipment = (s: ShipmentWithOrders) =>
    !q ||
    String(s.shipment_number).includes(q) ||
    (s.notes ?? '').toLowerCase().includes(q) ||
    (s.orders ?? []).some((o) => (o.client?.name ?? o.vendor_client ?? '').toLowerCase().includes(q))

  const filteredRecibidos = recibidos.filter(matchOrder)
  const filteredProgramados = programados.filter(matchShipment)
  const filteredEntregados = entregados.filter(matchShipment)

  const draggingShipment = draggingId
    ? [...programados, ...entregados].find((s) => s.id === draggingId)
    : null

  async function moveShipment(shipmentId: string, target: 'programado' | 'entregado') {
    try {
      await updateShipment.mutateAsync({ shipmentId, payload: { status: target } })
      toast.success(target === 'entregado' ? '✅ Camión marcado como entregado' : '🚛 Camión devuelto a programado')
    } catch {
      toast.error('Error al cambiar estado del camión')
    }
  }

  function handleDragStart(e: DragStartEvent) {
    setDraggingId(String(e.active.id))
  }

  async function handleDragEnd(e: DragEndEvent) {
    setDraggingId(null)
    const { active, over } = e
    if (!over) return
    const shipmentId = String(active.id)
    const sourceStatus = active.data.current?.status
    const targetCol = String(over.id)

    if (targetCol === DROP_ENTREGADO && sourceStatus === 'programado') {
      await moveShipment(shipmentId, 'entregado')
    } else if (targetCol === DROP_PROGRAMADO && sourceStatus === 'entregado') {
      await moveShipment(shipmentId, 'programado')
    }
  }

  return (
    <div className="px-4 md:px-6 py-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Tracking</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Recibido · Programado · Entregado — vista operativa
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
            placeholder="Buscar pedido, cliente o camión..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recibido */}
          <Column title="Recibido" count={filteredRecibidos.length} color="#F59E0B">
            {loadingRec ? (
              <ColumnSkeleton />
            ) : filteredRecibidos.length === 0 ? (
              <ColumnEmpty text={q ? 'Sin resultados' : 'No hay pedidos recibidos'} />
            ) : (
              filteredRecibidos.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  userRole={userRole}
                  onViewDetail={setSelectedOrder}
                />
              ))
            )}
          </Column>

          {/* Programado */}
          <DroppableColumn
            id={DROP_PROGRAMADO}
            title="Programado"
            count={filteredProgramados.length}
            color="#3B82F6"
            isLoading={loadingProg}
          >
            {loadingProg ? (
              <ColumnSkeleton />
            ) : filteredProgramados.length === 0 ? (
              <ColumnEmpty text={q ? 'Sin resultados' : 'No hay camiones programados'} />
            ) : (
              filteredProgramados.map((shipment) => (
                <DraggableShipmentCard
                  key={shipment.id}
                  shipment={shipment}
                  draggable={canMove}
                  onView={setSelectedShipmentId}
                  action={
                    canMove && (
                      <button
                        type="button"
                        onClick={() => moveShipment(shipment.id, 'entregado')}
                        disabled={updateShipment.isPending}
                        className="px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors disabled:opacity-50"
                        style={{
                          color: '#22C55E',
                          borderColor: '#22C55E40',
                          background: 'transparent',
                        }}
                        title="Marcar como entregado"
                      >
                        <ArrowRight size={13} />
                      </button>
                    )
                  }
                />
              ))
            )}
          </DroppableColumn>

          {/* Entregado */}
          <DroppableColumn
            id={DROP_ENTREGADO}
            title="Entregado"
            count={filteredEntregados.length}
            color="#22C55E"
            isLoading={loadingEnt}
          >
            {loadingEnt ? (
              <ColumnSkeleton />
            ) : filteredEntregados.length === 0 ? (
              <ColumnEmpty text={q ? 'Sin resultados' : 'No hay camiones entregados'} />
            ) : (
              filteredEntregados.map((shipment) => (
                <DraggableShipmentCard
                  key={shipment.id}
                  shipment={shipment}
                  draggable={canMove}
                  onView={setSelectedShipmentId}
                  action={
                    canMove && (
                      <button
                        type="button"
                        onClick={() => moveShipment(shipment.id, 'programado')}
                        disabled={updateShipment.isPending}
                        className="px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors disabled:opacity-50"
                        style={{
                          color: 'var(--text-muted)',
                          borderColor: 'var(--border-subtle)',
                          background: 'transparent',
                        }}
                        title="Devolver a programado"
                      >
                        <ArrowLeft size={13} />
                      </button>
                    )
                  }
                />
              ))
            )}
          </DroppableColumn>
        </div>

        <DragOverlay>
          {draggingShipment ? (
            <div style={{ opacity: 0.9, transform: 'rotate(2deg)' }}>
              <ShipmentCard shipment={draggingShipment} onView={() => {}} draggable />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      <OrderDetailModal
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        userRole={userRole}
      />
      <ShipmentDetailModal
        shipmentId={selectedShipmentId}
        open={!!selectedShipmentId}
        onClose={() => setSelectedShipmentId(null)}
        userRole={userRole}
      />
    </div>
  )
}

function Column({
  title,
  count,
  color,
  children,
}: {
  title: string
  count: number
  color: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border flex flex-col" style={{ borderColor: 'var(--border-subtle)', minHeight: 200 }}>
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
  isLoading: boolean
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

function DraggableShipmentCard({
  shipment,
  draggable,
  onView,
  action,
}: {
  shipment: ShipmentWithOrders
  draggable: boolean
  onView: (id: string) => void
  action?: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: shipment.id,
    disabled: !draggable,
    data: { status: shipment.status },
  })

  return (
    <div
      ref={setNodeRef}
      {...(draggable ? attributes : {})}
      {...(draggable ? listeners : {})}
      style={{ opacity: isDragging ? 0.4 : 1 }}
    >
      <ShipmentCard
        shipment={shipment}
        onView={onView}
        actionButton={action}
        draggable={draggable}
      />
    </div>
  )
}

function ColumnSkeleton() {
  return (
    <>
      {[...Array(2)].map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-lg" style={{ background: 'var(--bg-surface)' }} />
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
