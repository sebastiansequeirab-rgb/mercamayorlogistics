'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type {
  Shipment,
  ShipmentStatus,
  ShipmentUpdatePayload,
  Order,
  ShipmentItem,
  ShipmentAllocationInput,
} from '@/lib/types/database'

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
  ),
  shipment_items:mm_shipment_items(
    id, shipment_id, order_id, product_id, quantity, created_at,
    product:mm_products(id, code, name, unit, categoria, marca, presentacion, peso_kg)
  )
`

export interface ShipmentWithOrders extends Shipment {
  creator?: { id: string; full_name: string; role: string }
  orders?: Order[]
  shipment_items?: ShipmentItem[]
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
      if (payload.name !== undefined) update.name = payload.name?.trim() || null

      const { error } = await supabase
        .from('mm_shipments')
        .update(update)
        .eq('id', shipmentId)
      if (error) throw error

      // Sin cascade — el status del camión es independiente del status de los pedidos.
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
    mutationFn: async ({ orderId, shipmentId }: { orderId: string; shipmentId: string }) => {
      // Borrar todas las allocations de esta orden en este camión
      const { error: allocErr } = await supabase
        .from('mm_shipment_items')
        .delete()
        .eq('shipment_id', shipmentId)
        .eq('order_id', orderId)
      if (allocErr) throw allocErr

      // Soltar la orden del camión
      const { error: orderErr } = await supabase
        .from('mm_orders')
        .update({ shipment_id: null })
        .eq('id', orderId)
      if (orderErr) throw orderErr
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

      // Marcar las órdenes como vinculadas al camión
      const { error: orderErr } = await supabase
        .from('mm_orders')
        .update({ shipment_id: shipmentId })
        .in('id', orderIds)
      if (orderErr) throw orderErr

      // Crear allocations completas: por cada item de cada orden, una row con quantity total.
      const { data: items, error: itemsErr } = await supabase
        .from('mm_order_items')
        .select('order_id, product_id, quantity')
        .in('order_id', orderIds)
      if (itemsErr) throw itemsErr
      if (!items || items.length === 0) return

      const rows = items.map((it) => ({
        shipment_id: shipmentId,
        order_id: it.order_id,
        product_id: it.product_id,
        quantity: it.quantity,
      }))
      const { error: allocErr } = await supabase
        .from('mm_shipment_items')
        .upsert(rows, { onConflict: 'shipment_id,order_id,product_id' })
      if (allocErr) throw allocErr
    },
    onSuccess: (_, { shipmentId }) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      queryClient.invalidateQueries({ queryKey: ['shipment', shipmentId] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

/** Actualiza la cantidad asignada de un item dentro de un camión. Si quantity=0, elimina la fila. */
export function useUpdateShipmentItem() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      shipmentItemId,
      quantity,
      shipmentId,
    }: {
      shipmentItemId: string
      quantity: number
      shipmentId: string
    }) => {
      if (quantity <= 0) {
        const { error } = await supabase
          .from('mm_shipment_items')
          .delete()
          .eq('id', shipmentItemId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('mm_shipment_items')
          .update({ quantity })
          .eq('id', shipmentItemId)
        if (error) throw error
      }
      void shipmentId
    },
    onSuccess: (_, { shipmentId }) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      queryClient.invalidateQueries({ queryKey: ['shipment', shipmentId] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

/** Mueve TODAS las allocations de una orden de un camión origen a un camión destino. */
export function useMoveOrderToShipment() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      orderId,
      fromShipmentId,
      toShipmentId,
    }: {
      orderId: string
      fromShipmentId: string
      toShipmentId: string
    }) => {
      if (fromShipmentId === toShipmentId) return

      // Traer las allocations actuales en el camión origen
      const { data: current, error: getErr } = await supabase
        .from('mm_shipment_items')
        .select('product_id, quantity')
        .eq('shipment_id', fromShipmentId)
        .eq('order_id', orderId)
      if (getErr) throw getErr

      // Borrar las del origen
      const { error: delErr } = await supabase
        .from('mm_shipment_items')
        .delete()
        .eq('shipment_id', fromShipmentId)
        .eq('order_id', orderId)
      if (delErr) throw delErr

      // Insertar (upsert) en el destino
      if (current && current.length > 0) {
        const rows = current.map((it) => ({
          shipment_id: toShipmentId,
          order_id: orderId,
          product_id: it.product_id,
          quantity: it.quantity,
        }))
        const { error: insErr } = await supabase
          .from('mm_shipment_items')
          .upsert(rows, { onConflict: 'shipment_id,order_id,product_id' })
        if (insErr) throw insErr
      }

      // Cambiar shipment_id de la orden
      const { error: orderErr } = await supabase
        .from('mm_orders')
        .update({ shipment_id: toShipmentId })
        .eq('id', orderId)
      if (orderErr) throw orderErr
    },
    onSuccess: (_, { fromShipmentId, toShipmentId }) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      queryClient.invalidateQueries({ queryKey: ['shipment', fromShipmentId] })
      queryClient.invalidateQueries({ queryKey: ['shipment', toShipmentId] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

/** Agrega allocations específicas (item-level) a un camión existente — sin tocar el shipment_id de las órdenes. */
export function useAddAllocations() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      shipmentId,
      allocations,
    }: {
      shipmentId: string
      allocations: ShipmentAllocationInput[]
    }) => {
      if (allocations.length === 0) return
      const orderIds = Array.from(new Set(allocations.map((a) => a.order_id)))

      const { error: orderErr } = await supabase
        .from('mm_orders')
        .update({ shipment_id: shipmentId })
        .in('id', orderIds)
      if (orderErr) throw orderErr

      const rows = allocations.map((a) => ({
        shipment_id: shipmentId,
        order_id: a.order_id,
        product_id: a.product_id,
        quantity: a.quantity,
      }))
      const { error } = await supabase
        .from('mm_shipment_items')
        .upsert(rows, { onConflict: 'shipment_id,order_id,product_id' })
      if (error) throw error
    },
    onSuccess: (_, { shipmentId }) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      queryClient.invalidateQueries({ queryKey: ['shipment', shipmentId] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
