import { useState } from 'react'
import { api } from './api'

const field = 'rounded-md border border-stone-300 px-3 py-2 text-sm font-normal text-stone-900'

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
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-stone-200 bg-white p-6">
        <h1 className="text-lg font-semibold">UCF Repository</h1>
        <p className="mb-5 text-sm text-stone-600">
          {registering ? 'Create an account. New accounts can view, not edit.' : 'Sign in to continue.'}
        </p>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
            Username
            <input className={field} value={form.username} onChange={set('username')} autoComplete="username" required />
          </label>
          {registering && (
            <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
              Email
              <input className={field} type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
            </label>
          )}
          <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
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
          {error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-800">{error}</p>}
          <button disabled={busy} className="rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
            {registering ? 'Create account' : 'Sign in'}
          </button>
        </div>
        <button
          type="button"
          onClick={() => { setMode(registering ? 'login' : 'register'); setError(null) }}
          className="mt-4 text-sm text-stone-600 underline hover:text-stone-900"
        >
          {registering ? 'I already have an account' : 'Create an account'}
        </button>
      </form>
    </div>
  )
}
