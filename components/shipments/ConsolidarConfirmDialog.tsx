'use client'

import { useEffect, useState } from 'react'
import { Truck } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

interface Props {
  open: boolean
  onClose: () => void
  orderCount: number
  totalWeight: number
  totalUnits: number
  defaultNotes?: string
  isPending: boolean
  onConfirm: (payload: { name: string; notes: string }) => void | Promise<void>
}

export function ConsolidarConfirmDialog({
  open,
  onClose,
  orderCount,
  totalWeight,
  totalUnits,
  defaultNotes = '',
  isPending,
  onConfirm,
}: Props) {
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open) {
      setName('')
      setNotes(defaultNotes)
    }
  }, [open, defaultNotes])

  const disabled = !name.trim() || isPending

  function handleConfirm() {
    if (disabled) return
    onConfirm({ name: name.trim(), notes: notes.trim() })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isPending && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Truck size={16} style={{ color: 'var(--accent-primary)' }} />
            Nuevo camión
          </DialogTitle>
          <DialogDescription style={{ color: 'var(--text-muted)' }}>
            Crea el camión con un nombre para identificarlo. Los pedidos seleccionados quedarán
            asignados pero conservan su estatus actual — los moverás a Enrutado / Entregado manualmente.
          </DialogDescription>
        </DialogHeader>

        {/* Resumen */}
        <div
          className="rounded-md border px-3 py-2.5 space-y-1"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>Pedidos</span>
            <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
              {orderCount}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>Unidades</span>
            <span className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
              ×{totalUnits}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>Peso total</span>
            <span className="font-mono font-semibold" style={{ color: 'var(--accent-primary)' }}>
              {totalWeight.toFixed(1)} kg
            </span>
          </div>
        </div>

        {/* Nombre */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Nombre del camión *
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Toyota Blanca, F-350 Rojo, Camión Rogelio"
            className="w-full rounded-md px-3 py-2 text-sm border outline-none"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !disabled) {
                e.preventDefault()
                handleConfirm()
              }
            }}
          />
        </div>

        {/* Notas */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Notas (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ruta, chofer, observaciones..."
            rows={3}
            className="w-full rounded-md px-3 py-2 text-sm border outline-none resize-none"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
          />
        </div>

        {/* Footer */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-2 rounded-md text-sm border hover:bg-white/5 disabled:opacity-50"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={disabled}
            className="flex-1 py-2 rounded-md text-sm font-semibold disabled:opacity-50"
            style={{ background: 'var(--accent-primary)', color: '#fff' }}
          >
            {isPending ? 'Creando...' : '🚛 Crear camión'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
