'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { NewOrderForm } from '@/components/forms/NewOrderForm'
import { useProfile } from '@/lib/hooks/useProfile'

export function Topbar() {
  const [open, setOpen] = useState(false)
  const { data: profile } = useProfile()

  return (
    <>
      <header
        className="h-14 border-b flex items-center justify-between px-4 md:px-6 shrink-0"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
      >
        {/* Mobile logo */}
        <span className="md:hidden text-base font-bold tracking-tight">
          MERCA<span style={{ color: 'var(--accent-primary)' }}>MAYOR</span>
        </span>

        {/* Desktop spacer */}
        <div className="hidden md:block" />

        <div className="flex items-center gap-3">
          <span className="hidden md:block text-sm" style={{ color: 'var(--text-secondary)' }}>
            {profile?.full_name}
          </span>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={{ background: 'var(--accent-primary)', color: '#fff' }}
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Nuevo Pedido</span>
          </button>
        </div>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg overflow-y-auto"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          <SheetHeader>
            <SheetTitle style={{ color: 'var(--text-primary)' }}>Nuevo Pedido</SheetTitle>
          </SheetHeader>
          <NewOrderForm onSuccess={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}
