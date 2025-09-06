type Props = {
  address: string
  title?: string
  onChange: (value: string) => void
  onSubmit: () => void
  onBack: () => void
  onForward: () => void
  onReload: () => void
}

export default function AddressBar({ address, title, onChange, onSubmit, onBack, onForward, onReload }: Props) {
  return (
    <div className="h-12 w-full border-b border-neutral-800 flex items-center gap-2 px-2 bg-neutral-900">
      <button className="px-2 py-1 rounded hover:bg-neutral-800" onClick={onBack} title="Back">⟵</button>
      <button className="px-2 py-1 rounded hover:bg-neutral-800" onClick={onForward} title="Forward">⟶</button>
      <button className="px-2 py-1 rounded hover:bg-neutral-800" onClick={onReload} title="Reload">⟲</button>
      <input
        className="flex-1 bg-neutral-800 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
        value={address}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSubmit() }}
        placeholder="Tape une URL ou une recherche…"
      />
      <button className="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500" onClick={onSubmit}>Aller</button>
      {title && <div className="ml-2 text-sm text-neutral-400 truncate" title={title}>{title}</div>}
    </div>
  )
}

