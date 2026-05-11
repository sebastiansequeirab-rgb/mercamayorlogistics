'use client'

import { ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getShipmentStatusConfig } from '@/lib/utils/order-status'
import { useUpdateShipment } from '@/lib/hooks/useShipments'
import type { ShipmentStatus } from '@/lib/types/database'
import toast from 'react-hot-toast'

interface Props {
  shipmentId: string
  currentStatus: ShipmentStatus
}

export function ShipmentStatusChanger({ shipmentId, currentStatus }: Props) {
  const config = getShipmentStatusConfig(currentStatus)
  const updateShipment = useUpdateShipment()

  async function handleChange(nextStatus: ShipmentStatus, label: string) {
    try {
      await updateShipment.mutateAsync({ shipmentId, payload: { status: nextStatus } })
      toast.success(
        nextStatus === 'entregado'
          ? '✅ Camión marcado como Entregado'
          : `🚛 Estado actualizado: ${label}`
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
        disabled={updateShipment.isPending}
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
              onClick={() => handleChange(nextStatus, config.nextLabels[i])}
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
