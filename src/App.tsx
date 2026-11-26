import { useRef, useState } from 'react'
import { Plus, Settings } from 'lucide-react'
import Shopping from './components/Shopping'
import Inspo from './components/Inspo'
import QuickAdd from './components/QuickAdd'
import { exportBackup, importBackup } from './utils/backup'

type Tab = 'shop' | 'inspo'

export default function App() {
  const [tab, setTab] = useState<Tab>('shop')
  const [adding, setAdding] = useState(false)
  const [menu, setMenu] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const item = 'block w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-900'

  return (
    <div className="min-h-screen bg-white text-black dark:bg-black dark:text-white">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-black/90">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <span className="text-lg font-semibold tracking-tight">grail</span>
          <nav className="flex gap-6 text-sm">
            {(['shop', 'inspo'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={tab === t ? 'underline underline-offset-8' : 'text-neutral-500'}>
                {t === 'shop' ? 'shopping' : 'inspo'}
              </button>
            ))}
          </nav>
          <div className="relative">
            <button aria-label="data and backup" onClick={() => setMenu((m) => !m)}><Settings size={18} /></button>
            {menu && (
              <div className="absolute right-0 mt-3 w-44 border border-neutral-200 bg-white text-sm dark:border-neutral-800 dark:bg-black">
                <button className={item} onClick={() => { exportBackup(); setMenu(false) }}>export backup</button>
                <button className={item} onClick={() => file.current?.click()}>import backup</button>
              </div>
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
                  alert('backup imported, you’re good.')
                } catch (err) {
                  alert('import failed: ' + (err instanceof Error ? err.message : 'couldn’t read that file'))
                }
              }}
            />
          </div>
        </div>
      </header>
      <main className="pb-24">{tab === 'shop' ? <Shopping /> : <Inspo />}</main>
      <button
        aria-label="quick add"
        onClick={() => setAdding(true)}
        className="fixed bottom-6 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-black text-white shadow-lg dark:bg-white dark:text-black"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        <Plus />
      </button>
      {adding && <QuickAdd initial={tab} onClose={() => setAdding(false)} />}
    </div>
  )
}
