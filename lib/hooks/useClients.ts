'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Client, ClientPayload } from '@/lib/types/database'

export function useClients(activeOnly = true) {
  const supabase = createClient()

  return useQuery<Client[]>({
    queryKey: ['clients', activeOnly],
    queryFn: async () => {
      let query = supabase.from('mm_clients').select('*').order('name')
      if (activeOnly) query = query.eq('active', true)
      const { data, error } = await query
      if (error) throw error
      return data as Client[]
    },
    staleTime: 300000,
  })
}

export function useCreateClient() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: ClientPayload) => {
      const { data, error } = await supabase
        .from('mm_clients')
        .insert({
          name: payload.name,
          rif: payload.rif ?? null,
          address: payload.address ?? null,
          phone: payload.phone ?? null,
          active: true,
        })
        .select()
        .single()
      if (error) throw error
      return data as Client
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}

export function useUpdateClient() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ClientPayload }) => {
      const { error } = await supabase
        .from('mm_clients')
        .update({
          name: payload.name,
          rif: payload.rif ?? null,
          address: payload.address ?? null,
          phone: payload.phone ?? null,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}

export function useToggleClient() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('mm_clients').update({ active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}
