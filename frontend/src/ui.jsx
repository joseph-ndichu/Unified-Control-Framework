// Shared wording, colors, and small building blocks.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from './api'

// The API has five coverage states. People only need three.
export const COVER = {
  covered: { label: 'Covered', color: '#0d366b' },
  partly: { label: 'Partly covered', color: '#5598e7' },
  none: { label: 'Not covered', color: '#d9d8d1' },
}
export const COVER_ORDER = ['covered', 'partly', 'none']
export const simple = (state) =>
  state === 'full' || state === 'combined' ? 'covered' : state === 'partial' ? 'partly' : 'none'
// Count the three plain states from an API row that carries the five raw counts.
export const tally = (row) => ({
  covered: row.full + row.combined,
  partly: row.partial,
  none: row.related_only + row.gap,
})

// How a unified control relates to a requirement, in a full sentence.
export const RELATION = {
  equivalent: 'Fully satisfies it',
  covers: 'Fully satisfies it',
  partial: 'Satisfies part of it',
  related: 'Related only, does not count',
}
export const counts = (relationship) => relationship !== 'related'

export const STATUS = {
  not_started: 'Not started',
  in_progress: 'In progress',
  implemented: 'Implemented',
  not_applicable: 'Not applicable',
}
export const STATUS_ORDER = ['not_started', 'in_progress', 'implemented', 'not_applicable']

// Load data, and reload when the path or query changes.
export function useApi(path, params) {
  const key = path + JSON.stringify(params ?? {})
  const [state, setState] = useState({ data: null, error: null, loading: true, key })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!path) return
    let live = true
    api(path, { params })
      .then((data) => live && setState({ data, error: null, loading: false, key }))
      .catch((error) => live && setState({ data: null, error: error.message, loading: false, key }))
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick])
  const stale = state.key !== key // answer on screen belongs to an earlier request
  return { ...state, data: stale ? null : state.data, loading: state.loading || stale, reload: () => setTick((t) => t + 1) }
}

export function Notice({ error, loading }) {
  if (error) return <p className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>
  if (loading) return <p className="p-3 text-sm text-stone-500">Loading…</p>
  return null
}

// "Home > Controls > Access Management". The last item is the current page.
export function Crumbs({ trail }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1.5 text-sm text-stone-500">
      <Link to="/" className="hover:text-stone-900 hover:underline">Home</Link>
      {trail.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span aria-hidden="true">›</span>
          {item.to ? <Link to={item.to} className="hover:text-stone-900 hover:underline">{item.label}</Link> : <span className="text-stone-800">{item.label}</span>}
        </span>
      ))}
    </nav>
  )
}

export function PageTitle({ title, kicker, children }) {
  return (
    <header className="mb-5">
      {kicker && <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">{kicker}</p>}
      <h1 className="text-2xl font-semibold text-stone-900">{title}</h1>
      {children && <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-stone-600">{children}</p>}
    </header>
  )
}

export function Card({ title, hint, children, className = '' }) {
  return (
    <section className={`rounded-lg border border-stone-200 bg-white p-5 ${className}`}>
      {title && <h2 className="text-base font-semibold text-stone-900">{title}</h2>}
      {hint && <p className="mt-0.5 text-sm text-stone-500">{hint}</p>}
      <div className={title ? 'mt-3' : ''}>{children}</div>
    </section>
  )
}

export function CoverChip({ state }) {
  const c = COVER[simple(state)]
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-xs whitespace-nowrap text-stone-700">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} />
      {c.label}
    </span>
  )
}

const STATUS_STYLE = {
  not_started: 'border-stone-300 bg-white text-stone-600',
  in_progress: 'border-amber-300 bg-amber-50 text-amber-900',
  implemented: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  not_applicable: 'border-stone-300 bg-stone-100 text-stone-600',
}
export function StatusChip({ status }) {
  return (
    <span className={`inline-block shrink-0 rounded-full border px-2 py-0.5 text-xs whitespace-nowrap ${STATUS_STYLE[status]}`}>
      {STATUS[status]}
    </span>
  )
}

// One bar split into covered, partly covered, and not covered, with the numbers written out.
export function CoverBar({ row, compact = false }) {
  const t = tally(row)
  const total = t.covered + t.partly + t.none
  return (
    <div>
      <div className={`flex w-full gap-0.5 overflow-hidden rounded ${compact ? 'h-1.5' : 'h-3'}`} role="img"
        aria-label={`${t.covered} covered, ${t.partly} partly covered, ${t.none} not covered`}>
        {COVER_ORDER.map((k) => t[k] > 0 && (
          <span key={k} style={{ background: COVER[k].color, width: `${(t[k] / total) * 100}%`, minWidth: 3 }} />
        ))}
      </div>
      {!compact && (
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-stone-700">
          {COVER_ORDER.map((k) => (
            <li key={k} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COVER[k].color }} />
              <span className="font-medium tabular-nums">{t[k]}</span> {COVER[k].label.toLowerCase()}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// A row of choices where exactly one is active, used for simple filters.
export function Choices({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded-full border px-3 py-1 text-sm ${
            value === o.value ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-100'
          }`}
        >
          {o.label}{o.count !== undefined && <span className="ml-1.5 tabular-nums opacity-70">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}
