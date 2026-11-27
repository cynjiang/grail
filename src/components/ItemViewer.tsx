import { useCallback, useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ChevronLeft, ChevronRight, ExternalLink, Pencil, Undo2, X } from 'lucide-react'
import { db, type WishlistItem } from '../db'
import { fmtDateTime, money } from '../utils/format'
import { useObjectUrl } from '../utils/useObjectUrl'

const glass =
  'grid place-items-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur-md transition hover:bg-black/75 active:scale-95'

export default function ItemViewer({
  id,
  onClose,
  onEdit,
}: {
  id: number
  onClose: () => void
  onEdit: (item: WishlistItem) => void
}) {
  const res = useLiveQuery(async () => ({ item: await db.wishlist.get(id) }), [id])
  const item = res?.item
  const [i, setI] = useState(0)
  const [closing, setClosing] = useState(false)
  const startX = useRef<number | null>(null)
  const backdropDown = useRef(false)

  const photos = item?.images ?? []
  const n = photos.length
  const idx = n ? Math.min(i, n - 1) : 0
  const src = useObjectUrl(photos[idx])

  const go = useCallback((d: number) => setI((x) => (n ? (x + d + n) % n : 0)), [n])
  const requestClose = useCallback(() => {
    if (closing) return
    setClosing(true)
    window.setTimeout(onClose, 180)
  }, [closing, onClose])

  useEffect(() => {
    if (res && !res.item) onClose() // deleted while open
  }, [res, onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose()
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [requestClose, go])

  if (!item) return null
  const bought = item.status === 'bought'

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md ${
        closing ? 'animate-fade-out' : 'animate-fade-in'
      }`}
      onPointerDown={(e) => {
        backdropDown.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (backdropDown.current && e.target === e.currentTarget) requestClose()
        backdropDown.current = false
      }}
    >
      <div
        className={`flex max-h-[94vh] w-full max-w-md flex-col items-center gap-3 ${
          closing ? 'animate-sheet-down' : 'animate-sheet-up'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex w-full items-center justify-between">
          <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium tabular-nums text-white">
            {n > 0 ? `${idx + 1} / ${n}` : 'no photos'}
          </span>
          <button aria-label="close" onClick={requestClose} className={`h-9 w-9 ${glass}`}>
            <X size={18} />
          </button>
        </div>

        {n > 0 && (
          <div
            className="relative flex w-full justify-center"
            onTouchStart={(e) => {
              startX.current = e.touches[0].clientX
            }}
            onTouchEnd={(e) => {
              if (startX.current == null) return
              const dx = e.changedTouches[0].clientX - startX.current
              startX.current = null
              if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
            }}
          >
            {src && (
              <img
                key={idx}
                src={src}
                alt={item.title || item.store || 'item'}
                className="animate-fade-in max-h-[56vh] w-auto max-w-full select-none rounded-2xl object-contain"
                draggable={false}
              />
            )}
            {n > 1 && (
              <>
                <button aria-label="previous photo" onClick={() => go(-1)} className={`absolute left-2 top-1/2 h-10 w-10 -translate-y-1/2 ${glass}`}>
                  <ChevronLeft size={20} />
                </button>
                <button aria-label="next photo" onClick={() => go(1)} className={`absolute right-2 top-1/2 h-10 w-10 -translate-y-1/2 ${glass}`}>
                  <ChevronRight size={20} />
                </button>
              </>
            )}
          </div>
        )}

        {n > 1 && (
          <div className="flex w-full max-w-xs items-center justify-center gap-1.5 px-2">
            {photos.map((_, k) => (
              <button
                key={k}
                onClick={() => setI(k)}
                aria-label={`show photo ${k + 1}`}
                className={`h-1 rounded-full transition-all duration-300 ${
                  k === idx ? 'w-7 bg-white' : 'w-3 bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}

        <div className="w-full space-y-3 rounded-2xl bg-white/10 p-3.5 text-white backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {item.store && (
                <span className="mb-1.5 inline-block rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-medium tracking-wide">
                  {item.store}
                </span>
              )}
              {item.title && <h2 className="text-sm font-medium leading-snug">{item.title}</h2>}
              {item.notes && <p className="mt-0.5 text-xs text-white/60">{item.notes}</p>}
            </div>
            {item.price != null && <span className="shrink-0 text-sm font-medium tabular-nums">{money(item.price)}</span>}
          </div>
          <p className="text-[11px] text-white/45">added {fmtDateTime(item.createdAt)}</p>
          <div className="flex items-center gap-2">
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-stone-900 transition hover:bg-stone-200"
              >
                buy <ExternalLink size={12} />
              </a>
            )}
            <span className="flex-1" />
            <button
              onClick={() => db.wishlist.update(item.id!, { status: bought ? 'want' : 'bought' })}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-medium transition hover:bg-white/25"
            >
              {bought ? <Undo2 size={12} /> : <Check size={12} />}
              {bought ? 'move back' : 'bought'}
            </button>
            <button
              onClick={() => onEdit(item)}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-medium transition hover:bg-white/25"
            >
              <Pencil size={12} /> edit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}