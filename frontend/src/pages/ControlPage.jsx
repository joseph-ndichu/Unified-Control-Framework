import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { Card, counts, Crumbs, Flash, Sections, Notice, PageTitle, RELATION, STATUS, STATUS_ORDER, StatusChip, useApi } from '../ui'


const today = () => new Date().toISOString().slice(0, 10)
const isLink = (text) => /^https?:\/\//i.test(text)

// One piece of evidence: collected or not, when, and where it is kept.
function EvidenceItem({ item, isAdmin, send }) {
  const [where, setWhere] = useState(item.reference)
  const collected = item.status === 'collected'
  const path = `/evidence/${item.id}/`
  const name = item.description.charAt(0).toUpperCase() + item.description.slice(1)
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <label className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
        <input type="checkbox" checked={collected} disabled={!isAdmin}
          onChange={(e) => send(path,
            e.target.checked ? { status: 'collected', collected_on: today() } : { status: 'missing', collected_on: null },
            e.target.checked ? 'Marked as collected.' : 'Marked as missing.')} />
        <span className="flex-1">{name}</span>
        {collected && item.collected_on && <span className="font-mono text-xs text-stone-500">Collected {item.collected_on}</span>}
        {item.status === 'expired' && <span className="text-xs text-warn">Expired</span>}
      </label>
      {isAdmin ? (
        <form className="mt-2 ml-7 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(path, { reference: where.trim() }, 'Location saved.') }}>
          <input className="field min-w-0 flex-1 py-1.5 text-xs" value={where} maxLength={500}
            aria-label={`Where ${name} is kept`} placeholder="Where it is kept: a link or a folder"
            onChange={(e) => setWhere(e.target.value)} />
          {where.trim() !== item.reference && <button className="btn btn-ghost py-1">Save</button>}
        </form>
      ) : item.reference && (
        <p className="mt-1 ml-7 text-xs text-stone-600">
          Kept at: {isLink(item.reference)
            ? <a href={item.reference} target="_blank" rel="noreferrer" className="underline">{item.reference}</a>
            : item.reference}
        </p>
      )}
    </li>
  )
}

export default function ControlPage({ isAdmin }) {
  const { id } = useParams()
  const { data: c, error, loading, reload } = useApi(`/unified-controls/${id}/`)
  const [draft, setDraft] = useState(null) // unsaved owner and status
  const [message, setMessage] = useState(null)
  if (!c) return <Notice error={error} loading={loading} />

  const form = draft ?? { owner: c.owner, implementation_status: c.implementation_status }
  const send = (path, body, done) =>
    api(path, { method: 'PATCH', body })
      .then(() => { setMessage({ ok: true, text: done }); setDraft(null); reload() })
      .catch((e) => setMessage({ ok: false, text: e.message }))
  const frameworks = [...new Set(c.mappings.map((m) => m.framework))].sort()

  return (
    <>
      <Crumbs trail={[
        { label: 'Our controls', to: '/controls' },
        { label: c.domain, to: `/controls?domain=${encodeURIComponent(c.domain)}` },
        { label: c.title },
      ]} />
      <PageTitle title={c.title} kicker={`${c.code} · Policy: ${c.policy}`}>{c.statement}</PageTitle>
      <Flash message={message} />
      <Sections>
        <Card title="Owner and status">
          {isAdmin ? (
            <form className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => { e.preventDefault(); send(`/unified-controls/${id}/`, form, 'Saved.') }}>
              <label className="flex min-w-48 flex-1 flex-col gap-1.5 text-xs font-medium text-stone-600">
                Owner
                <input className="field" value={form.owner} placeholder="Person or team"
                  onChange={(e) => setDraft({ ...form, owner: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium text-stone-600">
                Status
                <select className="field" value={form.implementation_status}
                  onChange={(e) => setDraft({ ...form, implementation_status: e.target.value })}>
                  {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS[s]}</option>)}
                </select>
              </label>
              <button disabled={!draft} className="btn">Save</button>
            </form>
          ) : (
            <p className="flex flex-wrap items-center gap-3 text-sm">
              <span>Owner: <span className="font-medium">{c.owner || 'not assigned'}</span></span>
              <StatusChip status={c.implementation_status} />
              <span className="text-xs text-stone-500">Only admins can change these.</span>
            </p>
          )}
        </Card>

        <Card title="Requirements this control satisfies" hint="Implementing this control once answers all of the following.">
          {frameworks.map((name) => (
            <div key={name} className="mt-6 first:mt-0">
              <p className="display font-semibold">{name}</p>
              <ul className="mt-2 flex flex-col divide-y divide-stone-100 border-t border-stone-100">
                {c.mappings.filter((m) => m.framework === name).map((m) => (
                  <li key={m.framework_control_id} className="py-3.5 text-sm">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <Link to={`/requirements/${m.framework_control_id}`} className="font-medium underline">
                        <span className="font-mono">{m.control_ref}</span>{m.title ? ` ${m.title}` : ''}
                      </Link>
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${counts(m.relationship) ? 'border-signal/40 bg-signal/10 text-signal-fg' : 'border-stone-300 text-stone-500'}`}>{RELATION[m.relationship]}</span>
                    </div>
                    <p className="mt-1 text-stone-700">{m.text.replace('[Paraphrase] ', '')}</p>
                    <p className="mt-1 text-xs text-stone-500">Why: {m.rationale}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Card>

        <Card title="Evidence needed" hint={`${c.evidence_collected} of ${c.evidence_total} collected.`}>
          <ul className="flex flex-col divide-y divide-stone-100">
            {c.evidence.map((e) => <EvidenceItem key={e.id} item={e} isAdmin={isAdmin} send={send} />)}
          </ul>
        </Card>
      </Sections>
    </>
  )
}
