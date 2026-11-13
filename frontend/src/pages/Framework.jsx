import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Choices, COVER, COVER_ORDER, CoverBar, CoverChip, counts, Crumbs, Notice, PageTitle, simple, useApi } from '../ui'

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
    <li className={indent ? 'pl-6' : ''}>
      <Link to={`/requirements/${row.id}`} className="flex items-start gap-3 rounded-md px-2 py-2.5 hover:bg-stone-50">
        <span className="w-16 shrink-0 text-sm font-medium text-stone-900">{row.control_ref}</span>
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
      <div className="mb-5 rounded-lg border border-stone-200 bg-white p-5">
        <CoverBar row={summarize(data)} />
      </div>
      <div className="mb-4">
        <Choices value={show} onChange={(v) => setParams(v ? { show: v } : {})} options={[
          { value: '', label: 'All', count: data.length },
          ...COVER_ORDER.map((k) => ({ value: k, label: COVER[k].label, count: data.filter((r) => simple(r.coverage) === k).length })),
        ]} />
      </div>
      {visible.length === 0 && <p className="text-sm text-stone-600">No requirements match this filter.</p>}
      <div className="flex flex-col gap-2">
        {visible.map((ch) => {
          const done = ch.rows.filter((r) => simple(r.coverage) === 'covered').length
          return (
            // Open by default when filtering, or when the chapter has any coverage to show.
            <details key={ch.name} open={Boolean(show) || done > 0} className="rounded-lg border border-stone-200 bg-white">
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                <span className="min-w-48 flex-1">
                  <span className="font-medium text-stone-900">{ch.name}</span>
                  {ch.part && <span className="block text-xs text-stone-500">{ch.part}</span>}
                </span>
                <span className="w-24"><CoverBar row={summarize(ch.rows)} compact /></span>
                <span className="w-28 text-right text-sm text-stone-600 tabular-nums">{done} of {ch.rows.length} covered</span>
              </summary>
              <ul className="flex flex-col divide-y divide-stone-100 border-t border-stone-200 px-2 py-1">
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
