'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
    staleTime: 300000,
  })
}

export function useToggleProduct() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('mm_products').update({ active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useCreateProduct() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ code, name, unit }: { code: string; name: string; unit: string }) => {
      const { error } = await supabase.from('mm_products').insert({ code, name, unit, active: true })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
