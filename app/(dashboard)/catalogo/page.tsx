'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { Plus, X, Pencil } from 'lucide-react'
import { useProducts, useToggleProduct, useCreateProduct, useUpdateProduct } from '@/lib/hooks/useProducts'
import { useProfile } from '@/lib/hooks/useProfile'
import { Skeleton } from '@/components/ui/skeleton'
import toast from 'react-hot-toast'
import type { Product } from '@/lib/types/database'

const CATEGORIAS = ['Aceite de Palma', 'Aceite Vegetal', 'Manteca Vegetal', 'Margarina', 'Mayonesa', 'Oleina de Palma']
const MARCAS = ['De Primera', 'Key', 'La Rendidora', 'Tulipan']
const PRESENTACIONES = ['5 KG', '18 LT', '12x750 ML', '20x500 ML', '12x400 GRS', '12x445 GRS']

const CATEGORIA_COLORS: Record<string, string> = {
  'Aceite de Palma': '#F59E0B',
  'Aceite Vegetal':  '#3B82F6',
  'Manteca Vegetal': '#8B5CF6',
  'Margarina':       '#EC4899',
  'Mayonesa':        '#F97316',
  'Oleina de Palma': '#22C55E',
}

const EMPTY_FORM = { code: '', name: '', unit: 'unidad', categoria: '', marca: '', presentacion: '', peso_kg: '' }

export default function CatalogoPage() {
  const { data: products = [], isLoading } = useProducts(false)
  const { data: profile } = useProfile()
  const toggleProduct = useToggleProduct()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()

  const [filterCategoria, setFilterCategoria] = useState('Todos')
  const [filterMarca, setFilterMarca] = useState('Todos')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const canManage = profile?.role === 'admin' || profile?.role === 'gestora'

  const filtered = products.filter((p) => {
    if (filterCategoria !== 'Todos' && p.categoria !== filterCategoria) return false
    if (filterMarca !== 'Todos' && p.marca !== filterMarca) return false
    return true
  })

  async function handleToggle(id: string, current: boolean) {
    try {
      await toggleProduct.mutateAsync({ id, active: !current })
    } catch {
      toast.error('Error al actualizar producto')
    }
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(product: Product) {
    setEditing(product)
    setForm({
      code: product.code,
      name: product.name,
      unit: product.unit,
      categoria: product.categoria ?? '',
      marca: product.marca ?? '',
      presentacion: product.presentacion ?? '',
      peso_kg: product.peso_kg != null ? String(product.peso_kg) : '',
    })
    setShowModal(true)
  }

  function resetModal() {
    setShowModal(false)
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code.trim() || !form.name.trim()) return
    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim().toUpperCase(),
      unit: form.unit.trim() || 'unidad',
      categoria: form.categoria || null,
      marca: form.marca || null,
      presentacion: form.presentacion || null,
      peso_kg: form.peso_kg ? parseFloat(form.peso_kg) : null,
    }
    try {
      if (editing) {
        await updateProduct.mutateAsync({ id: editing.id, payload })
        toast.success('Producto actualizado')
      } else {
        await createProduct.mutateAsync(payload)
        toast.success('Producto creado')
      }
      resetModal()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      toast.error(msg.includes('duplicate') || msg.includes('unique') ? 'Ese código ya existe' : 'Error al guardar producto')
    }
  }

  const isPending = createProduct.isPending || updateProduct.isPending

  return (
    <div className="px-4 md:px-6 py-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Catálogo de Productos</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {products.filter((p) => p.active).length} activos · {products.filter((p) => !p.active).length} inactivos
          </p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium"
            style={{ background: 'var(--accent-primary)', color: '#fff' }}
          >
            <Plus size={14} />
            Nuevo Producto
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex gap-1">
          {['Todos', ...CATEGORIAS].map((c) => (
            <button
              key={c}
              onClick={() => setFilterCategoria(c)}
              className="px-2.5 py-1 rounded text-xs font-medium border transition-all"
              style={{
                background: filterCategoria === c ? (CATEGORIA_COLORS[c] ? CATEGORIA_COLORS[c] + '22' : 'var(--bg-surface)') : 'transparent',
                borderColor: filterCategoria === c ? (CATEGORIA_COLORS[c] || 'var(--accent-primary)') : 'var(--border-subtle)',
                color: filterCategoria === c ? (CATEGORIA_COLORS[c] || 'var(--accent-primary)') : 'var(--text-muted)',
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Código</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Nombre</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: 'var(--text-muted)' }}>Categoría</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: 'var(--text-muted)' }}>Marca</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden lg:table-cell" style={{ color: 'var(--text-muted)' }}>Presentación</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden lg:table-cell" style={{ color: 'var(--text-muted)' }}>Peso/u</th>
              {canManage && <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-2"><Skeleton className="h-8 w-full rounded" style={{ background: 'var(--bg-surface)' }} /></td></tr>
              ))
            ) : filtered.map((product, i) => {
              const color = CATEGORIA_COLORS[product.categoria ?? '']
              return (
                <tr
                  key={product.id}
                  style={{
                    background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-surface)',
                    borderBottom: '1px solid var(--border-subtle)',
                    opacity: product.active ? 1 : 0.45,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <td className="px-4 py-3 font-mono text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{product.code}</td>
                  <td className="px-4 py-3 max-w-[200px]" style={{ color: 'var(--text-primary)' }}>
                    <span className="block truncate">{product.name}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {product.categoria && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ color: color || 'var(--text-secondary)', background: color ? color + '18' : 'var(--bg-surface)' }}>
                        {product.categoria}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>{product.marca ?? '—'}</td>
                  <td className="px-4 py-3 text-xs hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>{product.presentacion ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-right hidden lg:table-cell font-mono" style={{ color: 'var(--text-muted)' }}>
                    {product.peso_kg != null ? `${product.peso_kg} kg` : '—'}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => openEdit(product)}
                        className="inline-flex items-center justify-center w-7 h-7 rounded mr-1 hover:bg-white/5"
                        style={{ color: 'var(--text-secondary)' }}
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
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
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={(e) => e.target === e.currentTarget && resetModal()}>
          <div className="w-full max-w-md rounded-xl border p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editing ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button onClick={resetModal} className="p-1 rounded hover:bg-white/10"><X size={16} style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Text fields */}
              {[
                { label: 'Código *', key: 'code', placeholder: 'PT01TULI18LT' },
                { label: 'Nombre *', key: 'name', placeholder: 'OLEINA DE PALMA 18LT' },
                { label: 'Unidad', key: 'unit', placeholder: 'unidad' },
              ].map(({ label, key, placeholder }) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</label>
                  <input
                    value={form[key as keyof typeof form] as string}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full rounded-md px-3 py-2 text-sm border outline-none"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                  />
                </div>
              ))}
              {/* Select fields */}
              {[
                { label: 'Categoría', key: 'categoria', options: CATEGORIAS },
                { label: 'Marca', key: 'marca', options: MARCAS },
                { label: 'Presentación', key: 'presentacion', options: PRESENTACIONES },
              ].map(({ label, key, options }) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</label>
                  <select
                    value={form[key as keyof typeof form] as string}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full rounded-md px-3 py-2 text-sm border outline-none"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                  >
                    <option value="">— Seleccionar —</option>
                    {options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Peso por unidad (kg)</label>
                <input
                  type="number" step="0.01" min="0"
                  value={form.peso_kg}
                  onChange={(e) => setForm((f) => ({ ...f, peso_kg: e.target.value }))}
                  placeholder="18"
                  className="w-full rounded-md px-3 py-2 text-sm border outline-none"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={resetModal} className="flex-1 py-2 rounded-md text-sm border hover:bg-white/5" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}>Cancelar</button>
                <button type="submit" disabled={isPending || !form.code.trim() || !form.name.trim()} className="flex-1 py-2 rounded-md text-sm font-semibold disabled:opacity-50" style={{ background: 'var(--accent-primary)', color: '#fff' }}>
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
