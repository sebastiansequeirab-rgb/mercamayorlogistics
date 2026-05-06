'use client'

export const dynamic = 'force-dynamic'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/hooks/useProfile'
import { NewOrderForm } from '@/components/forms/NewOrderForm'
import toast from 'react-hot-toast'

export default function PedirPage() {
  const router = useRouter()
  const supabase = createClient()
  const { data: profile } = useProfile()

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Sesión cerrada')
    router.push('/login')
  }

  return (
    <div
      className="min-h-screen grid-bg"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 40% at 50% -10%, rgba(37,99,235,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Header */}
      <header
        className="sticky top-0 z-10 border-b flex items-center justify-between px-4 h-14"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
      >
        <span className="text-base font-bold tracking-tight">
          MERCA<span style={{ color: 'var(--accent-primary)' }}>MAYOR</span>
        </span>

        <div className="flex items-center gap-3">
          {profile && (
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Hola, {profile.full_name.split(' ')[0]} 👋
            </span>
          )}
          <button
            onClick={handleLogout}
            className="p-2 rounded-md hover:bg-white/5 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={16} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
      </header>

      {/* Form */}
      <div className="relative max-w-lg mx-auto px-4 py-6 pb-12">
        <div
          className="rounded-xl border p-5"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          <h1 className="text-lg font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>
            🛒 Nuevo Pedido
          </h1>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Completa los datos para registrar el pedido
          </p>

          <NewOrderForm />
        </div>
      </div>
    </div>
  )
}
