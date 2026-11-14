import { Link, useSearchParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { downloadCsv } from '../export'
import { Card, Choices, Sections, Crumbs, Notice, PageTitle, STATUS, STATUS_ORDER, StatusChip, useApi } from '../ui'

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
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <Choices value={status} onChange={setStatus} options={[
          { value: '', label: 'All', count: all.length },
          ...STATUS_ORDER.map((s) => ({ value: s, label: STATUS[s], count: all.filter((c) => c.implementation_status === s).length })),
        ]} />
        <button className="btn" disabled={shown.length === 0} onClick={() => downloadCsv('ucf-controls.csv',
          ['Code', 'Control', 'Domain', 'Policy', 'Statement', 'Owner', 'Status', 'Satisfies', 'Evidence collected', 'Evidence needed'],
          shown.map((c) => [c.code, c.title, c.domain, c.policy, c.statement, c.owner, STATUS[c.implementation_status],
            c.frameworks.join('; '), c.evidence_collected, c.evidence_total]))}>
          <Download className="h-4 w-4" />Export CSV
        </button>
      </div>
      <Notice error={error} loading={loading} />
      {data && shown.length === 0 && <p className="text-sm text-stone-600">No controls match this filter.</p>}
      <Sections>
        {Object.entries(tree).map(([domainName, policies]) => (
          <Card key={domainName} title={`Domain: ${domainName}`}>
            {Object.entries(policies).map(([policy, controls]) => (
              <div key={policy}>
                <p className="display font-semibold">{policy}</p>
                <p className="label mt-1 text-stone-500">Policy · {controls.length} controls</p>
                <ul className="mt-3 flex flex-col divide-y divide-stone-100 border-t border-stone-100">
                  {controls.map((c) => (
                    <li key={c.id}>
                      <Link to={`/controls/${c.id}`} className="row flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-3 hover:bg-stone-50">
                        <span className="min-w-48 flex-1">
                          <span className="font-medium text-stone-900">{c.title}</span>
                          <span className="mt-0.5 block text-xs text-stone-500">
                            <span className="font-mono text-signal-fg">{c.code}</span> · satisfies {c.frameworks.join(' and ') || 'no framework yet'} · evidence {c.evidence_collected} of {c.evidence_total}
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
      </Sections>
    </>
  )
}
