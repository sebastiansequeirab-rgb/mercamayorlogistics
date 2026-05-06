import type { OrderStatus } from '@/lib/types/database'

export const STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string
    color: string
    bg: string
    next: OrderStatus[]
    nextLabels: string[]
  }
> = {
  recibido: {
    label: 'RECIBIDO',
    color: '#F59E0B',
    bg: '#1C1500',
    next: ['en_transito'],
    nextLabels: ['Pasar a En Tránsito'],
  },
  en_transito: {
    label: 'EN TRÁNSITO',
    color: '#3B82F6',
    bg: '#0A1628',
    next: ['entregado'],
    nextLabels: ['Marcar como Entregado'],
  },
  entregado: {
    label: 'ENTREGADO',
    color: '#22C55E',
    bg: '#0A1F0E',
    next: [],
    nextLabels: [],
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
