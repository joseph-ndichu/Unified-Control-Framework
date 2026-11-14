import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Card, CoverBar, Notice, percent, Sections, tally, useApi } from '../ui'

// One headline figure with what it is out of, and a thin meter underneath.
function Tile({ label, value, of, note, to }) {
  return (
    <Link to={to} className="panel group block p-4 transition-colors hover:border-signal/60">
      <p className="label text-stone-500">{label}</p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="display text-2xl font-semibold tabular-nums">{value}</span>
        <span className="font-mono text-xs text-stone-500">/ {of}</span>
      </p>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-stone-100">
        <div className="h-full rounded-full bg-signal" style={{ width: `${percent(value, of)}%` }} />
      </div>
      <p className="mt-2.5 flex items-center justify-between text-xs text-stone-600">
        {note}
        <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 text-stone-500 transition-transform group-hover:translate-x-0.5 group-hover:text-signal-fg" />
      </p>
    </Link>
  )
}

export default function Home() {
  const { data, error, loading } = useApi('/dashboard/')
  useEffect(() => { document.title = 'Home · UCF Console' }, [])
  if (!data) return <Notice error={error} loading={loading} />
  const uc = data.unified_controls
  const total = data.frameworks.reduce((n, f) => n + f.controls, 0)
  const covered = data.frameworks.reduce((n, f) => n + tally(f).covered, 0)
  const missing = data.evidence.missing + data.evidence.expired // expired evidence must be collected again
  const todo = [
    [uc.not_started, 'controls not started yet', '/controls?status=not_started'],
    [uc.in_progress, 'controls in progress', '/controls?status=in_progress'],
    [missing, 'evidence items missing or expired', '/controls'],
  ].filter(([n]) => n > 0)

  return (
    <>
      <header className="mb-7">
        <p className="label mb-2 flex items-center gap-2 text-signal-fg">
          <span className="h-1.5 w-1.5 rounded-full bg-signal shadow-[0_0_8px_var(--color-signal)]" />Overview
        </p>
        <h1 className="display text-2xl leading-tight font-semibold sm:text-[1.75rem]">
          {uc.total} controls cover {covered} of {total} requirements
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
          One set of security controls, each written once and matched to the NCA ECC and ISO 27001 requirements
          it satisfies, so nothing is implemented or evidenced twice.
        </p>
      </header>

      <Sections>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Tile label="Requirements covered" value={covered} of={total} note={`${percent(covered, total)}% of both frameworks`} to="/gaps" />
          <Tile label="Controls implemented" value={uc.implemented} of={uc.total} note={`${uc.in_progress} in progress`} to="/controls" />
          <Tile label="Evidence collected" value={data.evidence.collected} of={data.evidence.total} note={`${missing} missing or expired`} to="/controls" />
          <Tile label="Controls with an owner" value={uc.total - (data.unowned ?? uc.total)} of={uc.total} note="Assigned to a person or team" to="/controls" />
        </div>

        <Card title="Coverage by framework">
          <div className="flex flex-col divide-y divide-stone-100">
            {data.frameworks.map((f) => (
              <div key={f.id} className="py-4 first:pt-0 last:pb-0">
                <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3">
                  <Link to={`/frameworks/${f.id}`} className="display font-semibold hover:text-signal-fg">{f.name}</Link>
                  <span className="font-mono text-xs text-stone-500">
                    <span className="text-sm font-medium text-signal-fg">{percent(tally(f).covered, f.controls)}%</span> covered · {f.controls} requirements
                  </span>
                </div>
                <CoverBar row={f} />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Needs attention">
          {todo.length === 0 && <p className="text-sm text-stone-600">Nothing is waiting. Every control is implemented and evidenced.</p>}
          <ul className="flex flex-col divide-y divide-stone-100">
            {todo.map(([n, label, to]) => (
              <li key={label}>
                <Link to={to} className="row group flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-stone-50">
                  <span className="w-9 text-right font-mono font-medium text-warn tabular-nums">{n}</span>
                  <span className="flex-1 text-stone-800">{label}</span>
                  <ArrowRight aria-hidden="true" className="h-4 w-4 text-stone-500 group-hover:text-signal-fg" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </Sections>
    </>
  )
}
