'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Shipment, ShipmentStatus, ShipmentUpdatePayload, Order } from '@/lib/types/database'

const SHIPMENT_SELECT = `
  *,
  creator:mm_profiles!created_by(id, full_name, role),
  orders:mm_orders!shipment_id(
    *,
    client:mm_clients!client_id(id, name, rif),
    creator:mm_profiles!created_by(id, full_name, role),
    items:mm_order_items(
      id, order_id, product_id, quantity,
      product:mm_products(id, code, name, unit, categoria, marca, presentacion, peso_kg)
    )
  )
`

export interface ShipmentWithOrders extends Shipment {
  creator?: { id: string; full_name: string; role: string }
  orders?: Order[]
}

export function useShipments(statusFilter?: ShipmentStatus | 'all') {
  const supabase = createClient()

  return useQuery<ShipmentWithOrders[]>({
    queryKey: ['shipments', statusFilter ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('mm_shipments')
        .select(SHIPMENT_SELECT)
        .order('created_at', { ascending: false })

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query
      if (error) throw error
      return data as ShipmentWithOrders[]
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
  })
}

export function useShipment(shipmentId: string | null) {
  const supabase = createClient()

  return useQuery<ShipmentWithOrders>({
    queryKey: ['shipment', shipmentId],
    queryFn: async () => {
      if (!shipmentId) throw new Error('Missing shipmentId')
      const { data, error } = await supabase
        .from('mm_shipments')
        .select(SHIPMENT_SELECT)
        .eq('id', shipmentId)
        .single()
      if (error) throw error
      return data as ShipmentWithOrders
    },
    enabled: !!shipmentId,
    staleTime: 10000,
  })
}

export function useUpdateShipment() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      shipmentId,
      payload,
    }: {
      shipmentId: string
      payload: ShipmentUpdatePayload
    }) => {
      const update: Record<string, unknown> = {}
      if (payload.status !== undefined) update.status = payload.status
      if (payload.notes !== undefined) update.notes = payload.notes || null

      const { error } = await supabase
        .from('mm_shipments')
        .update(update)
        .eq('id', shipmentId)
      if (error) throw error

      // Cascade order status when shipment status changes
      if (payload.status !== undefined) {
        let orderStatus: 'recibido' | 'en_transito' | 'entregado' = 'en_transito'
        let deliveredAt: string | null = null
        if (payload.status === 'entregado') {
          orderStatus = 'entregado'
          deliveredAt = new Date().toISOString()
        }
        const { error: cascadeErr } = await supabase
          .from('mm_orders')
          .update({ status: orderStatus, delivered_at: deliveredAt })
          .eq('shipment_id', shipmentId)
        if (cascadeErr) throw cascadeErr
      }
    },
    onSuccess: (_, { shipmentId }) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      queryClient.invalidateQueries({ queryKey: ['shipment', shipmentId] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useRemoveOrderFromShipment() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId }: { orderId: string; shipmentId: string }) => {
      const { error } = await supabase
        .from('mm_orders')
        .update({ shipment_id: null, status: 'recibido', delivered_at: null })
        .eq('id', orderId)
      if (error) throw error
    },
    onSuccess: (_, { shipmentId }) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      queryClient.invalidateQueries({ queryKey: ['shipment', shipmentId] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useAddOrdersToShipment() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ shipmentId, orderIds }: { shipmentId: string; orderIds: string[] }) => {
      if (orderIds.length === 0) return
      const { error } = await supabase
        .from('mm_orders')
        .update({ shipment_id: shipmentId, status: 'en_transito' })
        .in('id', orderIds)
      if (error) throw error
    },
    onSuccess: (_, { shipmentId }) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      queryClient.invalidateQueries({ queryKey: ['shipment', shipmentId] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
