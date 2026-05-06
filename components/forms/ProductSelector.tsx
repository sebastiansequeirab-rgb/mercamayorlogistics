'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { useProducts } from '@/lib/hooks/useProducts'
import type { Product } from '@/lib/types/database'

interface SelectedItem {
  product: Product
  quantity: number
}

interface Props {
  items: SelectedItem[]
  onChange: (items: SelectedItem[]) => void
}

export function ProductSelector({ items, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const { data: products = [], isLoading } = useProducts()

  function addProduct(product: Product) {
    const existing = items.find((i) => i.product.id === product.id)
    if (existing) return
    onChange([...items, { product, quantity: 1 }])
    setOpen(false)
  }

  function removeProduct(productId: string) {
    onChange(items.filter((i) => i.product.id !== productId))
  }

  function updateQuantity(productId: string, qty: number) {
    if (qty < 1) return
    onChange(items.map((i) => i.product.id === productId ? { ...i, quantity: qty } : i))
  }

  const selectedIds = new Set(items.map((i) => i.product.id))

  return (
    <div className="space-y-2">
      {/* Selected products */}
      {items.map(({ product, quantity }) => (
        <div
          key={product.id}
          className="flex items-center gap-2 p-2.5 rounded-md border"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{product.code}</p>
            <p className="text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>{product.name}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => updateQuantity(product.id, quantity - 1)}
              className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold hover:bg-white/10 transition-colors"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
            >
              −
            </button>
            <input
              type="number"
              value={quantity}
              min={1}
              onChange={(e) => updateQuantity(product.id, parseInt(e.target.value) || 1)}
              className="w-12 text-center text-sm font-mono rounded border outline-none"
              style={{
                background: 'var(--bg-primary)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
                padding: '2px 4px',
              }}
            />
            <button
              type="button"
              onClick={() => updateQuantity(product.id, quantity + 1)}
              className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold hover:bg-white/10 transition-colors"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => removeProduct(product.id)}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X size={13} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
      ))}

      {/* Add product popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className="flex items-center justify-between w-full px-3 py-2.5 rounded-md border text-sm transition-colors hover:bg-white/5 cursor-pointer"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <span>+ Agregar producto</span>
          <ChevronsUpDown size={14} />
        </PopoverTrigger>
        <PopoverContent
          className="w-80 p-0"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        >
          <Command style={{ background: 'transparent' }}>
            <CommandInput
              placeholder="Buscar por nombre o código..."
              style={{ color: 'var(--text-primary)' }}
            />
            <CommandList key={products.length}>
              {isLoading ? (
                <div className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  Cargando productos...
                </div>
              ) : (
                <>
                  <CommandEmpty style={{ color: 'var(--text-muted)' }}>
                    No se encontraron productos.
                  </CommandEmpty>
                  <CommandGroup>
                    {products.map((product) => (
                      <CommandItem
                        key={product.id}
                        value={`${product.code} ${product.name}`}
                        onSelect={() => addProduct(product)}
                        className="cursor-pointer"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                            {product.code}
                          </p>
                          <p className="text-sm leading-tight">{product.name}</p>
                        </div>
                        {selectedIds.has(product.id) && (
                          <Check size={14} style={{ color: 'var(--accent-primary)' }} />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
