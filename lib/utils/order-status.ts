import type { OrderStatus, ShipmentStatus } from '@/lib/types/database'

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
    nextLabels: ['Pasar a En Tránsito'],
    nextForward: [true],
  },
  en_transito: {
    label: 'EN TRÁNSITO',
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
    nextLabels: ['Devolver a En Tránsito'],
    nextForward: [false],
  },
}

export function getStatusConfig(status: OrderStatus) {
  return STATUS_CONFIG[status]
}

export const PRICE_LIST_LABELS: Record<string, string> = {
  lista_50: 'Lista 50',
  lista_60: 'Lista 60',
}

export const BILLING_TYPE_LABELS: Record<string, string> = {
  factura: 'Factura',
  nota_de_entrega: 'Nota de Entrega',
}
