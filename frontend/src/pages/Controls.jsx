import { Link, useSearchParams } from 'react-router-dom'
import { Card, Choices, Crumbs, Notice, PageTitle, STATUS, STATUS_ORDER, StatusChip, useApi } from '../ui'

export default function Controls() {
  const [params, setParams] = useSearchParams()
  const domain = params.get('domain') ?? ''
  const status = params.get('status') ?? ''
  const { data, error, loading } = useApi('/unified-controls/', { domain })
  const setStatus = (value) => {
    const next = new URLSearchParams(params)
    if (value) next.set('status', value)
    else next.delete('status')
    setParams(next)
  }

  const all = data ?? []
  const shown = status ? all.filter((c) => c.implementation_status === status) : all
  // Domain > Policy > controls, the hierarchy of the framework.
  const tree = {}
  for (const c of shown) ((tree[c.domain] ??= {})[c.policy] ??= []).push(c)

  return (
    <>
      <Crumbs trail={domain ? [{ label: 'Our controls', to: '/controls' }, { label: domain }] : [{ label: 'Our controls' }]} />
      <PageTitle title={domain || 'Our controls'}>
        Each control below is written once and satisfies requirements in one or more frameworks. Open one to see which.
      </PageTitle>
      <div className="mb-4">
        <Choices value={status} onChange={setStatus} options={[
          { value: '', label: 'All', count: all.length },
          ...STATUS_ORDER.map((s) => ({ value: s, label: STATUS[s], count: all.filter((c) => c.implementation_status === s).length })),
        ]} />
      </div>
      <Notice error={error} loading={loading} />
      {data && shown.length === 0 && <p className="text-sm text-stone-600">No controls match this filter.</p>}
      <div className="flex flex-col gap-4">
        {Object.entries(tree).map(([domainName, policies]) => (
          <Card key={domainName} title={domainName} hint="Domain">
            {Object.entries(policies).map(([policy, controls]) => (
              <div key={policy} className="mt-2">
                <p className="text-sm font-medium text-stone-700">Policy: {policy}</p>
                <ul className="mt-1 flex flex-col divide-y divide-stone-100">
                  {controls.map((c) => (
                    <li key={c.id}>
                      <Link to={`/controls/${c.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-2 py-2.5 hover:bg-stone-50">
                        <span className="min-w-48 flex-1">
                          <span className="font-medium text-stone-900">{c.title}</span>
                          <span className="block text-xs text-stone-500">
                            {c.code} · satisfies {c.frameworks.join(' and ') || 'no framework yet'} · evidence {c.evidence_collected} of {c.evidence_total}
                          </span>
                        </span>
                        <span className="text-xs text-stone-500">{c.owner || 'No owner'}</span>
                        <StatusChip status={c.implementation_status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Card>
        ))}
      </div>
    </>
  )
}
