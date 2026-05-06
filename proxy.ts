import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Public routes
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    if (user) {
      // Fetch role to redirect appropriately
      const { data: profile } = await supabase
        .from('mm_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const role = profile?.role
      const dest = role === 'vendedor' ? '/pedir' : '/dashboard'
      return NextResponse.redirect(new URL(dest, request.url))
    }
    return supabaseResponse
  }

  // Unauthenticated → login
  if (!user) {
    const url = new URL('/login', request.url)
    return NextResponse.redirect(url)
  }

  // Fetch role for authorization
  const { data: profile } = await supabase
    .from('mm_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role

  // Vendors can only access /pedir and /historial (their own)
  if (role === 'vendedor') {
    if (!pathname.startsWith('/pedir') && !pathname.startsWith('/historial')) {
      return NextResponse.redirect(new URL('/pedir', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/public).*)',
  ],
}
