import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { X } from 'lucide-react'
import { db, type InspoItem } from '../db'
import { parseTags } from '../utils/urlCleaner'
import { useObjectUrl } from '../utils/useObjectUrl'

function Tile({ p, onOpen }: { p: InspoItem; onOpen: () => void }) {
  const src = useObjectUrl(p.image)
  return (
    <button onClick={onOpen} className="mb-2 block w-full break-inside-avoid overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-900">
      {src && <img src={src} alt={p.tags.join(', ') || 'inspo'} className="w-full" loading="lazy" />}
    </button>
  )
}

function Lightbox({ p, onClose }: { p: InspoItem; onClose: () => void }) {
  const src = useObjectUrl(p.image)
  const [t, setT] = useState(p.tags.join(', '))
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4" onClick={onClose}>
      <button aria-label="close" className="self-end p-1 text-white" onClick={onClose}>
        <X />
      </button>
      {src && <img src={src} alt="" className="mx-auto min-h-0 flex-1 object-contain" onClick={(e) => e.stopPropagation()} />}
      <div className="mx-auto mt-3 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
        <input
          value={t}
          onChange={(e) => setT(e.target.value)}
          onBlur={() => db.inspo.update(p.id!, { tags: parseTags(t) })}
          placeholder="tags, comma separated"
          aria-label="tags"
          className="w-full border-b border-neutral-600 bg-transparent py-2 text-sm text-white outline-none"
        />
        <div className="flex justify-between text-sm text-white">
          {p.sourceUrl ? (
            <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              source
            </a>
          ) : (
            <span />
          )}
          <button
            onClick={async () => {
              if (confirm('delete this one? can’t undo that.')) {
                await db.inspo.delete(p.id!)
                onClose()
              }
            }}
          >
            delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Inspo() {
  const all = useLiveQuery(() => db.inspo.orderBy('createdAt').reverse().toArray(), []) ?? []
  const [tag, setTag] = useState('')
  const [openId, setOpenId] = useState<number>()
  const tags = [...new Set(all.flatMap((i) => i.tags))].sort()
  const active = tags.includes(tag) ? tag : ''
  const shown = active ? all.filter((i) => i.tags.includes(active)) : all
  const open = all.find((i) => i.id === openId)
  const pill = (on: boolean) =>
    `shrink-0 border px-3 py-1 text-xs ${on ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black' : 'border-neutral-300 dark:border-neutral-700'}`
  return (
    <section>
      <div className="sticky top-14 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-black/90">
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2">
          <button className={pill(!active)} onClick={() => setTag('')}>all</button>
          {tags.map((t) => (
            <button key={t} className={pill(active === t)} onClick={() => setTag(t)}>{t}</button>
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-2 py-3">
        {all.length === 0 && (
          <p className="py-24 text-center text-sm text-neutral-500">save outfit and thrift refs here. tap + to add one.</p>
        )}
        <div className="columns-2 gap-2 md:columns-3 lg:columns-4">
          {shown.map((p) => <Tile key={p.id} p={p} onOpen={() => setOpenId(p.id)} />)}
        </div>
      </div>
      {open && <Lightbox key={open.id} p={open} onClose={() => setOpenId(undefined)} />}
    </section>
  )
}
