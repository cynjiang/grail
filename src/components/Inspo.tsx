import { useCallback, useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ExternalLink, ImagePlus, Trash2, X } from 'lucide-react'
import { db, type InspoItem } from '../db'
import { cleanUrl, parseTags } from '../utils/urlCleaner'
import { useObjectUrl } from '../utils/useObjectUrl'

function Tile({ p, onOpen }: { p: InspoItem; onOpen: () => void }) {
  const src = useObjectUrl(p.image)
  const [loaded, setLoaded] = useState(false)

  return (
    <button
      onClick={onOpen}
      className="group block w-full overflow-hidden rounded-2xl bg-stone-200/60 transition active:scale-[0.98] dark:bg-white/[0.05]"
    >
      {src && (
        <img
          src={src}
          alt={p.tags.join(', ') || 'inspo'}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={`w-full transition duration-500 group-hover:scale-[1.03] ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </button>
  )
}

function Lightbox({
  p,
  onClose,
  onToast,
}: {
  p: InspoItem
  onClose: () => void
  onToast: (msg: string) => void
}) {
  const src = useObjectUrl(p.image)
  const [tags, setTags] = useState(p.tags.join(', '))
  const [sourceUrl, setSourceUrl] = useState(p.sourceUrl ?? '')
  const [confirmDel, setConfirmDel] = useState(false)
  const [closing, setClosing] = useState(false)
  const backdropDown = useRef(false)

  const requestClose = useCallback(() => {
    if (closing) return
    setClosing(true)
    window.setTimeout(onClose, 180)
  }, [closing, onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [requestClose])

  const saveMeta = () => {
    db.inspo.update(p.id!, {
      tags: parseTags(tags),
      sourceUrl: sourceUrl.trim() ? cleanUrl(sourceUrl) : undefined,
    })
  }

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
        className={`flex max-h-[92vh] w-full max-w-md flex-col items-center gap-3 ${
          closing ? 'animate-sheet-down' : 'animate-sheet-up'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex w-full items-center justify-between">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20">
            <ImagePlus size={14} /> swap photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (f) {
                  await db.inspo.update(p.id!, { image: f })
                  onToast('photo updated')
                }
              }}
            />
          </label>
          <button
            aria-label="close"
            onClick={requestClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X size={18} />
          </button>
        </div>

        {src && (
          <img
            src={src}
            alt=""
            className="max-h-[58vh] w-auto max-w-full rounded-2xl object-contain"
          />
        )}

        <div className="w-full space-y-2.5 rounded-2xl bg-white/10 p-3.5 backdrop-blur-md">
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            onBlur={saveMeta}
            placeholder="tags, comma separated"
            aria-label="tags"
            className="w-full rounded-xl bg-black/30 px-3 py-2 text-xs text-white placeholder:text-white/40 outline-none focus:ring-1 focus:ring-white/30"
          />
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            onBlur={saveMeta}
            placeholder="source link"
            aria-label="source link"
            className="w-full rounded-xl bg-black/30 px-3 py-2 text-xs text-white placeholder:text-white/40 outline-none focus:ring-1 focus:ring-white/30"
          />

          <div className="flex items-center justify-between pt-1 text-xs text-white">
            {sourceUrl.trim() ? (
              <a
                href={cleanUrl(sourceUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-white/90 hover:text-white"
              >
                open source <ExternalLink size={12} />
              </a>
            ) : (
              <span />
            )}
            <button
              aria-label={confirmDel ? 'confirm delete' : 'delete'}
              onClick={async () => {
                if (!confirmDel) {
                  setConfirmDel(true)
                  return
                }
                await db.inspo.delete(p.id!)
                onToast('deleted')
                requestClose()
              }}
              onBlur={() => setConfirmDel(false)}
              className={`inline-flex items-center justify-center rounded-full px-2.5 py-1.5 font-medium transition-colors duration-200 active:scale-95 ${
                confirmDel
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Trash2 size={14} className="shrink-0" />
              <span
                className={`grid transition-[grid-template-columns,opacity,margin] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  confirmDel
                    ? 'ml-1.5 grid-cols-[1fr] opacity-100'
                    : 'ml-0 grid-cols-[0fr] opacity-0'
                }`}
              >
                <span className="overflow-hidden whitespace-nowrap">confirm</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function useColCount() {
  const get = () => (window.innerWidth >= 1024 ? 4 : window.innerWidth >= 768 ? 3 : 2)
  const [cols, setCols] = useState(get)
  useEffect(() => {
    const onResize = () => setCols(get())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return cols
}

export default function Inspo({ onToast }: { onToast: (msg: string) => void }) {
  const all = useLiveQuery(() => db.inspo.orderBy('createdAt').reverse().toArray(), []) ?? []
  const [tag, setTag] = useState('')
  const [openId, setOpenId] = useState<number>()
  const cols = useColCount()
  const tags = [...new Set(all.flatMap((i) => i.tags))].sort()
  const active = tags.includes(tag) ? tag : ''
  const shown = active ? all.filter((i) => i.tags.includes(active)) : all
  const open = all.find((i) => i.id === openId)

  const pill = (on: boolean) =>
    `shrink-0 rounded-full px-3.5 py-1 text-xs font-medium transition active:scale-95 ${
      on
        ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950'
        : 'bg-stone-200/70 text-stone-600 hover:bg-stone-200 dark:bg-white/[0.07] dark:text-stone-300 dark:hover:bg-white/15'
    }`

  return (
    <>
      <section className="animate-fade-up">
        {tags.length > 0 && (
          <div className="sticky top-14 z-20 border-b border-stone-200/70 bg-[#FAF9F7]/85 backdrop-blur-md dark:border-white/10 dark:bg-[#0E0E10]/85">
            <div className="no-scrollbar mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2.5">
              <button className={pill(!active)} onClick={() => setTag('')}>
                all
              </button>
              {tags.map((t) => (
                <button key={t} className={pill(active === t)} onClick={() => setTag(t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mx-auto max-w-6xl px-3 py-4">
          {all.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-28 text-center">
              <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-stone-200/70 text-stone-500 dark:bg-white/[0.06] dark:text-stone-400">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                  <path d="M12 1.2C12.95 7.5 16.5 11.05 22.8 12C16.5 12.95 12.95 16.5 12 22.8C11.05 16.5 7.5 12.95 1.2 12C7.5 11.05 11.05 7.5 12 1.2Z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-stone-800 dark:text-stone-200">your thrift & outfit board</p>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">tap the star to save inspo photos</p>
            </div>
          ) : (
            <div className="flex items-start gap-2.5">
              {Array.from({ length: cols }, (_, col) => (
                <div key={col} className="flex min-w-0 flex-1 flex-col gap-2.5">
                  {shown
                    .filter((_, i) => i % cols === col)
                    .map((p) => (
                      <Tile key={p.id} p={p} onOpen={() => setOpenId(p.id)} />
                    ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {open && <Lightbox key={open.id} p={open} onClose={() => setOpenId(undefined)} onToast={onToast} />}
    </>
  )
}