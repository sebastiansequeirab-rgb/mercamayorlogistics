'use client'

import { useState } from 'react'
import { useCreateOrder } from '@/lib/hooks/useOrders'
import { useProducts } from '@/lib/hooks/useProducts'
import { ProductSelector } from './ProductSelector'
import { ClientPicker } from './ClientPicker'
import type { Client, Product, PriceList, BillingType } from '@/lib/types/database'
import toast from 'react-hot-toast'

interface SelectedItem {
  product: Product
  quantity: number
}

interface Props {
  onSuccess?: () => void
}

export function NewOrderForm({ onSuccess }: Props) {
  const [client, setClient] = useState<Client | null>(null)
  const [priceList, setPriceList] = useState<PriceList>('lista_50')
  const [billingType, setBillingType] = useState<BillingType>('factura')
  const [items, setItems] = useState<SelectedItem[]>([])
  const [notes, setNotes] = useState('')

  const createOrder = useCreateOrder()
  useProducts() // pre-fetch so products are in cache when Popover opens

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!client) {
      toast.error('Selecciona un cliente')
      return
    }
    if (items.length === 0) {
      toast.error('Agrega al menos un producto')
      return
    }

    try {
      const order = await createOrder.mutateAsync({
        client_id: client.id,
        vendor_client: client.name,
        price_list: priceList,
        billing_type: billingType,
        notes: notes.trim() || undefined,
        items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
      })

      toast.success(`✅ Pedido #${String(order.order_number).padStart(3, '0')} enviado`)
      setClient(null)
      setPriceList('lista_50')
      setBillingType('factura')
      setItems([])
      setNotes('')
      onSuccess?.()
    } catch {
      toast.error('Error al crear el pedido')
    }
  }

  const isPending = createOrder.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-5 mt-4">
      {/* Client picker */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Cliente *
        </label>
        <ClientPicker value={client} onChange={setClient} />
      </div>

      {/* Price list toggle */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Lista de precios *
        </label>
        <div className="flex gap-2">
          {(['lista_50', 'lista_60'] as PriceList[]).map((list) => (
            <button
              key={list}
              type="button"
              onClick={() => setPriceList(list)}
              className="flex-1 py-2.5 rounded-md text-sm font-medium border transition-all"
              style={{
                background: priceList === list ? 'var(--accent-primary)' : 'var(--bg-surface)',
                borderColor: priceList === list ? 'var(--accent-primary)' : 'var(--border-subtle)',
                color: priceList === list ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {list === 'lista_50' ? 'Lista 50' : 'Lista 60'}
            </button>
          ))}
        </div>
      </div>

      {/* Billing type toggle */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Tipo de documento *
        </label>
        <div className="flex gap-2">
          {(['factura', 'nota_de_entrega'] as BillingType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setBillingType(type)}
              className="flex-1 py-2.5 rounded-md text-sm font-medium border transition-all"
              style={{
                background: billingType === type ? 'var(--accent-primary)' : 'var(--bg-surface)',
                borderColor: billingType === type ? 'var(--accent-primary)' : 'var(--border-subtle)',
                color: billingType === type ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {type === 'factura' ? 'Factura' : 'Nota de Entrega'}
            </button>
          ))}
        </div>
      </div>

      {/* Products */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Productos *
        </label>
        <ProductSelector items={items} onChange={setItems} />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Comentarios
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Alguna nota sobre el pedido..."
          rows={3}
          className="w-full rounded-md px-3 py-2.5 text-sm border outline-none resize-none"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 rounded-md text-sm font-semibold transition-all disabled:opacity-50"
        style={{ background: 'var(--accent-primary)', color: '#fff' }}
      >
        {isPending ? 'Enviando...' : '📤 Enviar Pedido'}
      </button>
    </form>
  )
}
