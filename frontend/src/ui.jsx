// Shared wording and small building blocks. The visual language lives in index.css.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { api } from './api'

// The API has five coverage states. People only need three.
export const COVER = {
  covered: { label: 'Covered', bar: 'bg-signal' },
  partly: { label: 'Partly covered', bar: 'bg-warn' },
  none: { label: 'Not covered', bar: '' },
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
export const percent = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0)

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
  if (error) return <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
  if (loading) {
    return (
      <p className="label flex items-center gap-2 p-3 text-stone-500">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal" />Loading
      </p>
    )
  }
  return null
}

// Confirmation or failure after saving.
export function Flash({ message }) {
  if (!message) return null
  return (
    <p role="status" className={`mb-5 flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-sm ${
      message.ok ? 'border-signal/40 bg-signal/10 text-fg' : 'border-destructive/40 bg-destructive/10 text-destructive'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${message.ok ? 'bg-signal' : 'bg-destructive'}`} />
      {message.text}
    </p>
  )
}

// "Home > Our controls > Access Management". The last item is the current page.
export function Crumbs({ trail }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-stone-500">
      <Link to="/" className="hover:text-signal-fg">Home</Link>
      {trail.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 opacity-60" />
          {item.to ? <Link to={item.to} className="hover:text-signal-fg">{item.label}</Link> : <span className="text-stone-800">{item.label}</span>}
        </span>
      ))}
    </nav>
  )
}

export function PageTitle({ title, kicker, tab, children }) {
  // Name the browser tab after the page, so history and bookmarks make sense.
  const name = tab ?? (typeof title === 'string' ? title : '')
  useEffect(() => { document.title = name ? `${name} · UCF Console` : 'UCF Console' }, [name])
  return (
    <header className="mb-7">
      {kicker && <p className="label mb-2 text-signal-fg">{kicker}</p>}
      <h1 className="display text-2xl leading-tight font-semibold text-fg sm:text-[1.75rem]">{title}</h1>
      {children && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">{children}</p>}
    </header>
  )
}

// A stack of panels with even spacing.
export function Sections({ children }) {
  return <div className="flex flex-col gap-5">{children}</div>
}

export function Card({ title, hint, children, className = '' }) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-head">
          <h2 className="label font-medium text-stone-800">{title}</h2>
        </div>
      )}
      <div className="px-5 py-4">
        {hint && <p className="mb-3 text-sm text-stone-600">{hint}</p>}
        {children}
      </div>
    </section>
  )
}

// The small square that says how well a requirement is covered: solid, hatched, or empty.
export function Mark({ kind, className = '' }) {
  return <span aria-hidden="true" className={`inline-block h-2.5 w-2.5 shrink-0 rounded-[3px] border cov-${kind} ${className}`} />
}

export function CoverChip({ state }) {
  const kind = simple(state)
  const tone = { covered: 'text-signal-fg', partly: 'text-warn', none: 'text-stone-500' }[kind]
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 text-xs whitespace-nowrap ${tone}`}>
      <Mark kind={kind} />
      {COVER[kind].label}
    </span>
  )
}

const STATUS_STYLE = {
  not_started: ['border-stone-300 text-stone-600', 'bg-stone-500'],
  in_progress: ['border-warn/40 bg-warn/10 text-warn', 'bg-warn'],
  implemented: ['border-signal/40 bg-signal/10 text-signal-fg', 'bg-signal'],
  not_applicable: ['border-stone-200 text-stone-500', 'bg-stone-300'],
}
// Status as a pill with an indicator light.
export function StatusChip({ status }) {
  const [box, dot] = STATUS_STYLE[status]
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs whitespace-nowrap ${box}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {STATUS[status]}
    </span>
  )
}

// One bar split into covered (mint), partly covered (amber), and not covered (the empty track).
export function CoverBar({ row, compact = false }) {
  const t = tally(row)
  const total = t.covered + t.partly + t.none
  return (
    <div>
      <div className={`flex w-full gap-0.5 overflow-hidden rounded-full bg-stone-100 ${compact ? 'h-1.5' : 'h-2'}`} role="img"
        aria-label={`${t.covered} covered, ${t.partly} partly covered, ${t.none} not covered`}>
        {['covered', 'partly'].map((k) => t[k] > 0 && (
          <span key={k} className={`rounded-full ${COVER[k].bar}`} style={{ width: `${(t[k] / total) * 100}%`, minWidth: 4 }} />
        ))}
      </div>
      {!compact && (
        <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-stone-600">
          {COVER_ORDER.map((k) => (
            <li key={k} className="flex items-center gap-1.5">
              <Mark kind={k} />
              <span className="font-mono font-medium text-fg tabular-nums">{t[k]}</span> {COVER[k].label.toLowerCase()}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// A segmented control where exactly one choice is active, used for simple filters.
export function Choices({ value, onChange, options }) {
  return (
    <div className="inline-flex flex-wrap gap-0.5 rounded-lg border border-line bg-surface p-0.5" role="group">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded-md px-2.5 py-1 text-[0.8125rem] transition-colors ${
            value === o.value ? 'bg-stone-100 font-medium text-fg shadow-[inset_0_0_0_1px_var(--color-stone-300)]' : 'text-stone-600 hover:text-fg'
          }`}
        >
          {o.label}{o.count !== undefined && <span className={`ml-1.5 font-mono text-xs tabular-nums ${value === o.value ? 'text-signal-fg' : 'text-stone-500'}`}>{o.count}</span>}
        </button>
      ))}
    </div>
  )
}
