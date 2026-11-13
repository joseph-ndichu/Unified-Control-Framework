import { useState } from 'react'
import { api } from './api'
import { Card, Notice, Pill, RELATIONSHIP, Search, Select, STATUS_LABEL, useApi, useDebounced } from './ui'

const IMPLEMENTATION = ['not_started', 'in_progress', 'implemented', 'not_applicable']
const EVIDENCE = ['missing', 'collected', 'expired']
const input = 'rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm disabled:bg-stone-50 disabled:text-stone-600'

function Detail({ id, go, isAdmin, onChanged }) {
  const { data: c, error, loading, reload } = useApi(`/unified-controls/${id}/`)
  const [owner, setOwner] = useState(null) // null until the admin types
  const [saveError, setSaveError] = useState(null)
  if (!c) return <Card><Notice error={error} loading={loading} /></Card>

  const save = (path, body) =>
    api(path, { method: 'PATCH', body })
      .then(() => { setSaveError(null); setOwner(null); reload(); onChanged() })
      .catch((e) => setSaveError(e.message))
  const frameworks = [...new Set(c.mappings.map((m) => m.framework))].sort()

  return (
    <Card>
      <p className="text-xs text-stone-600">{c.domain} › {c.policy}</p>
      <h2 className="mt-1 text-lg font-semibold">{c.code} {c.title}</h2>
      <p className="mt-2 text-sm leading-relaxed">{c.statement}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
          Owner
          <div className="flex gap-2">
            <input
              className={input + ' min-w-0 flex-1 font-normal text-stone-900'}
              value={owner ?? c.owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder={isAdmin ? 'Person or team' : 'Not assigned'}
              disabled={!isAdmin}
            />
            {isAdmin && owner !== null && owner !== c.owner && (
              <button onClick={() => save(`/unified-controls/${id}/`, { owner })} className="rounded-md bg-stone-900 px-3 text-sm text-white">Save</button>
            )}
          </div>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
          Implementation status
          <select
            className={input + ' font-normal text-stone-900'}
            value={c.implementation_status}
            onChange={(e) => save(`/unified-controls/${id}/`, { implementation_status: e.target.value })}
            disabled={!isAdmin}
          >
            {IMPLEMENTATION.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </label>
      </div>
      {saveError && <p className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-800">{saveError}</p>}

      <h3 className="mt-5 mb-2 text-sm font-semibold">Mapped framework controls</h3>
      {frameworks.map((name) => (
        <div key={name} className="mb-3">
          <p className="mb-1 text-xs font-medium text-stone-600">{name}</p>
          <ul className="flex flex-col gap-2">
            {c.mappings.filter((m) => m.framework === name).map((m) => (
              <li key={m.framework_control_id} className="rounded-md border border-stone-200 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => go('framework', m.framework_control_id)} className="font-medium underline">{m.control_ref}</button>
                  <span className="flex-1">{m.title}</span>
                  <Pill title={RELATIONSHIP[m.relationship]}>{m.relationship}</Pill>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-700">{m.text}</p>
                <p className="mt-1.5 text-xs text-stone-500">Why: {m.rationale}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <h3 className="mt-5 mb-2 text-sm font-semibold">Required evidence</h3>
      <ul className="flex flex-col divide-y divide-stone-100 text-sm">
        {c.evidence.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-2 py-2">
            <span className="min-w-40 flex-1">{e.description}</span>
            {e.reference && <span className="text-xs text-stone-500">{e.reference}</span>}
            <select
              aria-label={`Status of ${e.description}`}
              className={input}
              value={e.status}
              onChange={(ev) => save(`/evidence/${e.id}/`, { status: ev.target.value })}
              disabled={!isAdmin}
            >
              {EVIDENCE.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </li>
        ))}
      </ul>
      {!isAdmin && <p className="mt-3 text-xs text-stone-500">Only admins can change owner, status, and evidence.</p>}
    </Card>
  )
}

export default function UnifiedControls({ selected, go, isAdmin }) {
  const [filters, setFilters] = useState({ domain: '', framework: '', status: '', search: '' })
  const set = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }))
  const params = { ...filters, search: useDebounced(filters.search) }
  const meta = useApi('/meta/')
  const list = useApi('/unified-controls/', params, [JSON.stringify(params)])

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="flex flex-col gap-4">
        <Card>
          <div className="flex flex-wrap items-end gap-3">
            <Select label="Domain" value={filters.domain} onChange={set('domain')} options={meta.data?.unified_domains ?? []} />
            <Select label="Framework" value={filters.framework} onChange={set('framework')} options={(meta.data?.frameworks ?? []).map((f) => f.name)} />
            <Select label="Status" value={filters.status} onChange={set('status')} options={IMPLEMENTATION.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} />
            <Search value={filters.search} onChange={set('search')} placeholder="Code, title, or statement" />
          </div>
        </Card>
        <Card>
          <p className="mb-2 text-xs text-stone-600">{list.data ? `${list.data.length} unified controls` : ''}</p>
          <Notice error={list.error} loading={!list.data && list.loading} empty={list.data?.length === 0 && 'No unified controls match these filters.'} />
          <ul className="flex flex-col divide-y divide-stone-100">
            {(list.data ?? []).map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => go('unified', c.id)}
                  className={`w-full px-2 py-2.5 text-left text-sm hover:bg-stone-50 ${selected === c.id ? 'bg-stone-100' : ''}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium whitespace-nowrap">{c.code}</span>
                    <span className="flex-1">{c.title}</span>
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-stone-600">
                    {c.frameworks.map((f) => <Pill key={f}>{f}</Pill>)}
                    <span className="ml-auto">{STATUS_LABEL[c.implementation_status]} · evidence {c.evidence_collected}/{c.evidence_total}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="lg:sticky lg:top-4 lg:self-start">
        {selected
          ? <Detail key={selected} id={selected} go={go} isAdmin={isAdmin} onChanged={list.reload} />
          : <Card><p className="text-sm text-stone-500">Select a unified control to see its framework mappings and evidence.</p></Card>}
      </div>
    </div>
  )
}
