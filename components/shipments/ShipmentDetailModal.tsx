'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { X, Pencil, Trash2, Plus, Check } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { ShipmentStatusBadge } from './ShipmentStatusBadge'
import { ShipmentStatusChanger } from './ShipmentStatusChanger'
import { OrdersAnalytics } from '@/components/orders/OrdersAnalytics'
import {
  useShipment,
  useUpdateShipment,
  useRemoveOrderFromShipment,
  useAddOrdersToShipment,
} from '@/lib/hooks/useShipments'
import { useOrders } from '@/lib/hooks/useOrders'
import toast from 'react-hot-toast'
import type { UserRole } from '@/lib/types/database'

interface Props {
  shipmentId: string | null
  open: boolean
  onClose: () => void
  userRole: UserRole
}

export function ShipmentDetailModal({ shipmentId, open, onClose, userRole }: Props) {
  const { data: shipment } = useShipment(shipmentId)
  const { data: recibidoOrders = [] } = useOrders('recibido')
  const updateShipment = useUpdateShipment()
  const removeOrder = useRemoveOrderFromShipment()
  const addOrders = useAddOrdersToShipment()

  const canEdit = userRole === 'admin' || userRole === 'gestora'
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    if (shipment) {
      setNotes(shipment.notes ?? '')
      setEditingNotes(false)
    }
  }, [shipment])

  const orders = shipment?.orders ?? []

  async function handleSaveNotes() {
    if (!shipment) return
    try {
      await updateShipment.mutateAsync({ shipmentId: shipment.id, payload: { notes } })
      toast.success('Notas actualizadas')
      setEditingNotes(false)
    } catch {
      toast.error('Error al guardar notas')
    }
  }

  async function handleRemove(orderId: string) {
    if (!shipment) return
    try {
      await removeOrder.mutateAsync({ orderId, shipmentId: shipment.id })
      toast.success('Pedido quitado del camión')
    } catch {
      toast.error('Error al quitar pedido')
    }
  }

  async function handleAdd(orderId: string) {
    if (!shipment) return
    try {
      await addOrders.mutateAsync({ shipmentId: shipment.id, orderIds: [orderId] })
      toast.success('Pedido agregado al camión')
      setAddOpen(false)
    } catch {
      toast.error('Error al agregar pedido')
    }
  }

  if (!shipment) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg overflow-y-auto p-0"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          <SheetHeader className="px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <SheetTitle style={{ color: 'var(--text-primary)' }}>Cargando...</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto flex flex-col gap-0 p-0"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-base font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                Camión #{String(shipment.shipment_number).padStart(3, '0')}
              </SheetTitle>
              <div className="mt-1.5">
                <ShipmentStatusBadge status={shipment.status} />
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors">
              <X size={18} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Info */}
          <div className="space-y-2">
            <InfoRow
              label="Creado"
              value={format(new Date(shipment.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
            />
            <InfoRow label="Por" value={shipment.creator?.full_name ?? '—'} />
          </div>

          {/* Analytics — full visual breakdown of the truck's cargo */}
          {orders.length > 0 && <OrdersAnalytics orders={orders} />}

          <Separator style={{ background: 'var(--border-subtle)' }} />

          {/* Notes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
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
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Notas del envío..."
                  className="w-full rounded-md px-3 py-2 text-sm border outline-none resize-none"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setNotes(shipment.notes ?? '')
                      setEditingNotes(false)
                    }}
                    className="flex-1 py-1.5 rounded-md text-xs border hover:bg-white/5"
                    style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveNotes}
                    disabled={updateShipment.isPending}
                    className="flex-1 py-1.5 rounded-md text-xs font-semibold disabled:opacity-50"
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

          <Separator style={{ background: 'var(--border-subtle)' }} />

          {/* Orders in shipment */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>
                Pedidos en el camión ({orders.length})
              </p>
              {canEdit && recibidoOrders.length > 0 && (
                <Popover open={addOpen} onOpenChange={setAddOpen}>
                  <PopoverTrigger
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs border hover:bg-white/5"
                    style={{ color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
                  >
                    <Plus size={11} /> Agregar
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-80 p-0"
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                  >
                    <Command style={{ background: 'transparent' }}>
                      <CommandInput placeholder="Buscar pedido recibido..." style={{ color: 'var(--text-primary)' }} />
                      <CommandList key={recibidoOrders.length}>
                        <CommandEmpty style={{ color: 'var(--text-muted)' }}>Sin pedidos recibidos.</CommandEmpty>
                        <CommandGroup>
                          {recibidoOrders.map((order) => (
                            <CommandItem
                              key={order.id}
                              value={`${order.order_number} ${order.vendor_client}`}
                              onSelect={() => handleAdd(order.id)}
                              className="cursor-pointer"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                                  #{String(order.order_number).padStart(3, '0')}
                                </p>
                                <p className="text-sm leading-tight truncate">{order.vendor_client}</p>
                              </div>
                              <Check size={14} style={{ color: 'var(--accent-primary)' }} />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {orders.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
                Este camión no tiene pedidos.
              </p>
            ) : (
              <div className="space-y-2">
                {orders.map((order) => {
                  const itemCount = (order.items ?? []).reduce((sum, it) => sum + (it.quantity ?? 0), 0)
                  const weight = (order.items ?? []).reduce(
                    (sum, it) => sum + (it.quantity ?? 0) * (it.product?.peso_kg ?? 0),
                    0
                  )
                  return (
                    <div
                      key={order.id}
                      className="flex items-start justify-between gap-3 py-2.5 px-3 rounded-md border"
                      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                          #{String(order.order_number).padStart(3, '0')}
                        </p>
                        <p className="text-sm font-medium leading-tight mt-0.5 truncate" style={{ color: 'var(--text-primary)' }}>
                          {order.client?.name ?? order.vendor_client}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                          {itemCount} unidades{weight > 0 && ` · ${weight.toFixed(1)} kg`}
                        </p>
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => handleRemove(order.id)}
                          disabled={removeOrder.isPending}
                          className="p-1.5 rounded hover:bg-white/10 transition-colors disabled:opacity-50"
                          title="Quitar del camión"
                        >
                          <Trash2 size={13} style={{ color: 'var(--text-muted)' }} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {canEdit && (
          <div
            className="px-5 py-4 border-t flex justify-end"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <ShipmentStatusChanger shipmentId={shipment.id} currentStatus={shipment.status} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs w-24 shrink-0 pt-0.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  )
}
