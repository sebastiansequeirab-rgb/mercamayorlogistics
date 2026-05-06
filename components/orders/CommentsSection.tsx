'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAddComment } from '@/lib/hooks/useOrders'
import type { OrderComment } from '@/lib/types/database'
import toast from 'react-hot-toast'

interface Props {
  orderId: string
  comments: OrderComment[]
}

export function CommentsSection({ orderId, comments }: Props) {
  const [text, setText] = useState('')
  const addComment = useAddComment()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    try {
      await addComment.mutateAsync({ orderId, content: text.trim() })
      setText('')
    } catch {
      toast.error('Error al enviar comentario')
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>
        Comentarios
      </p>

      {/* Comment list */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sin comentarios aún.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="rounded-md p-2.5" style={{ background: 'var(--bg-surface)' }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  {c.author?.full_name ?? 'Usuario'}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {format(new Date(c.created_at), 'd MMM, HH:mm', { locale: es })}
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {c.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Add comment */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe un comentario..."
          className="flex-1 rounded-md px-3 py-2 text-sm border outline-none"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          type="submit"
          disabled={!text.trim() || addComment.isPending}
          className="px-3 py-2 rounded-md transition-colors disabled:opacity-40"
          style={{ background: 'var(--accent-primary)', color: '#fff' }}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  )
}
