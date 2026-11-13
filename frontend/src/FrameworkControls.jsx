import { useState } from 'react'
import { Card, COVERAGE, COVERAGE_ORDER, CoverageBadge, Notice, Pill, RELATIONSHIP, Search, Select, STATUS_LABEL, useApi, useDebounced } from './ui'

function Detail({ id, go, onSelect }) {
  const { data: c, error, loading } = useApi(`/framework-controls/${id}/`)
  if (!c) return <Card><Notice error={error} loading={loading} /></Card>
  return (
    <Card>
      <p className="text-xs text-stone-600">{c.framework} · {c.subdomain || c.domain}</p>
      <h2 className="mt-1 text-lg font-semibold">{c.control_ref}{c.title ? ` ${c.title}` : ''}</h2>
      <div className="mt-2 flex items-center gap-3">
        <CoverageBadge state={c.coverage} />
        <span className="text-xs text-stone-600">{c.met ? 'Met: all covering controls are implemented' : 'Not yet met'}</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed">{c.text}</p>

      <h3 className="mt-5 mb-2 text-sm font-semibold">Covered by these unified controls</h3>
      {c.mappings.length === 0 && (
        <p className="text-sm text-stone-500">
          {c.children.length ? 'No direct mapping. Coverage comes from the subcontrols below.' : 'Nothing maps to this control yet.'}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {c.mappings.map((m) => (
          <li key={m.unified_control_id} className="rounded-md border border-stone-200 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => go('unified', m.unified_control_id)} className="font-medium underline">{m.code}</button>
              <span className="flex-1">{m.title}</span>
              <Pill title={RELATIONSHIP[m.relationship]}>{m.relationship}</Pill>
              <Pill>{STATUS_LABEL[m.implementation_status]}</Pill>
            </div>
            <p className="mt-1.5 text-xs text-stone-600">{m.rationale}</p>
          </li>
        ))}
      </ul>

      {c.children.length > 0 && (
        <>
          <h3 className="mt-5 mb-2 text-sm font-semibold">Subcontrols</h3>
          <ul className="flex flex-col divide-y divide-stone-100 text-sm">
            {c.children.map((k) => (
              <li key={k.id} className="flex items-start gap-3 py-2">
                <button onClick={() => onSelect(k.id)} className="font-medium whitespace-nowrap underline">{k.control_ref}</button>
                <span className="flex-1">{k.text}</span>
                <CoverageBadge state={k.coverage} />
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}

export default function FrameworkControls({ selected, go }) {
  const [filters, setFilters] = useState({ framework: '', domain: '', coverage: '', search: '' })
  const set = (key) => (value) => setFilters((f) => ({ ...f, [key]: value, ...(key === 'framework' ? { domain: '' } : {}) }))
  const search = useDebounced(filters.search)
  const params = { framework: filters.framework, subdomain: filters.domain.startsWith('s:') ? filters.domain.slice(2) : '',
    domain: filters.domain.startsWith('d:') ? filters.domain.slice(2) : '', coverage: filters.coverage, search }
  const meta = useApi('/meta/')
  const list = useApi('/framework-controls/', params, [JSON.stringify(params)])

  // Domain menu: subdomains where the framework has them (NCA), otherwise the domains themselves (ISO).
  const domains = (meta.data?.frameworks ?? [])
    .filter((f) => !filters.framework || f.name === filters.framework)
    .flatMap((f) => f.domains.flatMap((d) =>
      d.subdomains.length ? d.subdomains.map((s) => ({ value: 's:' + s, label: s })) : [{ value: 'd:' + d.name, label: d.name }]))

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="flex flex-col gap-4">
        <Card>
          <div className="flex flex-wrap items-end gap-3">
            <Select label="Framework" value={filters.framework} onChange={set('framework')} options={(meta.data?.frameworks ?? []).map((f) => f.name)} />
            <Select label="Domain" value={filters.domain} onChange={set('domain')} options={domains} />
            <Select label="Coverage" value={filters.coverage} onChange={set('coverage')} options={COVERAGE_ORDER.map((s) => ({ value: s, label: COVERAGE[s].label }))} />
            <Search value={filters.search} onChange={set('search')} placeholder="Control ID, title, or text" />
          </div>
        </Card>
        <Card>
          <p className="mb-2 text-xs text-stone-600">{list.data ? `${list.data.length} controls` : ''}</p>
          <Notice error={list.error} loading={!list.data && list.loading} empty={list.data?.length === 0 && 'No controls match these filters.'} />
          <ul className="flex max-h-[70vh] flex-col divide-y divide-stone-100 overflow-y-auto">
            {(list.data ?? []).map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => go('framework', c.id)}
                  className={`flex w-full items-start gap-3 px-2 py-2 text-left text-sm hover:bg-stone-50 ${selected === c.id ? 'bg-stone-100' : ''} ${c.parent_ref ? 'pl-6' : ''}`}
                >
                  <span className="w-16 shrink-0 font-medium">{c.control_ref}</span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2">{c.title || c.text}</span>
                    <span className="text-xs text-stone-500">{c.framework} · {c.subdomain || c.domain}</span>
                  </span>
                  <CoverageBadge state={c.coverage} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="lg:sticky lg:top-4 lg:self-start">
        {selected
          ? <Detail key={selected} id={selected} go={go} onSelect={(id) => go('framework', id)} />
          : <Card><p className="text-sm text-stone-500">Select a control to see which unified controls cover it.</p></Card>}
      </div>
    </div>
  )
}
