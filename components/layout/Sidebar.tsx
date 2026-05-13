'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Truck, BusFront, ClipboardList, Package, LogOut, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/hooks/useProfile'
import toast from 'react-hot-toast'

const navItems = [
  { href: '/tracking',   label: 'Tracking',   icon: LayoutDashboard },
  { href: '/consolidar', label: 'Consolidar', icon: Truck },
  { href: '/camiones',   label: 'Camiones',   icon: BusFront },
  { href: '/historial',  label: 'Historial',  icon: ClipboardList },
  { href: '/catalogo',   label: 'Catálogo',   icon: Package },
  { href: '/clientes',   label: 'Clientes',   icon: Users },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { data: profile } = useProfile()

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Sesión cerrada')
    router.push('/login')
  }

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen border-r"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          MERCA<span style={{ color: 'var(--accent-primary)' }}>MAYOR</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors"
              style={{
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: active ? 'var(--bg-surface)' : 'transparent',
              }}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 1.5} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t space-y-0.5" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="px-3 py-2">
          <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            {profile?.full_name}
          </p>
          <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
            {profile?.role}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm w-full transition-colors hover:bg-white/5"
          style={{ color: 'var(--text-secondary)' }}
        >
          <LogOut size={16} strokeWidth={1.5} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
