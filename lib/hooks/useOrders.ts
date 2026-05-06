'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Order, OrderStatus, NewOrderPayload } from '@/lib/types/database'

const ORDER_SELECT = `
  *,
  creator:mm_profiles!created_by(id, full_name, role),
  items:mm_order_items(
    id, order_id, product_id, quantity,
    product:mm_products(id, code, name, unit, categoria, marca, presentacion, peso_kg)
  ),
  comments:mm_order_comments(
    id, order_id, author_id, content, created_at,
    author:mm_profiles!author_id(id, full_name, role)
  )
`

export function useOrders(statusFilter?: OrderStatus | 'active') {
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

      // Insert order
      const { data: order, error: orderError } = await supabase
        .from('mm_orders')
        .insert({
          created_by: user.id,
          vendor_client: payload.vendor_client,
          price_list: payload.price_list,
          billing_type: payload.billing_type,
          notes: payload.notes || null,
          status: 'recibido',
        })
        .select('id, order_number')
        .single()

      if (orderError) throw orderError

      // Insert items
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
      const updateData: Record<string, unknown> = { status }
      if (status === 'entregado') {
        updateData.delivered_at = new Date().toISOString()
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
    mutationFn: async (orderIds: string[]) => {
      const { error } = await supabase
        .from('mm_orders')
        .update({ status: 'en_transito' })
        .in('id', orderIds)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
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
