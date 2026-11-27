import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ExternalLink, Images, LayoutGrid, List, Pencil, ShoppingBag, Undo2 } from 'lucide-react'
import { db, type WishlistItem } from '../db'
import { money } from '../utils/format'
import { useObjectUrl } from '../utils/useObjectUrl'

type View = 'grid' | 'list'

// buttons sitting ON photos: dark glass + white icon so they read on light AND dark pictures, in either theme
const onPhoto =
  'border border-white/20 bg-black/55 text-white shadow-sm backdrop-blur-md transition duration-200 hover:bg-black/75 active:scale-95'

// buttons sitting on the page / list-row surface
const glowSurface =
  'border border-stone-200/80 bg-white/90 text-stone-900 shadow-sm backdrop-blur-md transition duration-200 hover:bg-white active:scale-95 dark:border-white/15 dark:bg-white/15 dark:text-white dark:shadow-[0_0_14px_rgba(255,255,255,0.14)] dark:hover:bg-white/25'

const photoBtn = `grid h-8 w-8 place-items-center rounded-full ${onPhoto}`
const rowBtn = `grid h-8 w-8 place-items-center rounded-full ${glowSurface}`

const brandPill =
  'inline-block rounded-full border border-stone-200/70 bg-stone-100/90 px-2.5 py-0.5 text-[10px] font-medium tracking-wide text-stone-800 backdrop-blur-md dark:border-white/10 dark:bg-white/15 dark:text-stone-100'
const brandPillOnPhoto =
  'inline-block max-w-[60%] truncate rounded-full border border-white/20 bg-black/55 px-2.5 py-0.5 text-[10px] font-medium tracking-wide text-white backdrop-blur-md'

interface CardProps {
  s: WishlistItem
  onOpen: () => void
  onEdit: () => void
}

function GridCard({ s, onOpen, onEdit }: CardProps) {
  const src = useObjectUrl(s.images[0])
  const [loaded, setLoaded] = useState(false)
  const bought = s.status === 'bought'
  const heading = s.title || ''
  const count = s.images.length

  return (
    <article data-ts={s.createdAt} className={`group flex flex-col transition-opacity duration-200 ${bought ? 'opacity-55' : ''}`}>
      <div
        onClick={onOpen}
        className="relative aspect-[3/4] cursor-pointer overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-100 shadow-2xs transition-[border-color,box-shadow] duration-200 hover:border-stone-300 hover:shadow-md dark:border-white/10 dark:bg-[#17171A] dark:hover:border-white/25"
      >
        {src ? (
          <img
            src={src}
            alt={s.title || s.store || 'item'}
            onLoad={() => setLoaded(true)}
            className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : (
          <div className="grid h-full place-items-center text-stone-400 dark:text-stone-600">
            <ShoppingBag size={24} strokeWidth={1.5} />
          </div>
        )}

        {s.store && <span className={`absolute left-2.5 top-2.5 ${brandPillOnPhoto}`}>{s.store}</span>}

        <div className="absolute right-2.5 top-2.5 flex gap-1.5">
          <button
            aria-label="edit"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className={photoBtn}
          >
            <Pencil size={13} />
          </button>
          <button
            aria-label={bought ? 'move back to wishlist' : 'mark as bought'}
            onClick={(e) => {
              e.stopPropagation()
              db.wishlist.update(s.id!, { status: bought ? 'want' : 'bought' })
            }}
            className={photoBtn}
          >
            {bought ? <Undo2 size={14} /> : <Check size={14} />}
          </button>
        </div>

        {count > 1 && (
          <span className={`absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${onPhoto}`}>
            <Images size={11} /> {count}
          </span>
        )}

        {s.url && (
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label="open brand link"
            className={`absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${onPhoto}`}
          >
            buy <ExternalLink size={11} />
          </a>
        )}
      </div>

      {(heading || s.notes || s.price != null) && (
        <div className="mt-2.5 flex items-start justify-between gap-2 px-0.5">
          <button onClick={onOpen} className="min-w-0 flex-1 text-left">
            {heading && (
              <h3 className="truncate text-[13px] font-medium leading-snug text-stone-900 dark:text-stone-100">{heading}</h3>
            )}
            {s.notes && <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">{s.notes}</p>}
          </button>
          {s.price != null && (
            <span className="shrink-0 text-[13px] font-medium tabular-nums text-stone-800 dark:text-stone-200">
              {money(s.price)}
            </span>
          )}
        </div>
      )}
    </article>
  )
}

function ListRow({ s, onOpen, onEdit }: CardProps) {
  const src = useObjectUrl(s.images[0])
  const [loaded, setLoaded] = useState(false)
  const bought = s.status === 'bought'
  const count = s.images.length

  return (
    <article
      data-ts={s.createdAt}
      onClick={onOpen}
      className={`group flex cursor-pointer items-center gap-3.5 rounded-2xl border border-stone-200/80 bg-white p-2.5 shadow-2xs transition-[border-color,box-shadow,opacity] duration-200 hover:border-stone-300 hover:shadow-md dark:border-white/10 dark:bg-[#17171A] dark:hover:border-white/25 ${
        bought ? 'opacity-55' : ''
      }`}
    >
      <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-white/5">
        {src ? (
          <img
            src={src}
            alt={s.title || s.store || 'item'}
            onLoad={() => setLoaded(true)}
            className={`h-full w-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : (
          <div className="grid h-full place-items-center text-stone-400">
            <ShoppingBag size={18} strokeWidth={1.5} />
          </div>
        )}
        {count > 1 && (
          <span className="absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">
            <Images size={9} /> {count}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 text-left">
        {s.store && <span className={`mb-1 ${brandPill}`}>{s.store}</span>}
        {s.title && <h3 className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">{s.title}</h3>}
        {s.notes && <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">{s.notes}</p>}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2 pr-1">
        {s.price != null && (
          <span className="text-sm font-medium tabular-nums text-stone-900 dark:text-stone-100">{money(s.price)}</span>
        )}
        <div className="flex items-center gap-1.5">
          {s.url && (
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="buy"
              onClick={(e) => e.stopPropagation()}
              className={rowBtn}
            >
              <ExternalLink size={14} />
            </a>
          )}
          <button
            aria-label="edit"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className={rowBtn}
          >
            <Pencil size={13} />
          </button>
          <button
            aria-label={bought ? 'move back to wishlist' : 'mark as bought'}
            onClick={(e) => {
              e.stopPropagation()
              db.wishlist.update(s.id!, { status: bought ? 'want' : 'bought' })
            }}
            className={rowBtn}
          >
            {bought ? <Undo2 size={14} /> : <Check size={14} />}
          </button>
        </div>
      </div>
    </article>
  )
}

export default function Wishlist({
  onOpen,
  onEdit,
}: {
  onOpen: (item: WishlistItem) => void
  onEdit: (item: WishlistItem) => void
}) {
  const items = useLiveQuery(() => db.wishlist.orderBy('createdAt').reverse().toArray(), []) ?? []
  const [view, setView] = useState<View>(() => (localStorage.getItem('starinspo-view') as View) || 'grid')

  const setAndSaveView = (v: View) => {
    setView(v)
    localStorage.setItem('starinspo-view', v)
  }

  const want = items.filter((i) => i.status === 'want')
  const done = items.filter((i) => i.status === 'bought')
  const total = want.reduce((n, i) => n + (i.price ?? 0), 0)

  const renderItems = (list: WishlistItem[]) =>
    view === 'grid' ? (
      <div key="grid" className="animate-fade-up grid grid-cols-2 gap-x-3.5 gap-y-6 md:grid-cols-3 lg:grid-cols-4">
        {list.map((s) => (
          <GridCard key={s.id} s={s} onOpen={() => onOpen(s)} onEdit={() => onEdit(s)} />
        ))}
      </div>
    ) : (
      <div key="list" className="animate-fade-up space-y-2.5">
        {list.map((s) => (
          <ListRow key={s.id} s={s} onOpen={() => onOpen(s)} onEdit={() => onEdit(s)} />
        ))}
      </div>
    )

  const seg = (v: View, label: string, icon: React.ReactNode) => (
    <button
      aria-label={label}
      onClick={() => setAndSaveView(v)}
      className={`relative z-10 grid h-6 w-8 place-items-center rounded-full transition-colors duration-200 ${
        view === v
          ? 'text-stone-900 dark:text-white'
          : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
      }`}
    >
      {icon}
    </button>
  )

  return (
    <section className="animate-fade-up mx-auto max-w-6xl px-4 py-5">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs font-medium text-stone-500 tabular-nums dark:text-stone-400">
          {want.length} {want.length === 1 ? 'item' : 'items'}
          {total > 0 && ` · ${money(total)}`}
        </p>

        <div className="relative grid grid-cols-2 rounded-full bg-stone-200/75 p-1 dark:bg-white/[0.07]">
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-white shadow-sm ring-1 ring-transparent transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] dark:bg-white/25 dark:ring-white/15 ${
              view === 'list' ? 'translate-x-full' : 'translate-x-0'
            }`}
          />
          {seg('grid', 'grid view', <LayoutGrid size={14} />)}
          {seg('list', 'list view', <List size={14} />)}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-stone-200/70 text-stone-500 dark:bg-white/[0.06] dark:text-stone-400">
            <ShoppingBag size={20} strokeWidth={1.6} />
          </div>
          <p className="text-sm font-medium text-stone-800 dark:text-stone-200">nothing on your wishlist yet</p>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">tap the star to paste a link or drop a photo</p>
        </div>
      ) : (
        <>
          {renderItems(want)}
          {done.length > 0 && (
            <details className="mt-10 group">
              <summary className="cursor-pointer list-none text-xs font-medium text-stone-500 transition hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200">
                purchased ({done.length})
              </summary>
              <div className="mt-4">{renderItems(done)}</div>
            </details>
          )}
        </>
      )}
    </section>
  )
}