'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Truck, BusFront, ClipboardList, Package, Users } from 'lucide-react'

const navItems = [
  { href: '/tracking',   label: 'Tracking',   icon: LayoutDashboard },
  { href: '/consolidar', label: 'Consolidar', icon: Truck },
  { href: '/camiones',   label: 'Camiones',   icon: BusFront },
  { href: '/historial',  label: 'Historial',  icon: ClipboardList },
  { href: '/catalogo',   label: 'Catálogo',   icon: Package },
  { href: '/clientes',   label: 'Clientes',   icon: Users },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 border-t flex z-40"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
    >
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors"
            style={{ color: active ? 'var(--accent-primary)' : 'var(--text-muted)' }}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
