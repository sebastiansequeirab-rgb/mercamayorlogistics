'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { useClients, useCreateClient } from '@/lib/hooks/useClients'
import toast from 'react-hot-toast'
import type { Client } from '@/lib/types/database'

interface Props {
  value: Client | null
  onChange: (client: Client | null) => void
}

export function ClientPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', rif: '', phone: '' })
  const { data: clients = [], isLoading } = useClients(true)
  const createClient = useCreateClient()

  function pick(client: Client) {
    onChange(client)
    setOpen(false)
  }

  function clear() {
    onChange(null)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) return
    try {
      const created = await createClient.mutateAsync({
        name: name.toUpperCase(),
        rif: form.rif.trim() || null,
        phone: form.phone.trim() || null,
      })
      onChange(created)
      toast.success('Cliente creado')
      setCreating(false)
      setForm({ name: '', rif: '', phone: '' })
      setOpen(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      toast.error(
        msg.includes('duplicate') || msg.includes('unique') ? 'Ese RIF ya existe' : 'Error al crear cliente'
      )
    }
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div
          className="flex items-center gap-2 p-2.5 rounded-md border"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--accent-primary)' }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
              {value.name}
            </p>
            {value.rif && (
              <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
                RIF: {value.rif}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={clear}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            aria-label="Quitar cliente"
          >
            <X size={13} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
      ) : (
        <Popover
          open={open}
          onOpenChange={(o) => {
            setOpen(o)
            if (!o) setCreating(false)
          }}
        >
          <PopoverTrigger
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-md border text-sm transition-colors hover:bg-white/5 cursor-pointer"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <span>Seleccionar cliente...</span>
            <ChevronsUpDown size={14} />
          </PopoverTrigger>
          <PopoverContent
            className="w-80 p-0"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
          >
            {creating ? (
              <form onSubmit={handleCreate} className="p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                  Nuevo cliente
                </p>
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nombre *"
                  className="w-full rounded-md px-3 py-2 text-sm border outline-none"
                  style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                />
                <input
                  value={form.rif}
                  onChange={(e) => setForm((f) => ({ ...f, rif: e.target.value }))}
                  placeholder="RIF (opcional)"
                  className="w-full rounded-md px-3 py-2 text-sm border outline-none"
                  style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                />
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Teléfono (opcional)"
                  className="w-full rounded-md px-3 py-2 text-sm border outline-none"
                  style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                />
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setCreating(false)}
                    className="flex-1 py-1.5 rounded-md text-xs border hover:bg-white/5"
                    style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createClient.isPending || !form.name.trim()}
                    className="flex-1 py-1.5 rounded-md text-xs font-semibold disabled:opacity-50"
                    style={{ background: 'var(--accent-primary)', color: '#fff' }}
                  >
                    {createClient.isPending ? 'Creando...' : 'Crear'}
                  </button>
                </div>
              </form>
            ) : (
              <Command style={{ background: 'transparent' }}>
                <CommandInput
                  placeholder="Buscar por nombre o RIF..."
                  style={{ color: 'var(--text-primary)' }}
                />
                <CommandList>
                  {isLoading ? (
                    <div className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      Cargando clientes...
                    </div>
                  ) : (
                    <>
                      <CommandEmpty style={{ color: 'var(--text-muted)' }}>
                        No hay clientes que coincidan.
                      </CommandEmpty>
                      <CommandGroup>
                        {clients.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={`${c.name} ${c.rif ?? ''}`}
                            onSelect={() => pick(c)}
                            className="cursor-pointer"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm leading-tight">{c.name}</p>
                              {c.rif && (
                                <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                  {c.rif}
                                </p>
                              )}
                            </div>
                            {value && (value as Client).id === c.id && (
                              <Check size={14} style={{ color: 'var(--accent-primary)' }} />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
                <div className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-white/5 transition-colors"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    <Plus size={14} />
                    Crear nuevo cliente
                  </button>
                </div>
              </Command>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
