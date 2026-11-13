import { useEffect, useState } from 'react'
import { api } from './api'
import Dashboard from './Dashboard'
import FrameworkControls from './FrameworkControls'
import Login from './Login'
import UnifiedControls from './UnifiedControls'

const TABS = [
  ['dashboard', 'Dashboard'],
  ['unified', 'Unified controls'],
  ['framework', 'Framework controls'],
]

export default function App() {
  const [user, setUser] = useState(undefined) // undefined while the session is being checked
  const [page, setPage] = useState({ view: 'dashboard', id: null })
  const go = (view, id = null) => setPage({ view, id })

  useEffect(() => {
    api('/auth/session/').then((d) => setUser(d.user)).catch(() => setUser(null))
  }, [])

  if (user === undefined) return <p className="p-8 text-sm text-stone-500">Loading…</p>
  if (!user) return <Login onSignedIn={setUser} />

  const signOut = () => api('/auth/logout/', { method: 'POST' }).then(() => { go('dashboard'); setUser(null) })
  const isAdmin = user.role === 'admin'

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="text-base font-semibold">UCF Repository</span>
          <nav className="flex gap-1">
            {TABS.map(([view, label]) => (
              <button
                key={view}
                onClick={() => go(view)}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  page.view === view ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-stone-600">
            {isAdmin && <a href="/admin/" className="underline hover:text-stone-900">Admin site</a>}
            <span>{user.username} ({user.role})</span>
            <button onClick={signOut} className="rounded-md border border-stone-300 px-3 py-1.5 hover:bg-stone-100">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        {page.view === 'dashboard' && <Dashboard go={go} />}
        {page.view === 'unified' && <UnifiedControls selected={page.id} go={go} isAdmin={isAdmin} />}
        {page.view === 'framework' && <FrameworkControls selected={page.id} go={go} />}
      </main>
    </div>
  )
}
