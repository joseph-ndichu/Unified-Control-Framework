import { Link } from 'react-router-dom'
import { Card, Crumbs, Sections, Notice, PageTitle, tally, useApi } from '../ui'
import { RequirementRow } from './Framework'

export default function Gaps() {
  const dash = useApi('/dashboard/')
  const partial = useApi('/framework-controls/', { coverage: 'partial' })
  if (!dash.data || !partial.data) return <Notice error={dash.error || partial.error} loading />
  const single = dash.data.single_framework_controls

  return (
    <>
      <Crumbs trail={[{ label: 'Gaps' }]} />
      <PageTitle title="Gaps">What our controls do not yet answer, and where the two frameworks differ.</PageTitle>
      <Sections>
        <Card title="Requirements not covered yet" hint="No control satisfies these requirements yet, not even in part.">
          <ul className="flex flex-col divide-y divide-stone-100">
            {dash.data.frameworks.map((f) => (
              <li key={f.id} className="flex items-baseline gap-4 py-3 text-sm">
                <span className="w-12 text-right font-mono text-base font-medium text-warn tabular-nums">{tally(f).none}</span>
                <span className="flex-1">of {f.controls} {f.name} requirements</span>
                <Link to={`/frameworks/${f.id}?show=none`} className="underline">Show them</Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Requirements only partly covered" hint="A control answers part of each of these. Something more is needed for the rest.">
          {partial.data.length === 0 && <p className="text-sm text-stone-600">None.</p>}
          <ul className="flex flex-col divide-y divide-stone-100">
            {partial.data.map((r) => <RequirementRow key={r.id} row={r} />)}
          </ul>
        </Card>

        <Card title="Controls only one framework asks for" hint="We keep these controls, but the other framework has no matching requirement.">
          {single.length === 0 && <p className="text-sm text-stone-600">None.</p>}
          <ul className="flex flex-col divide-y divide-stone-100">
            {single.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-3 py-3 text-sm">
                <Link to={`/controls/${c.id}`} className="flex-1 font-medium underline">{c.title}</Link>
                <span className="text-xs text-stone-500">Asked for by {c.required_by} only</span>
              </li>
            ))}
          </ul>
        </Card>
      </Sections>
    </>
  )
}
