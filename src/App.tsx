import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Moon, Settings, Sun, Upload } from 'lucide-react'
import Wishlist from './components/Wishlist'
import Inspo from './components/Inspo'
import QuickAdd from './components/QuickAdd'
import ItemViewer from './components/ItemViewer'
import { fmtDate } from './utils/format'
import { db, type WishlistItem } from './db'
import { exportBackup, importBackup } from './utils/backup'

type Tab = 'wishlist' | 'inspo'

function FourPointStar({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 1.2C12.95 7.5 16.5 11.05 22.8 12C16.5 12.95 12.95 16.5 12 22.8C11.05 16.5 7.5 12.95 1.2 12C7.5 11.05 11.05 7.5 12 1.2Z" />
    </svg>
  )
}

function BubblyPlus({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <rect x="9.75" y="4.5" width="4.5" height="15" rx="2.25" />
      <rect x="4.5" y="9.75" width="15" height="4.5" rx="2.25" />
    </svg>
  )
}

function StarFab({ onClick }: { onClick: () => void }) {
  const spinRef = useRef<HTMLDivElement>(null)
  const angle = useRef(0)
  const vel = useRef(0)
  const hovered = useRef(false)
  const target = useRef<number | null>(null)
  const raf = useRef<number>(0)

  const tick = () => {
    if (hovered.current) {
      target.current = null
      vel.current += (1.2 - vel.current) * 0.08
      angle.current += vel.current
    } else {
      if (target.current === null) {
        target.current = Math.ceil(angle.current / 90) * 90
      }
      const rem = target.current - angle.current
      if (rem <= 0.15 || vel.current <= 0.02) {
        angle.current = target.current % 360
        target.current = null
        vel.current = 0
        if (spinRef.current) {
          spinRef.current.style.transform = `rotate(${angle.current}deg)`
        }
        raf.current = 0
        return
      }
      const decel = (vel.current * vel.current) / (2 * rem)
      vel.current = Math.max(0.02, vel.current - decel)
      angle.current += Math.min(vel.current, rem)
    }

    if (spinRef.current) {
      spinRef.current.style.transform = `rotate(${angle.current}deg)`
    }
    raf.current = requestAnimationFrame(tick)
  }

  const start = () => {
    hovered.current = true
    if (!raf.current) raf.current = requestAnimationFrame(tick)
  }

  const stop = () => {
    hovered.current = false
    if (!raf.current) raf.current = requestAnimationFrame(tick)
  }

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-11 z-30 flex justify-center"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <button
        aria-label="quick add"
        onClick={onClick}
        onMouseEnter={start}
        onMouseLeave={stop}
        className="pointer-events-auto grid h-16 w-16 place-items-center text-stone-900 drop-shadow-lg transition-transform duration-300 hover:scale-110 active:scale-95 dark:text-white"
      >
        <div ref={spinRef} className="relative grid h-full w-full place-items-center will-change-transform">
          <FourPointStar className="h-full w-full" />
          <BubblyPlus className="absolute h-4 w-4 text-white dark:text-stone-950" />
        </div>
      </button>
    </div>
  )
}

function StarScrollbar() {
  const [scrollable, setScrollable] = useState(false)
  const [label, setLabel] = useState('')
  const [show, setShow] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const hovering = useRef(false)
  const hideTimer = useRef(0)

  const flash = useCallback(() => {
    setShow(true)
    window.clearTimeout(hideTimer.current)
    if (!dragging.current && !hovering.current) hideTimer.current = window.setTimeout(() => setShow(false), 1100)
  }, [])

  useEffect(() => {
    let frame = 0
    const sync = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setScrollable(max > 24)
      const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      if (thumbRef.current) thumbRef.current.style.top = `${ratio * 100}%`
      if (labelRef.current) labelRef.current.style.top = `${ratio * 100}%`
      let best = 0
      document.querySelectorAll<HTMLElement>('[data-ts]').forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.bottom > 72 && r.top < window.innerHeight) best = Math.max(best, Number(el.dataset.ts))
      })
      setLabel(best ? fmtDate(best) : '')
    }
    const onScroll = () => {
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0
          sync()
          flash()
        })
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(document.body)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', sync)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(frame)
      window.clearTimeout(hideTimer.current)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', sync)
    }
  }, [flash])

  const scrollToClientY = (clientY: number) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height))
    const max = document.documentElement.scrollHeight - window.innerHeight
    window.scrollTo({ top: ratio * max, behavior: 'instant' as ScrollBehavior })
  }

  if (!scrollable) return null

  return (
    <div
      ref={trackRef}
      role="scrollbar"
      aria-label="page scroll"
      onPointerEnter={() => {
        hovering.current = true
        setShow(true)
      }}
      onPointerLeave={() => {
        hovering.current = false
        flash()
      }}
      onPointerDown={(e) => {
        dragging.current = true
        setShow(true)
        e.currentTarget.setPointerCapture(e.pointerId)
        scrollToClientY(e.clientY)
      }}
      onPointerMove={(e) => {
        if (dragging.current) scrollToClientY(e.clientY)
      }}
      onPointerUp={(e) => {
        dragging.current = false
        e.currentTarget.releasePointerCapture(e.pointerId)
        flash()
      }}
      className="group fixed right-1.5 top-1/2 z-20 flex h-[60vh] w-5 -translate-y-1/2 cursor-pointer touch-none justify-center select-none sm:right-2"
    >
      <div className="relative h-full w-[1.5px] rounded-full bg-stone-300/70 transition-colors group-hover:bg-stone-400/80 dark:bg-white/15 dark:group-hover:bg-white/25">
        <div
          ref={labelRef}
          aria-hidden="true"
          style={{ top: '0%' }}
          className={`pointer-events-none absolute right-5 -translate-y-1/2 whitespace-nowrap rounded-full bg-stone-900/90 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg transition-opacity duration-200 dark:bg-white/90 dark:text-stone-950 ${
            show && label ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {label}
        </div>
        <div
          ref={thumbRef}
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-stone-800 transition-transform duration-150 group-hover:scale-125 dark:text-stone-200"
          style={{ top: '0%' }}
        >
          <FourPointStar className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('wishlist')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<WishlistItem>()
  const [viewingId, setViewingId] = useState<number>()
  const [pastedBlob, setPastedBlob] = useState<Blob>()
  const [pastedUrl, setPastedUrl] = useState<string>()
  const [menu, setMenu] = useState(false)
  const [toast, setToast] = useState('')
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('starinspo-theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('starinspo-theme', dark ? 'dark' : 'light')
  }, [dark])

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? '' : t)), 2400)
  }

  useEffect(() => {
    if (adding || editing || viewingId != null) return
    const onPaste = async (e: ClipboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const img = Array.from(e.clipboardData?.files ?? []).find((x) => x.type.startsWith('image/'))
      if (img) {
        e.preventDefault()
        if (tab === 'inspo') {
          await db.inspo.add({ image: img, tags: [], createdAt: Date.now() })
          showToast('saved to inspo')
        } else {
          setPastedBlob(img)
          setAdding(true)
        }
        return
      }
      const text = e.clipboardData?.getData('text').trim() ?? ''
      if (/^https?:\/\/\S+$/i.test(text)) {
        e.preventDefault()
        setPastedUrl(text)
        setAdding(true)
      }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [adding, editing, viewingId, tab])

  const menuItem =
    'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-stone-700 transition hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-white/10'

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF9F7] text-[#141413] transition-colors dark:bg-[#0E0E10] dark:text-[#F5F5F4]">
      <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-[#FAF9F7]/85 backdrop-blur-md dark:border-white/10 dark:bg-[#0E0E10]/85">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <a
            href="/"
            className="inline-flex select-none items-center gap-1.5 font-serif-brand text-2xl italic tracking-tight transition-opacity hover:opacity-80"
          >
            <FourPointStar className="h-3.5 w-3.5 text-stone-800 dark:text-stone-200" />
            starinspo
          </a>

          <nav className="relative grid grid-cols-2 rounded-full bg-stone-200/75 p-1 dark:bg-white/[0.07]">
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-white shadow-sm ring-1 ring-transparent transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] dark:bg-white/25 dark:ring-white/15 ${
                tab === 'inspo' ? 'translate-x-full' : 'translate-x-0'
              }`}
            />
            {(['wishlist', 'inspo'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative z-10 w-20 rounded-full py-1 text-center text-xs font-medium transition-colors duration-200 ${
                  tab === t
                    ? 'text-stone-900 dark:text-white'
                    : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
                }`}
              >
                {t}
              </button>
            ))}
          </nav>

          <div className="relative">
            <button
              aria-label="settings"
              onClick={() => setMenu((m) => !m)}
              className="grid h-9 w-9 place-items-center rounded-full text-stone-600 transition hover:bg-stone-200/70 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <Settings size={17} />
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
                <div className="animate-fade-up absolute right-0 z-40 mt-2 w-48 rounded-2xl border border-stone-200/80 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-[#1A1A1E]">
                  <button
                    className={menuItem}
                    onClick={() => {
                      setDark((d) => !d)
                      setMenu(false)
                    }}
                  >
                    {dark ? <Sun size={14} /> : <Moon size={14} />}
                    {dark ? 'light mode' : 'dark mode'}
                  </button>
                  <button
                    className={menuItem}
                    onClick={() => {
                      exportBackup()
                      setMenu(false)
                      showToast('backup exported')
                    }}
                  >
                    <Download size={14} /> export backup
                  </button>
                  <button className={menuItem} onClick={() => file.current?.click()}>
                    <Upload size={14} /> import backup
                  </button>
                </div>
              </>
            )}
            <input
              ref={file}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                setMenu(false)
                if (!f) return
                try {
                  await importBackup(f)
                  showToast('backup imported')
                } catch (err) {
                  showToast(err instanceof Error ? err.message : 'import failed')
                }
              }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24 pr-6 xl:pr-0">
        {tab === 'wishlist' ? (
          <Wishlist onOpen={(item) => setViewingId(item.id)} onEdit={(item) => setEditing(item)} />
        ) : (
          <Inspo onToast={showToast} />
        )}
      </main>

      <footer className="pb-3 pt-4 text-center text-xs text-stone-400 dark:text-stone-500">
        <a
          href="https://github.com/cynjiang"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 transition hover:text-stone-700 dark:hover:text-stone-300"
        >
          <FourPointStar className="h-2.5 w-2.5" />
          made by cyn
        </a>
      </footer>

      <StarScrollbar />
      <StarFab onClick={() => setAdding(true)} />

      {toast && (
        <div className="animate-fade-up fixed bottom-28 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-stone-900 px-4 py-2 text-xs font-medium text-white shadow-lg dark:bg-white dark:text-stone-950">
          {toast}
        </div>
      )}

      {viewingId != null && (
        <ItemViewer
          id={viewingId}
          onClose={() => setViewingId(undefined)}
          onEdit={(item) => {
            setViewingId(undefined)
            setEditing(item)
          }}
        />
      )}

      {(adding || editing) && (
        <QuickAdd
          initial={tab}
          editing={editing}
          initialBlob={pastedBlob}
          initialUrl={pastedUrl}
          onClose={() => {
            setAdding(false)
            setEditing(undefined)
            setPastedBlob(undefined)
            setPastedUrl(undefined)
          }}
          onToast={showToast}
        />
      )}
    </div>
  )
}