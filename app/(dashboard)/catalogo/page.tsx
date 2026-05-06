'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useProducts, useToggleProduct, useCreateProduct } from '@/lib/hooks/useProducts'
import { useProfile } from '@/lib/hooks/useProfile'
import { Skeleton } from '@/components/ui/skeleton'
import toast from 'react-hot-toast'

export default function CatalogoPage() {
  const { data: products = [], isLoading } = useProducts(false)
  const { data: profile } = useProfile()
  const toggleProduct = useToggleProduct()
  const createProduct = useCreateProduct()

  const [showModal, setShowModal] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [newUnit, setNewUnit] = useState('unidad')

  const canManage = profile?.role === 'admin' || profile?.role === 'gestora'

  async function handleToggle(id: string, current: boolean) {
    try {
      await toggleProduct.mutateAsync({ id, active: !current })
    } catch {
      toast.error('Error al actualizar producto')
    }
  }

  function resetModal() {
    setShowModal(false)
    setNewCode('')
    setNewName('')
    setNewUnit('unidad')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newCode.trim() || !newName.trim()) return
    try {
      await createProduct.mutateAsync({
        code: newCode.trim().toUpperCase(),
        name: newName.trim().toUpperCase(),
        unit: newUnit.trim() || 'unidad',
      })
      toast.success('Producto creado')
      resetModal()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      toast.error(msg.includes('duplicate') || msg.includes('unique') ? 'Ese código ya existe' : 'Error al crear producto')
    }
  }

  return (
    <div className="px-4 md:px-6 py-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Catálogo de Productos</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {products.filter((p) => p.active).length} activos · {products.filter((p) => !p.active).length} inactivos
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={{ background: 'var(--accent-primary)', color: '#fff' }}
          >
            <Plus size={14} />
            Nuevo Producto
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Código
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Nombre
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>
                Unidad
              </th>
              {canManage && (
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Estado
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={4} className="px-4 py-2">
                    <Skeleton className="h-8 w-full rounded" style={{ background: 'var(--bg-surface)' }} />
                  </td>
                </tr>
              ))
            ) : (
              products.map((product, i) => (
                <tr
                  key={product.id}
                  style={{
                    background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-surface)',
                    borderBottom: '1px solid var(--border-subtle)',
                    opacity: product.active ? 1 : 0.45,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <td className="px-4 py-3 font-mono text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                    {product.code}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>
                    {product.name}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>
                    {product.unit}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleToggle(product.id, product.active)}
                        disabled={toggleProduct.isPending}
                        className="px-2.5 py-1 rounded text-xs font-medium border transition-all disabled:opacity-50"
                        style={{
                          color: product.active ? 'var(--status-entregado)' : 'var(--text-muted)',
                          borderColor: product.active ? 'var(--status-entregado)' : 'var(--border-subtle)',
                          background: product.active ? 'var(--status-entregado-bg)' : 'transparent',
                        }}
                      >
                        {product.active ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New product modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={(e) => e.target === e.currentTarget && resetModal()}
        >
          <div
            className="w-full max-w-sm rounded-xl border p-6 space-y-4"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Nuevo Producto</h2>
              <button onClick={resetModal} className="p-1 rounded hover:bg-white/10 transition-colors">
                <X size={16} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              {[
                { label: 'Código *', value: newCode, set: setNewCode, placeholder: 'PT01TULI18LT' },
                { label: 'Nombre *', value: newName, set: setNewName, placeholder: 'OLEINA DE PALMA 18LT' },
                { label: 'Unidad', value: newUnit, set: setNewUnit, placeholder: 'unidad' },
              ].map(({ label, value, set, placeholder }) => (
                <div key={label} className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {label}
                  </label>
                  <input
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-md px-3 py-2 text-sm border outline-none"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                  />
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={resetModal}
                  className="flex-1 py-2 rounded-md text-sm border transition-colors hover:bg-white/5"
                  style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createProduct.isPending || !newCode.trim() || !newName.trim()}
                  className="flex-1 py-2 rounded-md text-sm font-semibold transition-all disabled:opacity-50"
                  style={{ background: 'var(--accent-primary)', color: '#fff' }}
                >
                  {createProduct.isPending ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
