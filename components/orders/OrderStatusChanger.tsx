'use client'

import { ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getStatusConfig } from '@/lib/utils/order-status'
import { useUpdateOrderStatus } from '@/lib/hooks/useOrders'
import type { OrderStatus } from '@/lib/types/database'
import toast from 'react-hot-toast'

interface Props {
  orderId: string
  currentStatus: OrderStatus
}

export function OrderStatusChanger({ orderId, currentStatus }: Props) {
  const config = getStatusConfig(currentStatus)
  const updateStatus = useUpdateOrderStatus()

  async function handleChange(nextStatus: OrderStatus, label: string) {
    try {
      await updateStatus.mutateAsync({ orderId, status: nextStatus })
      toast.success(
        nextStatus === 'entregado'
          ? '✅ Pedido marcado como Entregado'
          : `📦 Estado actualizado: ${label}`
      )
    } catch {
      toast.error('Error al actualizar el estado')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors hover:bg-white/5 cursor-pointer"
        style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)', background: 'transparent' }}
        disabled={updateStatus.isPending}
      >
        Cambiar estado
        <ChevronDown size={13} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        {config.next.map((nextStatus, i) => {
          const isForward = config.nextForward[i]
          return (
            <DropdownMenuItem
              key={nextStatus}
              onClick={() => handleChange(nextStatus as OrderStatus, config.nextLabels[i])}
              className="text-sm cursor-pointer flex items-center gap-2"
              style={{ color: isForward ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              <span>{isForward ? '→' : '←'}</span>
              {config.nextLabels[i]}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
