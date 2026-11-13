// Shared labels, colors, and small building blocks.
import { useEffect, useState } from 'react'
import { api } from './api'

// Coverage is an ordered scale, so it uses one hue from dark (full) to light, and gray for a gap.
export const COVERAGE = {
  full: { label: 'Full', color: '#0d366b', help: 'A unified control fully satisfies it' },
  combined: { label: 'Combined', color: '#256abf', help: 'Two or more partial mappings, to be confirmed' },
  partial: { label: 'Partial', color: '#5598e7', help: 'Only part of it is satisfied' },
  related_only: { label: 'Related only', color: '#86b6ef', help: 'Linked for context, no compliance credit' },
  gap: { label: 'Gap', color: '#d9d8d1', help: 'No unified control maps to it yet' },
}
export const COVERAGE_ORDER = ['full', 'combined', 'partial', 'related_only', 'gap']

export const STATUS_LABEL = {
  not_started: 'Not started',
  in_progress: 'In progress',
  implemented: 'Implemented',
  not_applicable: 'Not applicable',
  missing: 'Missing',
  collected: 'Collected',
  expired: 'Expired',
}

export const RELATIONSHIP = {
  equivalent: 'Same scope. Meeting one meets the other.',
  covers: 'The unified control fully satisfies this control.',
  partial: 'Satisfies only part of this control.',
  related: 'Context only. Gives no compliance credit.',
}

// Load data and reload whenever the dependency list changes.
export function useApi(path, params, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!path) return
    let live = true
    setState((s) => ({ ...s, loading: true }))
    api(path, { params })
      .then((data) => live && setState({ data, error: null, loading: false }))
      .catch((error) => live && setState({ data: null, error: error.message, loading: false }))
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick, ...deps])
  return { ...state, reload: () => setTick((t) => t + 1) }
}

export function CoverageBadge({ state }) {
  const c = COVERAGE[state]
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-stone-700" title={c.help}>
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} />
      {c.label}
    </span>
  )
}

export function Pill({ children, title }) {
  return (
    <span title={title} className="rounded-full border border-stone-300 bg-white px-2 py-0.5 text-xs text-stone-700">
      {children}
    </span>
  )
}

export function Card({ title, children, className = '' }) {
  return (
    <section className={`rounded-lg border border-stone-200 bg-white p-4 ${className}`}>
      {title && <h2 className="mb-3 text-sm font-semibold text-stone-900">{title}</h2>}
      {children}
    </section>
  )
}

export function Select({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm font-normal text-stone-900"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    </label>
  )
}

export function Search({ value, onChange, placeholder }) {
  return (
    <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-medium text-stone-600">
      Search
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm font-normal text-stone-900"
      />
    </label>
  )
}

export function Notice({ error, loading, empty }) {
  if (error) return <p className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>
  if (loading) return <p className="p-3 text-sm text-stone-500">Loading…</p>
  if (empty) return <p className="p-3 text-sm text-stone-500">{empty}</p>
  return null
}

// Delay a fast-changing value (typing) so the API is not called on every keystroke.
export function useDebounced(value, ms = 250) {
  const [slow, setSlow] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setSlow(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return slow
}
