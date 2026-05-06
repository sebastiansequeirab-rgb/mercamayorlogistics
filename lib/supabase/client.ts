import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = 'https://dbfkrqxvaapoqgcocrnj.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiZmtycXh2YWFwb3FnY29jcm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjQ3NzYsImV4cCI6MjA5MTk0MDc3Nn0.HWYJRyOztVldhPmPHs0yUH-jK5QrwqhABGgEm2Iq6Fc'

export const createClient = () =>
  createBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  )
