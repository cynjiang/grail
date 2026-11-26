import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { db } from '../db'
import { cleanUrl, parseTags, storeName } from '../utils/urlCleaner'
import { useObjectUrl } from '../utils/useObjectUrl'

type Mode = 'shop' | 'inspo'
const inp =
  'w-full border-b border-neutral-300 bg-transparent py-2 text-sm outline-none focus:border-black dark:border-neutral-700 dark:focus:border-white'
const IMG_URL = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i

export default function QuickAdd({ initial, onClose }: { initial: Mode; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>(initial)
  const [url, setUrl] = useState('')
  const [blob, setBlob] = useState<Blob>()
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [store, setStore] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')
  const [busy, setBusy] = useState(false)
  const [miss, setMiss] = useState(false)
  const last = useRef('')
  const preview = useObjectUrl(blob)

  async function lookup(raw: string) {
    const u = cleanUrl(raw)
    setUrl(u)
    if (!/^https?:\/\//i.test(u) || u === last.current) return
    last.current = u
    setStore((s) => s || storeName(u))
    setBusy(true)
    setMiss(false)
    let gotImage = false
    try {
      const grab = async (img: string) => {
        const r = await fetch('/api/metadata?image=' + encodeURIComponent(img))
        const b = r.ok ? await r.blob() : undefined
        if (b && b.type.startsWith('image/')) {
          setBlob((x) => x ?? b)
          gotImage = true
        }
      }
      if (IMG_URL.test(u)) {
        await grab(u)
      } else {
        const m = await (await fetch('/api/metadata?url=' + encodeURIComponent(u))).json()
        if (m.title) setTitle((t) => t || m.title)
        if (m.price) setPrice((p) => p || String(m.price))
        if (m.image) await grab(m.image)
      }
    } catch {
      /* fall through to manual entry */
    }
    setMiss(!gotImage)
    setBusy(false)
  }

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.files ?? []).find((x) => x.type.startsWith('image/'))
      if (f) {
        e.preventDefault()
        setBlob(f)
        setMiss(false)
        return
      }
      const t = e.clipboardData?.getData('text').trim() ?? ''
      if (/^https?:\/\/\S+$/i.test(t) && !(e.target instanceof HTMLInputElement)) lookup(t)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [])

  const canSave = mode === 'shop' ? !!title.trim() : !!blob

  async function save() {
    if (mode === 'shop') {
      await db.shop.add({
        title: title.trim(),
        price: price ? Number(price) : undefined,
        store: store.trim() || storeName(url),
        url: url || undefined,
        image: blob,
        notes: notes.trim() || undefined,
        status: 'want',
        createdAt: Date.now(),
      })
    } else {
      await db.inspo.add({ image: blob!, tags: parseTags(tags), sourceUrl: url || undefined, createdAt: Date.now() })
    }
    onClose()
  }

  const tab = (m: Mode, label: string) => (
    <button onClick={() => setMode(m)} className={mode === m ? 'underline underline-offset-8' : 'text-neutral-500'}>
      {label}
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="add item"
        className="max-h-[92vh] w-full max-w-md space-y-3 overflow-y-auto bg-white p-5 dark:bg-black sm:border sm:border-neutral-200 dark:sm:border-neutral-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between text-sm">
          <div className="flex gap-5">{tab('shop', 'shopping')}{tab('inspo', 'inspo')}</div>
          <button aria-label="close" onClick={onClose}><X size={18} /></button>
        </div>
        <input
          className={inp}
          placeholder="paste a link"
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
        {busy && <p className="text-xs text-neutral-500">grabbing details…</p>}
        {preview && <img src={preview} alt="selected" className="max-h-56 w-full object-contain" />}
        <label className="block cursor-pointer border border-dashed border-neutral-300 py-3 text-center text-xs text-neutral-500 dark:border-neutral-700">
          {blob ? 'swap photo' : 'upload a photo or paste one (ctrl/cmd+v)'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) {
                setBlob(f)
                setMiss(false)
              }
            }}
          />
        </label>
        {miss && !blob && (
          <p className="text-xs text-neutral-500">couldn’t grab details from that site. type them in below or add a photo.</p>
        )}
        {mode === 'shop' ? (
          <>
            <input className={inp} placeholder="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="flex gap-3">
              <input className={inp} placeholder="price" type="number" inputMode="decimal" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
              <input className={inp} placeholder="store" value={store} onChange={(e) => setStore(e.target.value)} />
            </div>
            <input className={inp} placeholder="size, color, fit" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </>
        ) : (
          <input className={inp} placeholder="tags: outerwear, leather, brown" value={tags} onChange={(e) => setTags(e.target.value)} />
        )}
        <button
          disabled={!canSave}
          onClick={save}
          className="w-full bg-black py-3 text-sm text-white disabled:opacity-30 dark:bg-white dark:text-black"
        >
          save
        </button>
      </div>
    </div>
  )
}
