export default function CatalogoPage() {
  return (
    <div className="px-4 md:px-6 py-5 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          📦 Catálogo de Productos
        </h1>
      </div>
      <div
        className="rounded-xl border p-8 text-center"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
      >
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Próximamente — Fase 2</p>
      </div>
    </div>
  )
}
