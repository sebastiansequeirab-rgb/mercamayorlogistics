export type UserRole = 'admin' | 'gestora' | 'vendedor'
export type OrderStatus = 'recibido' | 'en_transito' | 'entregado'
export type PriceList = 'lista_50' | 'lista_60'
export type BillingType = 'factura' | 'nota_de_entrega'
export type ShipmentStatus = 'programado' | 'en_camino' | 'entregado'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  active: boolean
  created_at: string
}

export interface Product {
  id: string
  code: string
  name: string
  unit: string
  active: boolean
  categoria: string | null
  marca: string | null
  presentacion: string | null
  peso_kg: number | null
  created_at: string
}

export interface Order {
  id: string
  order_number: number
  created_by: string
  vendor_client: string
  price_list: PriceList
  billing_type: BillingType
  status: OrderStatus
  shipment_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  delivered_at: string | null
  // Joined fields
  creator?: Profile
  items?: OrderItemWithProduct[]
  comments?: OrderComment[]
  _count?: { items: number; comments: number }
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
}

export interface OrderItemWithProduct extends OrderItem {
  product: Product
}

export interface OrderComment {
  id: string
  order_id: string
  author_id: string
  content: string
  created_at: string
  author?: Profile
}

export interface Shipment {
  id: string
  shipment_number: number
  status: ShipmentStatus
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface NewOrderPayload {
  vendor_client: string
  price_list: PriceList
  billing_type: BillingType
  notes?: string
  items: { product_id: string; quantity: number }[]
}
