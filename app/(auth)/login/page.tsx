'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error('Credenciales incorrectas')
      setLoading(false)
      return
    }

    // Fetch role to redirect properly
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'vendedor') {
      router.push('/pedir')
    } else {
      router.push('/dashboard')
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      toast.error('Ingresa tu correo primero')
      return
    }
    await supabase.auth.resetPasswordForEmail(email)
    setResetSent(true)
    toast.success('Revisa tu correo para resetear la contraseña')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 grid-bg"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(37,99,235,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            MERCA<span style={{ color: 'var(--accent-primary)' }}>MAYOR</span>
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>
            Sistema de Gestión de Pedidos
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-xl border p-6 space-y-5"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@mercamayor.com"
                required
                className="w-full rounded-md px-3 py-2.5 text-sm border outline-none transition-colors"
                style={{
                  background: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-md px-3 py-2.5 text-sm border outline-none transition-colors"
                style={{
                  background: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-md text-sm font-semibold transition-all disabled:opacity-50 mt-1"
              style={{ background: 'var(--accent-primary)', color: '#fff' }}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs transition-colors hover:underline"
              style={{ color: 'var(--text-muted)' }}
            >
              {resetSent ? 'Correo enviado ✓' : 'Olvidé mi contraseña'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
          Valencia → Caracas
        </p>
      </div>
    </div>
  )
}
