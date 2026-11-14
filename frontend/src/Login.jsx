import { useState } from 'react'
import { api } from './api'
import { Brand } from './Layout'
import { ThemeToggle } from './theme'

const field = 'field w-full'
const label = 'flex flex-col gap-1.5 text-xs font-medium text-stone-600'

export default function Login({ onSignedIn }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const registering = mode === 'register'

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const body = registering ? form : { username: form.username, password: form.password }
      const data = await api(`/auth/${mode}/`, { method: 'POST', body })
      onSignedIn(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <div className="absolute top-5 right-5">
        <ThemeToggle className="flex items-center gap-2 rounded-md border border-line px-2.5 py-1.5 text-xs text-stone-600 hover:border-signal hover:text-signal-fg" />
      </div>

      <div className="flex flex-col items-center text-center">
        <Brand size="h-12 w-12" icon="h-6 w-6" />
        <h1 className="display mt-5 text-2xl font-semibold sm:text-3xl">
          <span className="text-signal-fg">Unified Control Framework</span>
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone-600">
          Stop doing the same work twice. UCF allows you to map your controls to multiple standards and regulations, 
          so you can demonstrate compliance with less effort.
        </p>
      </div>

      <form onSubmit={submit} className="panel w-full max-w-sm">
        <div className="panel-head">
          <h2 className="label font-medium text-stone-800">{registering ? 'New account' : 'Sign in'}</h2>
        </div>
        <div className="flex flex-col gap-4 px-5 py-5">
          {registering && <p className="text-sm text-stone-600">New accounts can read everything, but not edit.</p>}
          <label className={label}>
            Username
            <input className={field} value={form.username} onChange={set('username')} autoComplete="username" required />
          </label>
          {registering && (
            <label className={label}>
              Email
              <input className={field} type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
            </label>
          )}
          <label className={label}>
            Password
            <input
              className={field}
              type="password"
              value={form.password}
              onChange={set('password')}
              autoComplete={registering ? 'new-password' : 'current-password'}
              required
            />
          </label>
          {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <button disabled={busy} className="btn mt-1 py-2">{registering ? 'Create account' : 'Sign in'}</button>
          <button
            type="button"
            onClick={() => { setMode(registering ? 'login' : 'register'); setError(null) }}
            className="self-center text-sm underline"
          >
            {registering ? 'I already have an account' : 'Create an account'}
          </button>
        </div>
      </form>

      <p className="label text-stone-500">NCA ECC-2:2024 · ISO/IEC 27001:2022</p>
    </div>
  )
}
