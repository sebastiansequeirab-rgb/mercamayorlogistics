import type { OrderStatus, PriceList, ShipmentStatus } from '@/lib/types/database'

export const SHIPMENT_STATUS_CONFIG: Record<
  ShipmentStatus,
  {
    label: string
    color: string
    bg: string
    next: ShipmentStatus[]
    nextLabels: string[]
    nextForward: boolean[]
  }
> = {
  programado: {
    label: 'PROGRAMADO',
    color: '#F59E0B',
    bg: '#1C1500',
    next: ['en_camino'],
    nextLabels: ['Pasar a En Camino'],
    nextForward: [true],
  },
  en_camino: {
    label: 'EN CAMINO',
    color: '#3B82F6',
    bg: '#0A1628',
    next: ['entregado', 'programado'],
    nextLabels: ['Marcar como Entregado', 'Devolver a Programado'],
    nextForward: [true, false],
  },
  entregado: {
    label: 'ENTREGADO',
    color: '#22C55E',
    bg: '#0A1F0E',
    next: ['en_camino'],
    nextLabels: ['Devolver a En Camino'],
    nextForward: [false],
  },
}

export function getShipmentStatusConfig(status: ShipmentStatus) {
  return SHIPMENT_STATUS_CONFIG[status]
}

export const STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string
    color: string
    bg: string
    next: OrderStatus[]
    nextLabels: string[]
    nextForward: boolean[]
  }
> = {
  recibido: {
    label: 'RECIBIDO',
    color: '#F59E0B',
    bg: '#1C1500',
    next: ['en_transito'],
    nextLabels: ['Enrutar pedido'],
    nextForward: [true],
  },
  en_transito: {
    label: 'ENRUTADO',
    color: '#3B82F6',
    bg: '#0A1628',
    next: ['entregado', 'recibido'],
    nextLabels: ['Marcar como Entregado', 'Devolver a Recibido'],
    nextForward: [true, false],
  },
  entregado: {
    label: 'ENTREGADO',
    color: '#22C55E',
    bg: '#0A1F0E',
    next: ['en_transito'],
    nextLabels: ['Devolver a Enrutado'],
    nextForward: [false],
  },
}

export function getStatusConfig(status: OrderStatus) {
  return STATUS_CONFIG[status]
}

export const PRICE_LIST_OPTIONS: PriceList[] = [
  'lista_50_mm',
  'lista_60_mm',
  'lista_a_albeca',
  'lista_b_albeca',
  'lista_c_albeca',
  'lista_a_ioseca',
  'lista_b_ioseca',
]

export const PRICE_LIST_LABELS: Record<PriceList, string> = {
  lista_50_mm: 'Lista 50 MM Tradicional',
  lista_60_mm: 'Lista 60 MM Tradicional',
  lista_a_albeca: 'Lista A Agenciados Albeca',
  lista_b_albeca: 'Lista B Agenciados Albeca',
  lista_c_albeca: 'Lista C Agenciados Albeca',
  lista_a_ioseca: 'Lista A Ioseca',
  lista_b_ioseca: 'Lista B Ioseca',
}

export const PRICE_LIST_SHORT: Record<PriceList, string> = {
  lista_50_mm: 'L50 MM',
  lista_60_mm: 'L60 MM',
  lista_a_albeca: 'A Albeca',
  lista_b_albeca: 'B Albeca',
  lista_c_albeca: 'C Albeca',
  lista_a_ioseca: 'A Ioseca',
  lista_b_ioseca: 'B Ioseca',
}

export const BILLING_TYPE_LABELS: Record<string, string> = {
  factura: 'Factura',
  nota_de_entrega: 'Nota de Entrega',
}
