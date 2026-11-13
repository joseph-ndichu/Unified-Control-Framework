// The frame around every page: a menu that is always on the left, and the page on the right.
import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useApi } from './ui'

const item = ({ isActive }) =>
  `block rounded-md px-3 py-2 text-sm ${isActive ? 'bg-stone-900 font-medium text-white' : 'text-stone-700 hover:bg-stone-100'}`
const subItem = (active) =>
  `block rounded-md py-1.5 pr-3 pl-7 text-sm ${active ? 'bg-stone-200 font-medium text-stone-900' : 'text-stone-600 hover:bg-stone-100'}`

function SearchBox({ current }) {
  const navigate = useNavigate()
  const [text, setText] = useState(current)
  const submit = (e) => {
    e.preventDefault()
    if (text.trim()) navigate(`/search?q=${encodeURIComponent(text.trim())}`)
  }
  return (
    <form onSubmit={submit} role="search" className="flex gap-1.5">
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search, e.g. password or A.5.15"
        aria-label="Search controls and requirements"
        className="min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm"
      />
      <button className="rounded-md border border-stone-300 bg-white px-2.5 text-sm hover:bg-stone-100">Go</button>
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
    <div className="flex h-full flex-col gap-5 p-4">
      <div>
        <p className="text-base font-semibold text-stone-900">UCF Repository</p>
        <p className="text-xs text-stone-500">Unified Control Framework</p>
      </div>
      <SearchBox key={query} current={query} />
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto" aria-label="Main menu">
        <NavLink to="/" end className={item}>Home</NavLink>

        <NavLink to="/controls" className={item}>Our controls</NavLink>
        {(meta.data?.unified_domains ?? []).map((name) => (
          <NavLink key={name} to={`/controls?domain=${encodeURIComponent(name)}`} className={() => subItem(domain === name)}>
            {name}
          </NavLink>
        ))}

        <p className="mt-3 px-3 text-xs font-medium tracking-wide text-stone-500 uppercase">Frameworks</p>
        {(meta.data?.frameworks ?? []).map((f) => (
          <NavLink key={f.id} to={`/frameworks/${f.id}`} className={item}>{f.name}</NavLink>
        ))}

        <p className="mt-3 px-3 text-xs font-medium tracking-wide text-stone-500 uppercase">Follow up</p>
        <NavLink to="/gaps" className={item}>Gaps</NavLink>
      </nav>
      <div className="border-t border-stone-200 pt-3 text-sm">
        <p className="text-stone-900">{user.username}</p>
        <p className="text-xs text-stone-500">{user.role === 'admin' ? 'Admin: can edit' : 'Viewer: read only'}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {user.role === 'admin' && <a href="/admin/" className="text-stone-600 underline hover:text-stone-900">Manage data</a>}
          <button onClick={onSignOut} className="text-stone-600 underline hover:text-stone-900">Sign out</button>
        </div>
      </div>
    </div>
  )
}

export default function Layout({ user, onSignOut, children }) {
  const [open, setOpen] = useState(false) // menu drawer on small screens
  const location = useLocation()
  useEffect(() => setOpen(false), [location])

  return (
    <div className="min-h-screen md:flex">
      <header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 md:hidden">
        <span className="font-semibold">UCF Repository</span>
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm">
          {open ? 'Close menu' : 'Menu'}
        </button>
      </header>
      <aside className={`${open ? 'block' : 'hidden'} border-b border-stone-200 bg-white md:sticky md:top-0 md:block md:h-screen md:w-64 md:shrink-0 md:border-r md:border-b-0`}>
        <Menu user={user} onSignOut={onSignOut} />
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  )
}
