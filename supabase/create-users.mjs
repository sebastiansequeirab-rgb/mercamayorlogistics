import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://dbfkrqxvaapoqgcocrnj.supabase.co'
const SERVICE_ROLE_KEY = process.argv[2]

if (!SERVICE_ROLE_KEY) {
  console.error('Uso: node supabase/create-users.mjs <service_role_key>')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const users = [
  { email: 'sebastiansequeirab@gmail.com',   password: 'Mercamayor2024!', full_name: 'Sebastián', role: 'admin' },
  { email: 'rsequeira@mercamayor.net',        password: 'Mercamayor2024!', full_name: 'Rogelio',   role: 'admin' },
  { email: 'administracion05@mercamayor.net', password: 'Mercamayor2024!', full_name: 'Analés',    role: 'gestora' },
  { email: 'janetmercamayor@gmail.com',       password: 'Mercamayor2024!', full_name: 'Janet',     role: 'vendedor' },
]

for (const u of users) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { full_name: u.full_name, role: u.role },
  })

  if (error) {
    console.error(`❌ ${u.email}: ${error.message}`)
  } else {
    console.log(`✅ ${u.full_name} (${u.role}) — ${u.email}`)
  }
}
