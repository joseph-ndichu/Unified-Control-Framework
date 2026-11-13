import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { Card, counts, Crumbs, Notice, PageTitle, RELATION, STATUS, STATUS_ORDER, StatusChip, useApi } from '../ui'

const field = 'rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm'

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
      {message && (
        <p role="status" className={`mb-4 rounded-md p-2.5 text-sm ${message.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </p>
      )}
      <div className="flex flex-col gap-4">
        <Card title="Owner and status">
          {isAdmin ? (
            <form className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => { e.preventDefault(); send(`/unified-controls/${id}/`, form, 'Saved.') }}>
              <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-medium text-stone-600">
                Owner
                <input className={field} value={form.owner} placeholder="Person or team"
                  onChange={(e) => setDraft({ ...form, owner: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
                Status
                <select className={field} value={form.implementation_status}
                  onChange={(e) => setDraft({ ...form, implementation_status: e.target.value })}>
                  {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS[s]}</option>)}
                </select>
              </label>
              <button disabled={!draft} className="rounded-md bg-stone-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40">Save</button>
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
            <div key={name} className="mt-3 first:mt-0">
              <p className="text-sm font-medium text-stone-700">{name}</p>
              <ul className="mt-1 flex flex-col divide-y divide-stone-100">
                {c.mappings.filter((m) => m.framework === name).map((m) => (
                  <li key={m.framework_control_id} className="py-2.5 text-sm">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <Link to={`/requirements/${m.framework_control_id}`} className="font-medium underline">
                        {m.control_ref}{m.title ? ` ${m.title}` : ''}
                      </Link>
                      <span className={`text-xs ${counts(m.relationship) ? 'text-stone-800' : 'text-stone-500'}`}>{RELATION[m.relationship]}</span>
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
          <ul className="flex flex-col gap-2">
            {c.evidence.map((e) => (
              <li key={e.id}>
                <label className="flex items-center gap-2.5 text-sm">
                  <input type="checkbox" className="h-4 w-4" checked={e.status === 'collected'} disabled={!isAdmin}
                    onChange={(ev) => send(`/evidence/${e.id}/`, { status: ev.target.checked ? 'collected' : 'missing' },
                      ev.target.checked ? 'Marked as collected.' : 'Marked as missing.')} />
                  <span>{e.description.charAt(0).toUpperCase() + e.description.slice(1)}</span>
                  {e.status === 'expired' && <span className="text-xs text-amber-800">Expired</span>}
                </label>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
