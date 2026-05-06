'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/lib/types/database'

export function useProducts(activeOnly = true) {
  const supabase = createClient()

  return useQuery<Product[]>({
    queryKey: ['products', activeOnly],
    queryFn: async () => {
      let query = supabase.from('mm_products').select('*').order('name')
      if (activeOnly) query = query.eq('active', true)
      const { data, error } = await query
      if (error) throw error
      return data as Product[]
    },
    staleTime: 300000, // Products change rarely
  })
}
