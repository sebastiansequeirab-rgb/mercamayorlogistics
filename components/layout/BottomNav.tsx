'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Truck, ClipboardList, Package } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/consolidar', label: 'Envío', icon: Truck },
  { href: '/historial', label: 'Historial', icon: ClipboardList },
  { href: '/catalogo', label: 'Catálogo', icon: Package },
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
