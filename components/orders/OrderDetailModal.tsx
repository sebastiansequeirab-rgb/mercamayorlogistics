'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { X, Pencil } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { OrderStatusBadge } from './OrderStatusBadge'
import { OrderStatusChanger } from './OrderStatusChanger'
import { CommentsSection } from './CommentsSection'
import { ClientPicker } from '@/components/forms/ClientPicker'
import { ProductSelector } from '@/components/forms/ProductSelector'
import { PRICE_LIST_LABELS, PRICE_LIST_OPTIONS, BILLING_TYPE_LABELS } from '@/lib/utils/order-status'
import { useUpdateOrder } from '@/lib/hooks/useOrders'
import toast from 'react-hot-toast'
import type { Order, UserRole, PriceList, BillingType, Client, Product } from '@/lib/types/database'

interface Props {
  order: Order | null
  open: boolean
  onClose: () => void
  userRole: UserRole
  onOpenShipment?: (shipmentId: string) => void
}

interface SelectedItem {
  product: Product
  quantity: number
}

export function OrderDetailModal({ order, open, onClose, userRole, onOpenShipment }: Props) {
  const canEdit = userRole === 'admin' || userRole === 'gestora'
  const [editing, setEditing] = useState(false)
  const [client, setClient] = useState<Client | null>(null)
  const [priceList, setPriceList] = useState<PriceList>('lista_50_mm')
  const [billingType, setBillingType] = useState<BillingType>('factura')
  const [items, setItems] = useState<SelectedItem[]>([])
  const [notes, setNotes] = useState('')

  const updateOrder = useUpdateOrder()

  useEffect(() => {
    if (!order) return
    setEditing(false)
    setClient(order.client ?? (order.client_id ? null : null))
    setPriceList(order.price_list)
    setBillingType(order.billing_type)
    setItems(
      (order.items ?? [])
        .filter((it) => it.product)
        .map((it) => ({ product: it.product!, quantity: it.quantity }))
    )
    setNotes(order.notes ?? '')
  }, [order])

  if (!order) return null

  function startEdit() {
    setEditing(true)
  }

  function cancelEdit() {
    if (!order) return
    setClient(order.client ?? null)
    setPriceList(order.price_list)
    setBillingType(order.billing_type)
    setItems(
      (order.items ?? [])
        .filter((it) => it.product)
        .map((it) => ({ product: it.product!, quantity: it.quantity }))
    )
    setNotes(order.notes ?? '')
    setEditing(false)
  }

  async function handleSave() {
    if (!order) return
    if (items.length === 0) {
      toast.error('La orden debe tener al menos un producto')
      return
    }
    try {
      await updateOrder.mutateAsync({
        orderId: order.id,
        payload: {
          client_id: client?.id ?? null,
          vendor_client: client?.name ?? order.vendor_client,
          price_list: priceList,
          billing_type: billingType,
          notes: notes.trim() || null,
          items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        },
      })
      toast.success('Pedido actualizado')
      setEditing(false)
    } catch {
      toast.error('Error al actualizar el pedido')
    }
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
                Pedido #{String(order.order_number).padStart(3, '0')}
              </SheetTitle>
              <div className="mt-1.5 flex items-center gap-2">
                <OrderStatusBadge status={order.status} />
                {canEdit && !editing && (
                  <button
                    onClick={startEdit}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-xs border hover:bg-white/5"
                    style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}
                  >
                    <Pencil size={11} /> Editar
                  </button>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors">
              <X size={18} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Cliente</label>
                <ClientPicker value={client} onChange={setClient} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Lista de precios</label>
                <div className="grid grid-cols-2 gap-2">
                  {PRICE_LIST_OPTIONS.map((list) => (
                    <button
                      key={list}
                      type="button"
                      onClick={() => setPriceList(list)}
                      className="py-2 px-2.5 rounded-md text-xs font-medium border transition-all text-left leading-tight"
                      style={{
                        background: priceList === list ? 'var(--accent-primary)' : 'var(--bg-surface)',
                        borderColor: priceList === list ? 'var(--accent-primary)' : 'var(--border-subtle)',
                        color: priceList === list ? '#fff' : 'var(--text-secondary)',
                      }}
                    >
                      {PRICE_LIST_LABELS[list]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Documento</label>
                <div className="flex gap-2">
                  {(['factura', 'nota_de_entrega'] as BillingType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setBillingType(type)}
                      className="flex-1 py-2 rounded-md text-sm font-medium border transition-all"
                      style={{
                        background: billingType === type ? 'var(--accent-primary)' : 'var(--bg-surface)',
                        borderColor: billingType === type ? 'var(--accent-primary)' : 'var(--border-subtle)',
                        color: billingType === type ? '#fff' : 'var(--text-secondary)',
                      }}
                    >
                      {BILLING_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Productos</label>
                <ProductSelector items={items} onChange={setItems} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Notas</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md px-3 py-2.5 text-sm border outline-none resize-none"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <InfoRow label="Cliente" value={order.client?.name ?? order.vendor_client} />
                {(order.client?.rif ?? null) && <InfoRow label="RIF" value={order.client!.rif!} mono />}
                <InfoRow label="Lista" value={PRICE_LIST_LABELS[order.price_list]} />
                <InfoRow label="Documento" value={BILLING_TYPE_LABELS[order.billing_type]} />
                <InfoRow label="Creado por" value={order.creator?.full_name ?? '—'} />
                <InfoRow
                  label="Fecha"
                  value={format(new Date(order.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                />
                {order.shipment && (
                  <div className="flex items-start gap-3">
                    <span className="text-xs w-24 shrink-0 pt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Camión
                    </span>
                    {onOpenShipment ? (
                      <button
                        type="button"
                        onClick={() => {
                          const sid = order.shipment!.id
                          onClose()
                          onOpenShipment(sid)
                        }}
                        className="text-sm underline hover:no-underline text-left"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        #{String(order.shipment.shipment_number).padStart(3, '0')}
                        {order.shipment.name ? ` — ${order.shipment.name}` : ''}
                      </button>
                    ) : (
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        #{String(order.shipment.shipment_number).padStart(3, '0')}
                        {order.shipment.name ? ` — ${order.shipment.name}` : ''}
                      </span>
                    )}
                  </div>
                )}
                {order.notes && <InfoRow label="Notas" value={order.notes} />}
              </div>

              <Separator style={{ background: 'var(--border-subtle)' }} />

              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>
                  Productos
                </p>
                <div className="space-y-1.5">
                  {(order.items ?? []).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 py-2 px-3 rounded-md"
                      style={{ background: 'var(--bg-surface)' }}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                          {item.product?.code}
                        </p>
                        <p className="text-sm leading-tight mt-0.5" style={{ color: 'var(--text-primary)' }}>
                          {item.product?.name}
                        </p>
                      </div>
                      <span
                        className="text-sm font-semibold font-mono shrink-0"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        ×{item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator style={{ background: 'var(--border-subtle)' }} />

              <CommentsSection
                orderId={order.id}
                comments={order.comments ?? []}
              />
            </>
          )}
        </div>

        {/* Footer */}
        {editing ? (
          <div
            className="px-5 py-4 border-t flex gap-2"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <button
              type="button"
              onClick={cancelEdit}
              disabled={updateOrder.isPending}
              className="flex-1 py-2 rounded-md text-sm border hover:bg-white/5 disabled:opacity-50"
              style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={updateOrder.isPending}
              className="flex-1 py-2 rounded-md text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--accent-primary)', color: '#fff' }}
            >
              {updateOrder.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        ) : (
          canEdit && (
            <div
              className="px-5 py-4 border-t flex justify-end"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <OrderStatusChanger orderId={order.id} currentStatus={order.status} />
            </div>
          )
        )}
      </SheetContent>
    </Sheet>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs w-24 shrink-0 pt-0.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span
        className={`text-sm ${mono ? 'font-mono' : ''}`}
        style={{ color: 'var(--text-primary)' }}
      >
        {value}
      </span>
    </div>
  )
}
