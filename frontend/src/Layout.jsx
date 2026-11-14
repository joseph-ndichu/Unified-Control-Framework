// The frame around every page: a dark menu that is always on the left, and the page on the right.
import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { LayoutDashboard, Library, LogOut, Search, Settings2, ShieldCheck, TriangleAlert } from 'lucide-react'
import { ThemeToggle } from './theme'
import { useApi } from './ui'

const item = ({ isActive }) =>
  `group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
    isActive
      ? 'bg-signal/10 font-medium text-chalk shadow-[inset_2px_0_0_var(--color-signal)] [&_svg]:text-signal'
      : 'text-chalk/65 hover:bg-chalk/5 hover:text-chalk'
  }`
const subItem = (active) =>
  `ml-[1.15rem] block border-l py-1.5 pr-2 pl-4 text-[0.8125rem] transition-colors ${
    active ? 'border-signal text-chalk' : 'border-chalk/15 text-chalk/55 hover:text-chalk'
  }`
const icon = 'h-4 w-4 shrink-0 text-chalk/50 group-hover:text-chalk'
const foot = 'flex items-center gap-2 rounded-md px-2 py-1.5 text-[0.8125rem] text-chalk/65 transition-colors hover:bg-chalk/5 hover:text-chalk'

// The brand mark: a shield in the signal colour, softly lit.
export function Brand({ size = 'h-9 w-9', icon = 'h-5 w-5' }) {
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-content-center rounded-lg border border-signal/40 bg-signal/10 text-signal shadow-[0_0_18px_-4px_var(--color-signal)] ${size}`}>
      <ShieldCheck className={icon} strokeWidth={2.2} />
    </span>
  )
}

function SearchBox({ current }) {
  const navigate = useNavigate()
  const [text, setText] = useState(current)
  const input = useRef(null)

  // Pressing "/" anywhere jumps to the search box, unless you are already typing somewhere.
  useEffect(() => {
    const onKey = (e) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable
      if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const submit = (e) => {
    e.preventDefault()
    if (text.trim()) navigate(`/search?q=${encodeURIComponent(text.trim())}`)
  }
  return (
    <form onSubmit={submit} role="search"
      className="flex items-center gap-2 rounded-md border border-chalk/15 bg-chalk/5 px-2.5 transition-colors focus-within:border-signal">
      <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-chalk/45" />
      <input
        ref={input}
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search"
        aria-label="Search controls and requirements"
        className="min-w-0 flex-1 bg-transparent py-2 text-sm text-chalk placeholder:text-chalk/40 focus:outline-none"
      />
      {!text && <kbd aria-hidden="true" title="Press / to search" className="hidden rounded border border-chalk/20 px-1.5 font-mono text-[0.6875rem] text-chalk/45 md:block">/</kbd>}
    </form>
  )
}

function Menu({ user, onSignOut }) {
  const meta = useApi('/meta/')
  const location = useLocation()
  const [params] = useSearchParams()
  const domain = location.pathname === '/controls' ? params.get('domain') : null
  const query = location.pathname === '/search' ? params.get('q') ?? '' : ''

  return (
    <div className="flex h-full flex-col gap-5 border-r border-line bg-rail px-3 py-4 text-chalk">
      <div className="flex items-center gap-2.5 px-1.5">
        <Brand />
        <div>
          <p className="display text-[0.95rem] leading-none font-semibold">Unified Control</p>
          <p className="label mt-1.5 text-chalk/45">Framework console</p>
        </div>
      </div>
      <SearchBox key={query} current={query} />
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto" aria-label="Main menu">
        <NavLink to="/" end className={item}><LayoutDashboard className={icon} />Home</NavLink>
        <NavLink to="/controls" className={item}><ShieldCheck className={icon} />Our controls</NavLink>
        {(meta.data?.unified_domains ?? []).map((name) => (
          <NavLink key={name} to={`/controls?domain=${encodeURIComponent(name)}`} className={() => subItem(domain === name)}>
            {name}
          </NavLink>
        ))}

        <p className="label mt-5 mb-1 px-2.5 text-chalk/40">Frameworks</p>
        {(meta.data?.frameworks ?? []).map((f) => (
          <NavLink key={f.id} to={`/frameworks/${f.id}`} className={item}><Library className={icon} />{f.name}</NavLink>
        ))}

        <p className="label mt-5 mb-1 px-2.5 text-chalk/40">Follow up</p>
        <NavLink to="/gaps" className={item}><TriangleAlert className={icon} />Gaps</NavLink>
      </nav>
      <div className="flex flex-col gap-0.5 border-t border-line pt-3">
        <div className="mb-1 flex items-center gap-2.5 px-2">
          <span aria-hidden="true" className="display grid h-7 w-7 shrink-0 place-content-center rounded-full bg-chalk/10 text-xs font-semibold uppercase">
            {user.username.slice(0, 2)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.username}</p>
            <p className="text-xs text-chalk/50">{user.role === 'admin' ? 'Admin, can edit' : 'Viewer, read only'}</p>
          </div>
        </div>
        <ThemeToggle className={foot} />
        {user.role === 'admin' && <a href="/admin/" className={foot}><Settings2 className="h-4 w-4" />Manage data</a>}
        <button onClick={onSignOut} className={foot}><LogOut className="h-4 w-4" />Sign out</button>
      </div>
    </div>
  )
}

export default function Layout({ user, onSignOut, children }) {
  const location = useLocation()
  // The menu drawer on small screens. It belongs to the page it was opened on,
  // so it closes by itself when you go to another page.
  const [openOn, setOpenOn] = useState(null)
  const open = openOn === location.pathname
  const setOpen = (value) => setOpenOn(value ? location.pathname : null)
  // A new page starts at its top.
  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])
  // While the drawer is open, Escape closes it and the page behind it does not scroll.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpenOn(null) }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <div className="min-h-screen md:flex">
      <header className="no-print flex items-center justify-between border-b border-line bg-rail px-4 py-3 text-chalk md:hidden">
        <span className="flex items-center gap-2.5">
          <Brand size="h-8 w-8" icon="h-4 w-4" />
          <span className="display font-semibold">Unified Control</span>
        </span>
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="rounded-md border border-chalk/25 px-3 py-1.5 text-sm">
          {open ? 'Close' : 'Menu'}
        </button>
      </header>
      {/* On small screens the menu slides in over the page, with a dimmed backdrop that closes it. */}
      {open && (
        <button type="button" aria-label="Close menu" onClick={() => setOpen(false)}
          className="no-print fixed inset-0 z-30 bg-black/55 md:hidden" />
      )}
      <aside className={`no-print fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] transition-[transform,visibility] duration-200 ease-out ${
        open ? 'visible translate-x-0' : 'invisible -translate-x-full'
      } md:visible md:sticky md:top-0 md:z-auto md:h-screen md:w-64 md:max-w-none md:shrink-0 md:translate-x-0 md:transition-none`}>
        <Menu user={user} onSignOut={onSignOut} />
      </aside>
      <main className="min-w-0 flex-1 px-5 py-7 md:px-10 md:py-9">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  )
}
