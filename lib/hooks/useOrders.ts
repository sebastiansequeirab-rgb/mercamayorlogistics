'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Order, OrderStatus, NewOrderPayload, UpdateOrderPayload } from '@/lib/types/database'

const ORDER_SELECT = `
  *,
  creator:mm_profiles!created_by(id, full_name, role),
  client:mm_clients!client_id(id, name, rif, address, phone, active, created_at),
  shipment:mm_shipments!shipment_id(id, shipment_number, status, notes, created_at),
  items:mm_order_items(
    id, order_id, product_id, quantity,
    product:mm_products(id, code, name, unit, categoria, marca, presentacion, peso_kg)
  ),
  comments:mm_order_comments(
    id, order_id, author_id, content, created_at,
    author:mm_profiles!author_id(id, full_name, role)
  )
`

export type OrderFilter = OrderStatus | 'active' | 'active_plus_delivered'

export function useOrders(statusFilter?: OrderFilter) {
  const supabase = createClient()

  return useQuery<Order[]>({
    queryKey: ['orders', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('mm_orders')
        .select(ORDER_SELECT)
        .order('created_at', { ascending: false })

      if (statusFilter === 'active') {
        query = query.in('status', ['recibido', 'en_transito'])
      } else if (statusFilter === 'active_plus_delivered') {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 30)
        query = query.or(
          `status.in.(recibido,en_transito),and(status.eq.entregado,delivered_at.gte.${cutoff.toISOString()})`
        )
      } else if (statusFilter) {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Order[]
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
  })
}

export function useOrder(orderId: string) {
  const supabase = createClient()

  return useQuery<Order>({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mm_orders')
        .select(ORDER_SELECT)
        .eq('id', orderId)
        .single()
      if (error) throw error
      return data as Order
    },
    staleTime: 10000,
  })
}

export function useCreateOrder() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: NewOrderPayload) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { data: order, error: orderError } = await supabase
        .from('mm_orders')
        .insert({
          created_by: user.id,
          client_id: payload.client_id ?? null,
          vendor_client: payload.vendor_client,
          price_list: payload.price_list,
          billing_type: payload.billing_type,
          notes: payload.notes || null,
          status: 'recibido',
        })
        .select('id, order_number')
        .single()

      if (orderError) throw orderError

      const items = payload.items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
      }))

      const { error: itemsError } = await supabase
        .from('mm_order_items')
        .insert(items)

      if (itemsError) throw itemsError

      return order
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useUpdateOrder() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      orderId,
      payload,
    }: {
      orderId: string
      payload: UpdateOrderPayload
    }) => {
      const { items, ...rest } = payload
      const updateData: Record<string, unknown> = {}
      if (rest.client_id !== undefined) updateData.client_id = rest.client_id
      if (rest.vendor_client !== undefined) updateData.vendor_client = rest.vendor_client
      if (rest.price_list !== undefined) updateData.price_list = rest.price_list
      if (rest.billing_type !== undefined) updateData.billing_type = rest.billing_type
      if (rest.notes !== undefined) updateData.notes = rest.notes || null

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('mm_orders')
          .update(updateData)
          .eq('id', orderId)
        if (error) throw error
      }

      if (items) {
        // Replace items: delete existing then insert new
        const { error: delError } = await supabase
          .from('mm_order_items')
          .delete()
          .eq('order_id', orderId)
        if (delError) throw delError

        if (items.length > 0) {
          const rows = items.map((it) => ({
            order_id: orderId,
            product_id: it.product_id,
            quantity: it.quantity,
          }))
          const { error: insError } = await supabase.from('mm_order_items').insert(rows)
          if (insError) throw insError
        }
      }
    },
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
    },
  })
}

export function useUpdateOrderStatus() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string
      status: OrderStatus
    }) => {
      const updateData: Record<string, unknown> = {
        status,
        delivered_at: status === 'entregado' ? new Date().toISOString() : null,
      }

      const { error } = await supabase
        .from('mm_orders')
        .update(updateData)
        .eq('id', orderId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useConsolidarOrders() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      orderIds,
      notes,
    }: {
      orderIds: string[]
      notes?: string
    }) => {
      if (orderIds.length === 0) throw new Error('No hay pedidos seleccionados')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      // 1. Create shipment
      const { data: shipment, error: shipError } = await supabase
        .from('mm_shipments')
        .insert({
          status: 'programado',
          notes: notes?.trim() || null,
          created_by: user.id,
        })
        .select('id, shipment_number')
        .single()

      if (shipError) throw shipError

      // 2. Link orders to shipment and mark en_transito
      const { error: updateError } = await supabase
        .from('mm_orders')
        .update({ status: 'en_transito', shipment_id: shipment.id })
        .in('id', orderIds)

      if (updateError) throw updateError

      return shipment
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
    },
  })
}

export function useAddComment() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      orderId,
      content,
    }: {
      orderId: string
      content: string
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { error } = await supabase.from('mm_order_comments').insert({
        order_id: orderId,
        author_id: user.id,
        content,
      })

      if (error) throw error
    },
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
    },
  })
}
