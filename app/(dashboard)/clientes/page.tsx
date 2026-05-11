'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import { Plus, X, Pencil, Search } from 'lucide-react'
import { useClients, useToggleClient, useCreateClient, useUpdateClient } from '@/lib/hooks/useClients'
import { useProfile } from '@/lib/hooks/useProfile'
import { Skeleton } from '@/components/ui/skeleton'
import toast from 'react-hot-toast'
import type { Client, ClientPayload } from '@/lib/types/database'

type FormState = ClientPayload

const EMPTY_FORM: FormState = { name: '', rif: '', address: '', phone: '' }

export default function ClientesPage() {
  const { data: clients = [], isLoading } = useClients(false)
  const { data: profile } = useProfile()
  const toggleClient = useToggleClient()
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()

  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const canManage = profile?.role === 'admin' || profile?.role === 'gestora'

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.rif ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q)
    )
  }, [clients, search])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(client: Client) {
    setEditing(client)
    setForm({
      name: client.name,
      rif: client.rif ?? '',
      address: client.address ?? '',
      phone: client.phone ?? '',
    })
    setShowModal(true)
  }

  function resetModal() {
    setShowModal(false)
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  async function handleToggle(id: string, current: boolean) {
    try {
      await toggleClient.mutateAsync({ id, active: !current })
    } catch {
      toast.error('Error al actualizar cliente')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) return
    const payload: ClientPayload = {
      name: name.toUpperCase(),
      rif: form.rif?.trim() || null,
      address: form.address?.trim() || null,
      phone: form.phone?.trim() || null,
    }
    try {
      if (editing) {
        await updateClient.mutateAsync({ id: editing.id, payload })
        toast.success('Cliente actualizado')
      } else {
        await createClient.mutateAsync(payload)
        toast.success('Cliente creado')
      }
      resetModal()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      toast.error(
        msg.includes('duplicate') || msg.includes('unique')
          ? 'Ese RIF ya existe'
          : 'Error al guardar cliente'
      )
    }
  }

  const isPending = createClient.isPending || updateClient.isPending

  return (
    <div className="px-4 md:px-6 py-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Clientes</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {clients.filter((c) => c.active).length} activos · {clients.filter((c) => !c.active).length} inactivos
          </p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium"
            style={{ background: 'var(--accent-primary)', color: '#fff' }}
          >
            <Plus size={14} />
            Nuevo Cliente
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, RIF o teléfono..."
          className="w-full rounded-md pl-9 pr-3 py-2 text-sm border outline-none"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Nombre</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>RIF</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: 'var(--text-muted)' }}>Teléfono</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden lg:table-cell" style={{ color: 'var(--text-muted)' }}>Dirección</th>
              {canManage && <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}><td colSpan={5} className="px-4 py-2"><Skeleton className="h-8 w-full rounded" style={{ background: 'var(--bg-surface)' }} /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                {search ? 'Sin resultados' : 'No hay clientes aún'}
              </td></tr>
            ) : filtered.map((client, i) => (
              <tr
                key={client.id}
                style={{
                  background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-surface)',
                  borderBottom: '1px solid var(--border-subtle)',
                  opacity: client.active ? 1 : 0.45,
                  transition: 'opacity 0.2s',
                }}
              >
                <td className="px-4 py-3 max-w-[220px]" style={{ color: 'var(--text-primary)' }}>
                  <span className="block truncate font-medium">{client.name}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{client.rif ?? '—'}</td>
                <td className="px-4 py-3 text-xs hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>{client.phone ?? '—'}</td>
                <td className="px-4 py-3 text-xs hidden lg:table-cell max-w-[260px]" style={{ color: 'var(--text-secondary)' }}>
                  <span className="block truncate">{client.address ?? '—'}</span>
                </td>
                {canManage && (
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => openEdit(client)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded mr-1 hover:bg-white/5"
                      style={{ color: 'var(--text-secondary)' }}
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleToggle(client.id, client.active)}
                      disabled={toggleClient.isPending}
                      className="px-2.5 py-1 rounded text-xs font-medium border transition-all disabled:opacity-50"
                      style={{
                        color: client.active ? 'var(--status-entregado)' : 'var(--text-muted)',
                        borderColor: client.active ? 'var(--status-entregado)' : 'var(--border-subtle)',
                        background: client.active ? 'var(--status-entregado-bg)' : 'transparent',
                      }}
                    >
                      {client.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={(e) => e.target === e.currentTarget && resetModal()}>
          <div className="w-full max-w-md rounded-xl border p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editing ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <button onClick={resetModal} className="p-1 rounded hover:bg-white/10"><X size={16} style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              {[
                { label: 'Nombre *', key: 'name' as const, placeholder: 'DISTRIBUIDORA EL PALMAR', required: true },
                { label: 'RIF', key: 'rif' as const, placeholder: 'J-12345678-9' },
                { label: 'Teléfono', key: 'phone' as const, placeholder: '0412-1234567' },
                { label: 'Dirección', key: 'address' as const, placeholder: 'Av. Bolívar, Caracas' },
              ].map(({ label, key, placeholder }) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</label>
                  <input
                    value={(form[key] ?? '') as string}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full rounded-md px-3 py-2 text-sm border outline-none"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                  />
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={resetModal} className="flex-1 py-2 rounded-md text-sm border hover:bg-white/5" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}>Cancelar</button>
                <button
                  type="submit"
                  disabled={isPending || !form.name.trim()}
                  className="flex-1 py-2 rounded-md text-sm font-semibold disabled:opacity-50"
                  style={{ background: 'var(--accent-primary)', color: '#fff' }}
                >
                  {isPending ? 'Guardando...' : editing ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
