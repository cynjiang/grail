import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ExternalLink, Trash2, Undo2 } from 'lucide-react'
import { db, type ShopItem } from '../db'
import { useObjectUrl } from '../utils/useObjectUrl'

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
const grid = 'grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 lg:grid-cols-4'

function Card({ s }: { s: ShopItem }) {
  const src = useObjectUrl(s.image)
  const bought = s.status === 'bought'
  const sub = [s.price != null && money(s.price), s.notes].filter(Boolean).join(' · ')
  return (
    <article className={bought ? 'opacity-50' : ''}>
      <div className="relative aspect-[3/4] overflow-hidden border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900">
        {src ? (
          <img src={src} alt={s.title} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-xs text-neutral-400">no image</div>
        )}
        {s.store && (
          <span className="absolute left-2 top-2 bg-white/90 px-1.5 py-0.5 text-[10px] tracking-wide text-black">
            {s.store}
          </span>
        )}
        <button
          aria-label={bought ? 'move back to wanted' : 'mark as bought'}
          onClick={() => db.shop.update(s.id!, { status: bought ? 'want' : 'bought' })}
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-black"
        >
          {bought ? <Undo2 size={15} /> : <Check size={15} />}
        </button>
      </div>
      <h3 className="mt-2 text-sm leading-snug">{s.title}</h3>
      {sub && <p className="text-xs text-neutral-500">{sub}</p>}
      <div className="mt-1 flex items-center gap-3 text-xs">
        {s.url && (
          <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2">
            <ExternalLink size={12} /> buy
          </a>
        )}
        <button
          aria-label="delete item"
          onClick={() => confirm(`delete "${s.title}"? can’t undo that.`) && db.shop.delete(s.id!)}
          className="text-neutral-400"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </article>
  )
}

export default function Shopping() {
  const items = useLiveQuery(() => db.shop.orderBy('createdAt').reverse().toArray(), []) ?? []
  const want = items.filter((i) => i.status === 'want')
  const done = items.filter((i) => i.status === 'bought')
  const total = want.reduce((n, i) => n + (i.price ?? 0), 0)
  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <p className="mb-5 text-xs text-neutral-500">
        {want.length} to buy{total > 0 && ` · ${money(total)}`}
      </p>
      {items.length === 0 && (
        <p className="py-24 text-center text-sm text-neutral-500">nothing here yet. tap + to add your first thing.</p>
      )}
      <div className={grid}>{want.map((s) => <Card key={s.id} s={s} />)}</div>
      {done.length > 0 && (
        <details className="mt-10">
          <summary className="cursor-pointer text-sm text-neutral-500">bought ({done.length})</summary>
          <div className={`${grid} mt-4`}>{done.map((s) => <Card key={s.id} s={s} />)}</div>
        </details>
      )}
    </section>
  )
}
