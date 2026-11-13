import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, COVERAGE, COVERAGE_ORDER, Notice, STATUS_LABEL, useApi } from './ui'

const percent = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0)

function Stat({ label, value, note }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <p className="text-xs font-medium text-stone-600">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs text-stone-500">{note}</p>}
    </div>
  )
}

function CoverageTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-md border border-stone-200 bg-white p-3 text-xs shadow-md">
      <p className="mb-1.5 font-semibold">{row.name} · {row.controls} controls</p>
      {COVERAGE_ORDER.map((s) => (
        <p key={s} className="flex items-center gap-2 tabular-nums">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COVERAGE[s].color }} />
          <span className="flex-1">{COVERAGE[s].label}</span>
          <span>{row[s]} ({percent(row[s], row.controls)}%)</span>
        </p>
      ))}
    </div>
  )
}

function Legend() {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-700">
      {COVERAGE_ORDER.map((s) => (
        <li key={s} className="flex items-center gap-1.5" title={COVERAGE[s].help}>
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COVERAGE[s].color }} />
          {COVERAGE[s].label}
        </li>
      ))}
    </ul>
  )
}

export default function Dashboard({ go }) {
  const { data, error, loading } = useApi('/dashboard/')
  const [allRows, setAllRows] = useState(false)
  if (!data) return <Notice error={error} loading={loading} />

  const uc = data.unified_controls
  const groups = data.frameworks.flatMap((f) => f.groups.map((g) => ({ ...g, framework: f.name })))
  const shown = allRows ? groups : groups.filter((g) => g.gap < g.controls)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Unified controls" value={uc.total} note={`${uc.implemented} implemented`} />
        <Stat
          label="Source controls mapped"
          value={data.source_controls}
          note={`of ${data.frameworks.reduce((n, f) => n + f.controls, 0)} across ${data.frameworks.length} frameworks`}
        />
        <Stat
          label="Evidence collected"
          value={`${data.evidence.collected}/${data.evidence.total}`}
          note={`${data.evidence.missing} missing, ${data.evidence.expired} expired`}
        />
        <Stat
          label="Controls for one framework only"
          value={data.single_framework_controls.length}
          note="Not required by the other framework"
        />
      </div>

      <Card title="Coverage by framework">
        <p className="-mt-2 mb-2 text-xs text-stone-500">
          Share of each framework's controls that the unified controls cover.
        </p>
        <ResponsiveContainer width="100%" height={data.frameworks.length * 52 + 40}>
          <BarChart data={data.frameworks} layout="vertical" stackOffset="expand" barSize={24} margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} stroke="#e1e0d9" />
            <XAxis
              type="number"
              tickFormatter={(v) => `${Math.round(v * 100)}%`}
              tick={{ fontSize: 12, fill: '#52514e' }}
              axisLine={{ stroke: '#c3c2b7' }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tick={{ fontSize: 12, fill: '#0b0b0b' }}
              axisLine={{ stroke: '#c3c2b7' }}
              tickLine={false}
            />
            <Tooltip content={<CoverageTooltip />} cursor={{ fill: 'rgba(11,11,11,0.04)' }} />
            {COVERAGE_ORDER.map((s) => (
              <Bar key={s} dataKey={s} stackId="coverage" fill={COVERAGE[s].color} stroke="#ffffff" strokeWidth={2} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <Legend />
      </Card>

      <Card title="Coverage by domain">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 text-xs text-stone-600">
              <tr>
                <th className="py-2 pr-3 font-medium">Framework</th>
                <th className="py-2 pr-3 font-medium">Domain</th>
                <th className="py-2 pr-3 text-right font-medium">Controls</th>
                {COVERAGE_ORDER.map((s) => (
                  <th key={s} className="py-2 pr-3 text-right font-medium">{COVERAGE[s].label}</th>
                ))}
                <th className="py-2 text-right font-medium" title="Covered, and every unified control behind it is implemented">Met</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((g) => (
                <tr key={g.framework + g.domain + g.subdomain} className="border-b border-stone-100">
                  <td className="py-2 pr-3 whitespace-nowrap">{g.framework}</td>
                  <td className="py-2 pr-3">{g.subdomain || g.domain}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{g.controls}</td>
                  {COVERAGE_ORDER.map((s) => (
                    <td key={s} className={`py-2 pr-3 text-right tabular-nums ${g[s] ? '' : 'text-stone-300'}`}>{g[s]}</td>
                  ))}
                  <td className="py-2 text-right tabular-nums">{g.met}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={() => setAllRows(!allRows)} className="mt-3 text-sm text-stone-600 underline hover:text-stone-900">
          {allRows ? 'Show only domains with coverage' : `Show all ${groups.length} domains`}
        </button>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Implementation status of unified controls">
          <ul className="flex flex-col gap-2 text-sm">
            {['implemented', 'in_progress', 'not_started', 'not_applicable'].map((s) => (
              <li key={s} className="flex items-center gap-3">
                <span className="w-28 text-stone-700">{STATUS_LABEL[s]}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
                  <span className="block h-full rounded-full bg-[#256abf]" style={{ width: `${percent(uc[s], uc.total)}%` }} />
                </span>
                <span className="w-6 text-right tabular-nums">{uc[s]}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Unified controls required by one framework only">
          {data.single_framework_controls.length === 0 && <p className="text-sm text-stone-500">None.</p>}
          <ul className="flex flex-col divide-y divide-stone-100 text-sm">
            {data.single_framework_controls.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2">
                <button onClick={() => go('unified', c.id)} className="font-medium underline">{c.code}</button>
                <span className="flex-1">{c.title}</span>
                <span className="text-xs text-stone-600">{c.required_by} only</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
