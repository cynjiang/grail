import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ImagePlus, Link2, Loader2, Plus, Trash2, X } from 'lucide-react'
import { db, type WishlistItem } from '../db'
import { cleanUrl, slugTitle, storeName } from '../utils/urlCleaner'
import { useObjectUrl } from '../utils/useObjectUrl'

type Mode = 'wishlist' | 'inspo'

const field =
  'w-full rounded-xl bg-stone-100/90 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-stone-900/20 dark:bg-white/[0.06] dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:bg-white/[0.09] dark:focus:ring-white/25'

const IMG_URL = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i

interface Props {
  initial: Mode
  editing?: WishlistItem
  initialBlob?: Blob
  initialUrl?: string
  onClose: () => void
  onToast: (msg: string) => void
}

function Thumb({ blob, cover, onPick, onRemove }: { blob: Blob; cover: boolean; onPick: () => void; onRemove: () => void }) {
  const src = useObjectUrl(blob)
  return (
    <div className="relative h-14 w-12 shrink-0">
      <button
        onClick={onPick}
        aria-label={cover ? 'cover photo' : 'make cover photo'}
        className={`h-full w-full overflow-hidden rounded-lg ring-2 transition ${
          cover ? 'ring-stone-900 dark:ring-white' : 'ring-transparent opacity-70 hover:opacity-100'
        }`}
      >
        {src && <img src={src} alt="" className="h-full w-full object-cover" />}
      </button>
      <button
        aria-label="remove photo"
        onClick={onRemove}
        className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-stone-900 text-white dark:bg-white dark:text-stone-950"
      >
        <X size={10} />
      </button>
    </div>
  )
}

export default function QuickAdd({ initial, editing, initialBlob, initialUrl, onClose, onToast }: Props) {
  const isEdit = !!editing
  const [mode, setMode] = useState<Mode>(editing ? 'wishlist' : initial)
  const [url, setUrl] = useState(editing?.url ?? initialUrl ?? '')
  const [images, setImages] = useState<Blob[]>(editing?.images ?? (initialBlob ? [initialBlob] : []))
  const [title, setTitle] = useState(editing?.title ?? '')
  const [price, setPrice] = useState(editing?.price != null ? String(editing.price) : '')
  const [store, setStore] = useState(editing?.store ?? '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [tags, setTags] = useState<string[]>([])
  const [addingTag, setAddingTag] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [busy, setBusy] = useState(false)
  const [miss, setMiss] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [closing, setClosing] = useState(false)
  const backdropDown = useRef(false)
  const last = useRef(editing?.url ?? '')
  const cover = useObjectUrl(images[0])

  const existingTags =
    useLiveQuery(
      async () => [...new Set((await db.inspo.toArray()).flatMap((i) => i.tags))].sort(),
      [],
    ) ?? []

  const allTags = [...new Set([...existingTags, ...tags])].sort()

  const requestClose = useCallback(() => {
    if (closing) return
    setClosing(true)
    window.setTimeout(onClose, 190)
  }, [closing, onClose])

  const addImages = useCallback((fs: Blob[]) => {
    if (!fs.length) return
    setImages((a) => [...a, ...fs])
    setMiss(false)
  }, [])

  const grab = useCallback(async (img: string, ref: string | undefined, append: boolean) => {
    try {
      const r = await fetch('/api/metadata?image=' + encodeURIComponent(img) + (ref ? '&ref=' + encodeURIComponent(ref) : ''))
      const b = r.ok ? await r.blob() : undefined
      if (b && b.type.startsWith('image/')) {
        setImages((a) => (append || !a.length ? [...a, b] : a))
        return true
      }
    } catch {
      /* ignore, manual upload still works */
    }
    return false
  }, [])

  const lookup = useCallback(
    async (raw: string) => {
      const u = cleanUrl(raw)
      setUrl(u)
      if (!/^https?:\/\//i.test(u) || u === last.current) return
      last.current = u
      setStore((s) => s || storeName(u))
      setBusy(true)
      setMiss(false)
      let gotImage = false
      try {
        if (IMG_URL.test(u)) {
          gotImage = await grab(u, undefined, false)
        } else {
          const m = await (await fetch('/api/metadata?url=' + encodeURIComponent(u))).json()
          if (m.title) setTitle((t) => t || m.title)
          else {
            const fallback = slugTitle(u)
            if (fallback) setTitle((t) => t || fallback)
          }
          if (m.price) setPrice((p) => p || String(m.price))
          if (m.image) gotImage = await grab(m.image, u, false)
        }
      } catch {
        const fallback = slugTitle(u)
        if (fallback) setTitle((t) => t || fallback)
      }
      setMiss(!gotImage)
      setBusy(false)
    },
    [grab],
  )

  useEffect(() => {
    if (initialUrl) lookup(initialUrl)
  }, [initialUrl, lookup])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !addingTag) requestClose()
    }
    const onPaste = (e: ClipboardEvent) => {
      const fs = Array.from(e.clipboardData?.files ?? []).filter((x) => x.type.startsWith('image/'))
      if (fs.length) {
        e.preventDefault()
        addImages(fs)
        return
      }
      const t = e.clipboardData?.getData('text').trim() ?? ''
      if (/^https?:\/\/\S+$/i.test(t) && !(e.target instanceof HTMLInputElement)) lookup(t)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('paste', onPaste)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('paste', onPaste)
    }
  }, [addImages, lookup, requestClose, addingTag])

  async function onDrop(e: DragEvent) {
    e.preventDefault()
    const fs = Array.from(e.dataTransfer.files).filter((x) => x.type.startsWith('image/'))
    if (fs.length) return addImages(fs)
    const uri = (e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain')).split('\n')[0].trim()
    if (!/^https?:\/\//i.test(uri)) return
    if (IMG_URL.test(uri) || /pinimg\.com/i.test(uri)) {
      setBusy(true)
      const ok = await grab(uri, undefined, true)
      setBusy(false)
      setMiss(!ok)
    } else lookup(uri)
  }

  const commitNewTag = () => {
    const clean = newTag.trim().toLowerCase()
    if (clean && !tags.includes(clean)) setTags((prev) => [...prev, clean])
    setNewTag('')
    setAddingTag(false)
  }

  const canSave = mode === 'wishlist' ? !!(title.trim() || images.length || url.trim() || store.trim()) : images.length > 0

  async function save() {
    if (!canSave) return
    const parsedPrice = price.trim() ? Number(price) : undefined
    if (mode === 'wishlist') {
      const payload = {
        title: title.trim() || undefined,
        price: parsedPrice != null && !Number.isNaN(parsedPrice) ? parsedPrice : undefined,
        store: store.trim() || storeName(url),
        url: url.trim() ? cleanUrl(url) : undefined,
        images,
        notes: notes.trim() || undefined,
      }
      if (editing?.id) {
        await db.wishlist.update(editing.id, payload)
        onToast('changes saved')
      } else {
        await db.wishlist.add({ ...payload, status: 'want', createdAt: Date.now() })
        onToast('added to wishlist')
      }
    } else {
      await db.inspo.add({
        image: images[0],
        tags,
        sourceUrl: url.trim() ? cleanUrl(url) : undefined,
        createdAt: Date.now(),
      })
      onToast('saved to inspo')
    }
    requestClose()
  }

  async function handleDelete() {
    if (!editing?.id) return
    if (!confirmDel) {
      setConfirmDel(true)
      return
    }
    await db.wishlist.delete(editing.id)
    onToast('item deleted')
    requestClose()
  }

  const onPinterest = /pinterest|pin\.it/i.test(url)

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-[2px] sm:items-center sm:p-4 ${
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
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? 'edit item' : 'add item'}
        className={`no-scrollbar max-h-[92vh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-3xl bg-[#FAF9F7] p-5 pb-7 shadow-2xl dark:bg-[#161619] sm:rounded-3xl sm:border sm:border-stone-200/80 sm:pb-5 dark:sm:border-white/10 ${
          closing ? 'animate-sheet-down' : 'animate-sheet-up'
        }`}
        onClick={(e) => e.stopPropagation()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-stone-300 dark:bg-white/15 sm:hidden" />

        <div className="flex items-center justify-between">
          {isEdit ? (
            <span className="text-sm font-medium text-stone-900 dark:text-stone-100">edit item</span>
          ) : (
            <div className="inline-flex rounded-full bg-stone-200/75 p-1 dark:bg-white/[0.07]">
              {(['wishlist', 'inspo'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded-full px-3.5 py-1 text-xs font-medium transition ${
                    mode === m
                      ? 'bg-white text-stone-900 shadow-xs dark:bg-white/25 dark:text-white'
                      : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
          <button
            aria-label="close"
            onClick={requestClose}
            className="grid h-8 w-8 place-items-center rounded-full text-stone-500 transition hover:bg-stone-200/70 hover:text-stone-900 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X size={17} />
          </button>
        </div>

        <div className="relative">
          <Link2 size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            className={`${field} pl-9 pr-9`}
            placeholder="paste a product or pinterest link"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onPaste={(e) => {
              const t = e.clipboardData.getData('text').trim()
              if (/^https?:\/\/\S+$/i.test(t)) {
                e.preventDefault()
                lookup(t)
              }
            }}
            onBlur={() => url && lookup(url)}
          />
          {busy && <Loader2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-stone-400" />}
        </div>

        {images.length === 0 ? (
          <label className="group relative block cursor-pointer overflow-hidden rounded-2xl border border-dashed border-stone-300 bg-stone-100/60 transition hover:border-stone-400 dark:border-white/15 dark:bg-white/[0.03] dark:hover:border-white/30">
            <div className="flex flex-col items-center gap-1.5 py-7 text-stone-500 dark:text-stone-400">
              <ImagePlus size={20} strokeWidth={1.75} className="transition group-hover:scale-105" />
              <span className="text-xs font-medium">upload, drop or paste photos (ctrl/cmd+v)</span>
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addImages(Array.from(e.target.files ?? []))
                e.target.value = ''
              }}
            />
          </label>
        ) : (
          <div className="space-y-2">
            <div className="relative flex max-h-56 items-center justify-center overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-100 dark:border-white/10 dark:bg-black/40">
              {cover && <img src={cover} alt="cover" className="max-h-56 w-full object-contain" />}
              <button
                aria-label="remove cover photo"
                onClick={() => setImages((a) => a.slice(1))}
                className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80"
              >
                <X size={14} />
              </button>
            </div>
            {mode === 'wishlist' && (
              <>
                <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5 pl-0.5 pr-2 pt-1.5">
                  {images.map((b, i) => (
                    <Thumb
                      key={i}
                      blob={b}
                      cover={i === 0}
                      onPick={() => setImages((a) => [a[i], ...a.filter((_, j) => j !== i)])}
                      onRemove={() => setImages((a) => a.filter((_, j) => j !== i))}
                    />
                  ))}
                  <label className="grid h-14 w-12 shrink-0 cursor-pointer place-items-center rounded-lg border border-dashed border-stone-300 text-stone-500 transition hover:border-stone-400 dark:border-white/20 dark:text-stone-400 dark:hover:border-white/40">
                    <Plus size={16} />
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        addImages(Array.from(e.target.files ?? []))
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>
                {images.length > 1 && (
                  <p className="text-xs text-stone-500 dark:text-stone-400">first photo is the cover. tap another to make it the cover.</p>
                )}
              </>
            )}
          </div>
        )}

        {miss && images.length === 0 && (
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {onPinterest
              ? 'pinterest wouldn’t share that one. right-click the pin, copy image, then paste here (or drag it in).'
              : 'site blocked auto-image. paste a screenshot or upload one above.'}
          </p>
        )}

        <div>
          <div
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              mode === 'wishlist' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <div className="space-y-2.5 p-0.5">
                <input className={field} placeholder="title" value={title} onChange={(e) => setTitle(e.target.value)} />
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-stone-400 dark:text-stone-500">
                      $
                    </span>
                    <input
                      className={`${field} pl-7 tabular-nums`}
                      placeholder="0.00"
                      type="text"
                      inputMode="decimal"
                      value={price}
                      onChange={(e) => {
                        const v = e.target.value
                        if (/^\d*\.?\d{0,2}$/.test(v)) setPrice(v)
                      }}
                    />
                  </div>
                  <input className={field} placeholder="brand" value={store} onChange={(e) => setStore(e.target.value)} />
                </div>
                <input className={field} placeholder="size, color, fit notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          </div>

          <div
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              mode === 'inspo' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-1.5 p-0.5">
                {allTags.map((t) => {
                  const active = tags.includes(t)
                  return (
                    <button
                      type="button"
                      key={t}
                      onClick={() =>
                        setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
                      }
                      className={`rounded-full px-3 py-1 text-xs font-medium transition active:scale-95 ${
                        active
                          ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950'
                          : 'bg-stone-200/80 text-stone-600 hover:bg-stone-200 dark:bg-white/10 dark:text-stone-300 dark:hover:bg-white/20'
                      }`}
                    >
                      {t}
                    </button>
                  )
                })}

                {addingTag ? (
                  <input
                    autoFocus
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onBlur={commitNewTag}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault()
                        commitNewTag()
                      } else if (e.key === 'Escape') {
                        e.preventDefault()
                        setNewTag('')
                        setAddingTag(false)
                      }
                    }}
                    placeholder="tag name"
                    aria-label="new tag"
                    className="w-24 rounded-full bg-white px-3 py-1 text-xs text-stone-900 placeholder:text-stone-400 outline-none ring-1 ring-stone-900/20 dark:bg-white/10 dark:text-white dark:placeholder:text-stone-500 dark:ring-white/30"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingTag(true)}
                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-stone-300 px-3 py-1 text-xs font-medium text-stone-500 transition hover:border-stone-400 hover:text-stone-800 active:scale-95 dark:border-white/20 dark:text-stone-400 dark:hover:border-white/40 dark:hover:text-white"
                  >
                    new <Plus size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          {isEdit && (
            <button
              aria-label={confirmDel ? 'confirm delete' : 'delete item'}
              onClick={handleDelete}
              onBlur={() => setConfirmDel(false)}
              className={`inline-flex shrink-0 items-center justify-center rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-200 active:scale-[0.98] ${
                confirmDel
                  ? 'bg-stone-800 text-white dark:bg-white/20 dark:text-white'
                  : 'bg-stone-200/80 text-stone-600 hover:bg-stone-300/80 hover:text-stone-900 dark:bg-white/10 dark:text-stone-300 dark:hover:bg-white/15 dark:hover:text-white'
              }`}
            >
              <Trash2 size={15} className="shrink-0" />
              <span
                className={`grid transition-[grid-template-columns,opacity,margin] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  confirmDel ? 'ml-1.5 grid-cols-[1fr] opacity-100' : 'ml-0 grid-cols-[0fr] opacity-0'
                }`}
              >
                <span className="overflow-hidden whitespace-nowrap">confirm</span>
              </span>
            </button>
          )}
          <button
            disabled={!canSave}
            onClick={save}
            className="min-w-0 flex-1 rounded-xl bg-stone-900 py-3 text-sm font-medium text-white transition hover:bg-stone-800 active:scale-[0.98] disabled:opacity-30 dark:bg-white dark:text-stone-950 dark:hover:bg-stone-200"
          >
            {isEdit ? 'save changes' : 'save'}
          </button>
        </div>
      </div>
    </div>
  )
}