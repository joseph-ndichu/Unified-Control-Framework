import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ChevronRight, ChevronsDownUp, ChevronsUpDown, Download } from 'lucide-react'
import { downloadCsv, slug } from '../export'
import { Choices, COVER, COVER_ORDER, CoverBar, CoverChip, counts, Crumbs, Notice, PageTitle, RELATION, simple, STATUS, useApi } from '../ui'

// Raw counts in the shape CoverBar expects.
const summarize = (rows) => {
  const out = { full: 0, combined: 0, partial: 0, related_only: 0, gap: 0 }
  for (const r of rows) out[r.coverage] += 1
  return out
}

// One requirement line: its number, its wording, whether it is covered, and by what.
export function RequirementRow({ row, indent = false }) {
  const credited = row.covered_by.filter((c) => counts(c.relationship))
  return (
    <li className={indent ? 'ml-8 border-l border-stone-200' : ''}>
      <Link to={`/requirements/${row.id}`} className="row flex items-start gap-4 px-3 py-3 hover:bg-stone-50">
        <span className="w-16 shrink-0 font-mono text-[0.8125rem] font-medium text-signal-fg">{row.control_ref}</span>
        <span className="min-w-0 flex-1 text-sm">
          <span className="line-clamp-2 text-stone-800">{row.title || row.text.replace('[Paraphrase] ', '')}</span>
          {credited.length > 0 && (
            <span className="mt-0.5 block text-xs text-stone-500">{credited.length > 1 ? 'Our controls' : 'Our control'}: {credited.map((c) => c.title).join(', ')}</span>
          )}
        </span>
        <CoverChip state={row.coverage} />
      </Link>
    </li>
  )
}

export default function Framework() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const show = params.get('show') ?? ''
  const [all, setAll] = useState({ open: null, turn: 0 }) // "open all" or "close all" was pressed
  const meta = useApi('/meta/')
  const { data, error, loading } = useApi('/framework-controls/', { framework_id: id })
  const framework = meta.data?.frameworks.find((f) => String(f.id) === id)
  if (!data || !meta.data) return <Notice error={error || meta.error} loading={loading || meta.loading} />
  if (!framework) return <Notice error="This framework does not exist." />

  const matches = (r) => !show || simple(r.coverage) === show
  // Chapter (domain, then subdomain where the framework has them) > requirement > sub-requirements.
  const chapters = new Map()
  for (const r of data) {
    const key = r.subdomain || r.domain
    if (!chapters.has(key)) chapters.set(key, { name: key, part: r.subdomain ? r.domain : '', rows: [] })
    chapters.get(key).rows.push(r)
  }
  const kids = (parent) => data.filter((r) => r.parent_id === parent.id)
  const visible = [...chapters.values()].filter((ch) => ch.rows.some(matches))

  return (
    <>
      <Crumbs trail={[{ label: framework.name }]} />
      <PageTitle title={framework.name} kicker={`Framework · ${framework.version}`}>
        Every requirement of this framework, in the order of the official document. Open a chapter to see its
        requirements and which of our controls cover each one.
      </PageTitle>
      <div className="panel mb-5 p-5">
        <CoverBar row={summarize(data)} />
      </div>
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <Choices value={show} onChange={(v) => setParams(v ? { show: v } : {})} options={[
          { value: '', label: 'All', count: data.length },
          ...COVER_ORDER.map((k) => ({ value: k, label: COVER[k].label, count: data.filter((r) => simple(r.coverage) === k).length })),
        ]} />
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost" onClick={() => setAll({ open: true, turn: all.turn + 1 })}><ChevronsUpDown className="h-4 w-4" />Open all</button>
          <button className="btn btn-ghost" onClick={() => setAll({ open: false, turn: all.turn + 1 })}><ChevronsDownUp className="h-4 w-4" />Close all</button>
          <button className="btn" onClick={() => downloadCsv(`${slug(framework.name)}-coverage.csv`,
            ['Requirement', 'Chapter', 'Title', 'Text', 'Coverage', 'Our controls', 'How', 'Control status'],
            data.filter(matches).map((r) => [r.control_ref, r.subdomain || r.domain, r.title, r.text.replace('[Paraphrase] ', ''),
              COVER[simple(r.coverage)].label,
              r.covered_by.map((c) => `${c.code} ${c.title}`).join('; '),
              r.covered_by.map((c) => RELATION[c.relationship]).join('; '),
              r.covered_by.map((c) => STATUS[c.implementation_status]).join('; ')]))}>
            <Download className="h-4 w-4" />Export CSV
          </button>
        </div>
      </div>
      {visible.length === 0 && <p className="text-sm text-stone-600">No requirements match this filter.</p>}
      <div className="flex flex-col gap-3">
        {visible.map((ch) => {
          const done = ch.rows.filter((r) => simple(r.coverage) === 'covered').length
          return (
            // Open by default when filtering, or when the chapter has any coverage to show.
            <details key={ch.name + all.turn} open={all.open ?? (Boolean(show) || done > 0)} className="panel overflow-hidden">
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-stone-50">
                <ChevronRight aria-hidden="true" className="turn h-4 w-4 text-stone-500" />
                <span className="min-w-48 flex-1">
                  <span className="display font-semibold text-fg">{ch.name}</span>
                  {ch.part && <span className="mt-0.5 block text-xs text-stone-500">{ch.part}</span>}
                </span>
                <span className="w-24"><CoverBar row={summarize(ch.rows)} compact /></span>
                <span className="w-28 text-right font-mono text-xs text-stone-600 tabular-nums">{done} / {ch.rows.length} covered</span>
              </summary>
              <ul className="flex flex-col divide-y divide-stone-100 border-t border-line">
                {ch.rows.filter((r) => !r.parent_id).flatMap((r) => [
                  ...(matches(r) || kids(r).some(matches) ? [<RequirementRow key={r.id} row={r} />] : []),
                  ...kids(r).filter(matches).map((k) => <RequirementRow key={k.id} row={k} indent />),
                ])}
              </ul>
            </details>
          )
        })}
      </div>
    </>
  )
}
