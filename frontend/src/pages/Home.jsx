import { Link } from 'react-router-dom'
import { Card, CoverBar, Notice, PageTitle, useApi } from '../ui'

export default function Home() {
  const { data, error, loading } = useApi('/dashboard/')
  if (!data) return <Notice error={error} loading={loading} />
  const uc = data.unified_controls
  const todo = [
    [uc.not_started, 'controls not started yet', '/controls?status=not_started'],
    [uc.in_progress, 'controls in progress', '/controls?status=in_progress'],
    [data.evidence.missing, 'evidence items still missing', '/controls'],
  ].filter(([n]) => n > 0)

  return (
    <>
      <PageTitle title="Home">
        This system keeps one set of security controls and shows which NCA ECC and ISO 27001 requirements
        each one satisfies, so every requirement is implemented and evidenced once.
      </PageTitle>
      <div className="flex flex-col gap-4">
        <Card title="Where we stand" hint="How many requirements of each framework our controls cover.">
          <div className="flex flex-col gap-5">
            {data.frameworks.map((f) => (
              <div key={f.id}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <Link to={`/frameworks/${f.id}`} className="font-medium underline">{f.name}</Link>
                  <span className="text-sm text-stone-500">{f.controls} requirements</span>
                </div>
                <CoverBar row={f} />
              </div>
            ))}
          </div>
        </Card>
        <Card title="What needs attention">
          {todo.length === 0 && <p className="text-sm text-stone-600">Nothing is waiting. Every control is implemented and evidenced.</p>}
          <ul className="flex flex-col divide-y divide-stone-100">
            {todo.map(([n, label, to]) => (
              <li key={label} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-10 text-right text-lg font-semibold tabular-nums">{n}</span>
                <span className="flex-1">{label}</span>
                <Link to={to} className="underline">Show</Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Where to go">
          <ul className="flex flex-col gap-2 text-sm">
            <li><Link to="/controls" className="font-medium underline">Our controls</Link>: the {uc.total} unified controls, grouped by domain and policy.</li>
            {data.frameworks.map((f) => (
              <li key={f.id}><Link to={`/frameworks/${f.id}`} className="font-medium underline">{f.name}</Link>: every requirement, in the order of the official document.</li>
            ))}
            <li><Link to="/gaps" className="font-medium underline">Gaps</Link>: requirements nothing covers yet.</li>
          </ul>
        </Card>
      </div>
    </>
  )
}
