import { Link, useParams } from 'react-router-dom'
import { Card, counts, CoverChip, Crumbs, Notice, PageTitle, RELATION, simple, StatusChip, useApi } from '../ui'

// One sentence that says where this requirement stands.
function verdict(c) {
  const state = simple(c.coverage)
  if (state === 'covered' && c.met) return 'Covered, and every control behind it is implemented. This requirement is met.'
  if (state === 'covered') return 'Covered by our controls, but not all of them are implemented yet.'
  if (state === 'partly') return 'Only part of this requirement is covered. Another control is needed for the rest.'
  if (c.mappings.length) return 'Not covered. The control listed below is related, but does not satisfy this requirement.'
  return 'Not covered. No control has been mapped to this requirement yet.'
}

export default function Requirement() {
  const { id } = useParams()
  const { data: c, error, loading } = useApi(`/framework-controls/${id}/`)
  if (!c) return <Notice error={error} loading={loading} />
  const chapter = c.subdomain || c.domain

  return (
    <>
      <Crumbs trail={[
        { label: c.framework, to: `/frameworks/${c.framework_id}` },
        { label: chapter },
        ...(c.parent_id ? [{ label: c.parent_ref, to: `/requirements/${c.parent_id}` }] : []),
        { label: c.control_ref },
      ]} />
      <PageTitle title={`${c.control_ref}${c.title ? ` ${c.title}` : ''}`} kicker={`${c.framework} requirement · ${chapter}`} />
      <div className="flex flex-col gap-4">
        <Card title="What it requires">
          <p className="text-sm leading-relaxed text-stone-800">{c.text.replace('[Paraphrase] ', '')}</p>
          {c.text.startsWith('[Paraphrase]') && (
            <p className="mt-2 text-xs text-stone-500">Summary in our own words. See the official standard for the exact wording.</p>
          )}
        </Card>

        <Card title="Where it stands">
          <div className="flex flex-wrap items-center gap-3">
            <CoverChip state={c.coverage} />
            <p className="text-sm text-stone-700">{verdict(c)}</p>
          </div>
        </Card>

        <Card title="Our controls for this requirement">
          {c.mappings.length === 0 && (
            <p className="text-sm text-stone-600">
              {c.children.length ? 'None directly. It is answered through the parts listed below.' : 'None yet.'}
            </p>
          )}
          <ul className="flex flex-col divide-y divide-stone-100">
            {c.mappings.map((m) => (
              <li key={m.unified_control_id} className="py-2.5 text-sm">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Link to={`/controls/${m.unified_control_id}`} className="font-medium underline">{m.title}</Link>
                  <span className={`text-xs ${counts(m.relationship) ? 'text-stone-800' : 'text-stone-500'}`}>{RELATION[m.relationship]}</span>
                  <span className="ml-auto"><StatusChip status={m.implementation_status} /></span>
                </div>
                <p className="mt-1 text-xs text-stone-500">Why: {m.rationale}</p>
              </li>
            ))}
          </ul>
        </Card>

        {c.children.length > 0 && (
          <Card title="Parts of this requirement">
            <ul className="flex flex-col divide-y divide-stone-100">
              {c.children.map((k) => (
                <li key={k.id}>
                  <Link to={`/requirements/${k.id}`} className="flex items-start gap-3 rounded-md px-2 py-2.5 text-sm hover:bg-stone-50">
                    <span className="w-16 shrink-0 font-medium">{k.control_ref}</span>
                    <span className="flex-1 text-stone-800">{k.text}</span>
                    <CoverChip state={k.coverage} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  )
}
