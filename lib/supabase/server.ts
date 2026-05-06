import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createClient = async () => {
  const cookieStore = await cookies()

  return createServerClient(
    'https://dbfkrqxvaapoqgcocrnj.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiZmtycXh2YWFwb3FnY29jcm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjQ3NzYsImV4cCI6MjA5MTk0MDc3Nn0.HWYJRyOztVldhPmPHs0yUH-jK5QrwqhABGgEm2Iq6Fc',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — cookie setting handled by middleware
          }
        },
      },
    }
  )
}
