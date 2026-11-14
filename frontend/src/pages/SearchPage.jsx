import { Link, useSearchParams } from 'react-router-dom'
import { Card, Crumbs, Sections, Notice, PageTitle, StatusChip, useApi } from '../ui'
import { RequirementRow } from './Framework'

export default function SearchPage() {
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').trim()
  const controls = useApi(q ? '/unified-controls/' : null, { search: q })
  const requirements = useApi(q ? '/framework-controls/' : null, { search: q })

  if (!q) {
    return (
      <>
        <Crumbs trail={[{ label: 'Search' }]} />
        <PageTitle title="Search">Type a word or a requirement number in the search box on the left, for example "password" or "A.5.15".</PageTitle>
      </>
    )
  }
  const ready = controls.data && requirements.data
  return (
    <>
      <Crumbs trail={[{ label: 'Search' }]} />
      <PageTitle title={`Results for "${q}"`}>
        {ready && `${controls.data.length} of our controls and ${requirements.data.length} framework requirements match.`}
      </PageTitle>
      {!ready && <Notice error={controls.error || requirements.error} loading />}
      {ready && (
        <Sections>
          <Card title={`Our controls (${controls.data.length})`}>
            {controls.data.length === 0 && <p className="text-sm text-stone-600">No controls match.</p>}
            <ul className="flex flex-col divide-y divide-stone-100">
              {controls.data.map((c) => (
                <li key={c.id}>
                  <Link to={`/controls/${c.id}`} className="row flex items-center gap-4 px-3 py-3 text-sm hover:bg-stone-50">
                    <span className="flex-1">
                      <span className="font-medium">{c.title}</span>
                      <span className="mt-0.5 block text-xs text-stone-500"><span className="font-mono text-signal-fg">{c.code}</span> · {c.domain}</span>
                    </span>
                    <StatusChip status={c.implementation_status} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card title={`Framework requirements (${requirements.data.length})`}>
            {requirements.data.length === 0 && <p className="text-sm text-stone-600">No requirements match.</p>}
            <ul className="flex flex-col divide-y divide-stone-100">
              {requirements.data.slice(0, 100).map((r) => (
                <li key={r.id} className="list-none">
                  <p className="px-3 pt-3 text-xs text-stone-500">{r.framework} · {r.subdomain || r.domain}</p>
                  <ul><RequirementRow row={r} /></ul>
                </li>
              ))}
            </ul>
            {requirements.data.length > 100 && <p className="mt-2 text-sm text-stone-500">Showing the first 100. Narrow the search to see fewer.</p>}
          </Card>
        </Sections>
      )}
    </>
  )
}
