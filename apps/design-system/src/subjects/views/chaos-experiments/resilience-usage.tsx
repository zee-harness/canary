import { CSSProperties, ReactNode, useState } from 'react'

import type { ColumnDef } from '@tanstack/react-table'

import { Alert, Button, DataTable, IconV2, LogoV2, StatusBadge, Switch, Tag, Text } from '@harnessio/ui/components'
import { SandboxLayout } from '@harnessio/views'

/* -------------------------------------------------------------------------- */
/* Layout primitives                                                          */
/* -------------------------------------------------------------------------- */

interface PanelProps {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  style?: CSSProperties
}

/** Bordered dashboard section with an optional title / description / right-aligned actions. */
const Panel = ({ title, description, actions, children, style }: PanelProps) => (
  <section className="border-cn-2 bg-cn-1 border" style={{ padding: 20, borderRadius: 16, ...style }}>
    {(title || actions) && (
      <div className="flex items-start justify-between" style={{ gap: 16, marginBottom: 16 }}>
        <div className="flex flex-col" style={{ gap: 2 }}>
          {title && (
            <Text as="h2" variant="heading-small">
              {title}
            </Text>
          )}
          {description && (
            <Text color="foreground-3" variant="caption-normal">
              {description}
            </Text>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center">{actions}</div>}
      </div>
    )}
    {children}
  </section>
)

/** A titled sub-block inside a panel (used for the multi-chart panels). */
const Block = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="flex flex-col" style={{ gap: 10 }}>
    <Text variant="body-strong" color="foreground-1">
      {title}
    </Text>
    {children}
  </div>
)

/* -------------------------------------------------------------------------- */
/* Lightweight charts (no chart lib in the design system, so hand-rolled SVG) */
/* -------------------------------------------------------------------------- */

const CHART_PRIMARY = 'var(--cn-set-orange-primary-bg)'
const CHART_MUTED = 'var(--cn-border-3)'

/** Minimal line chart. `secondary` renders as a dashed reference line (e.g. a p95 gate). */
const LineChart = ({
  data,
  secondary,
  height = 128
}: {
  data: number[]
  secondary?: number[]
  height?: number
}) => {
  const W = 600
  const H = height
  const pad = 10
  const all = secondary ? [...data, ...secondary] : data
  const min = Math.min(...all)
  const max = Math.max(...all)
  const span = max - min || 1
  const toPoints = (arr: number[]) =>
    arr
      .map((v, i) => {
        const x = (i / (arr.length - 1)) * W
        const y = H - pad - ((v - min) / span) * (H - pad * 2)
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height }} role="img">
      <polyline
        points={toPoints(data)}
        fill="none"
        stroke={CHART_PRIMARY}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {secondary && (
        <polyline
          points={toPoints(secondary)}
          fill="none"
          stroke={CHART_MUTED}
          strokeWidth={2}
          strokeDasharray="5 5"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  )
}

/** Simple vertical-bar histogram. */
const Histogram = ({ bins, height = 128 }: { bins: number[]; height?: number }) => {
  const max = Math.max(...bins, 1)
  return (
    <div className="flex items-end" style={{ gap: 4, height }}>
      {bins.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm"
          style={{ height: `${(v / max) * 100}%`, backgroundColor: CHART_PRIMARY, opacity: 0.85 }}
        />
      ))}
    </div>
  )
}

/** Horizontal labelled bars, sorted biggest-first by the caller. */
const HBars = ({ items, unit }: { items: { label: string; value: number }[]; unit?: string }) => {
  const max = Math.max(...items.map(i => i.value), 1)
  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      {items.map(item => (
        <div key={item.label} className="flex items-center" style={{ gap: 10 }}>
          <div style={{ width: 168 }} className="shrink-0">
            <Text variant="caption-normal" color="foreground-2" truncate>
              {item.label}
            </Text>
          </div>
          <div className="bg-cn-2 h-2 flex-1 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full"
              style={{ width: `${(item.value / max) * 100}%`, backgroundColor: CHART_PRIMARY }}
            />
          </div>
          <div style={{ width: 80 }} className="shrink-0 text-right">
            <Text variant="caption-normal" color="foreground-3">
              {item.value}
              {unit ? ` ${unit}` : ''}
            </Text>
          </div>
        </div>
      ))}
    </div>
  )
}

interface Segment {
  label: string
  value: number
  color: string
}

/** Single stacked horizontal bar with a legend underneath. */
const StackedBar = ({ segments }: { segments: Segment[] }) => {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1
  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      <div className="bg-cn-2 flex h-3 w-full overflow-hidden rounded-full">
        {segments.map(seg => (
          <div key={seg.label} style={{ width: `${(seg.value / total) * 100}%`, backgroundColor: seg.color }} />
        ))}
      </div>
      <div className="flex flex-wrap" style={{ gap: '6px 16px' }}>
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center" style={{ gap: 6 }}>
            <span className="rounded-sm" style={{ width: 10, height: 10, backgroundColor: seg.color }} />
            <Text variant="caption-normal" color="foreground-2">
              {seg.label}
            </Text>
            <Text variant="caption-normal" color="foreground-3">
              {Math.round((seg.value / total) * 100)}%
            </Text>
          </div>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Data (illustrative — this is a mockup, numbers are not real account data)  */
/* -------------------------------------------------------------------------- */

const HERO_STATS: { value: string; label: string; sub?: string; accent?: 'danger' | 'success' | 'brand' }[] = [
  { value: '342', label: 'CD pipelines in account', sub: '1,194 services' },
  { value: '18%', label: 'RT reach — pipelines with ≥1 scan', sub: '63 / 342', accent: 'danger' },
  { value: '64%', label: 'of scanned pipelines have low-risk gates', accent: 'success' },
  { value: '23', label: 'net-new services with an untested infra', sub: 'added in the last 90 days' }
]

type PipelineRisk = 'high' | 'medium' | 'low'

interface PipelineRow {
  id: string
  pipeline: string
  team: string
  cluster: string
  riskScore: number
  risk: PipelineRisk
  fail: number
  pass: number
  info: number
  maturity: string
  lastScanned: string
}

const PIPELINES: PipelineRow[] = [
  { id: 'p1', pipeline: 'deploy-core-banking', team: 'core-banking', cluster: 'eks-admin-prod', riskScore: 90, risk: 'high', fail: 6, pass: 4, info: 2, maturity: 'L3', lastScanned: '2d ago' },
  { id: 'p2', pipeline: 'cash-services-release', team: 'cash-services', cluster: 'eks-admin-prod', riskScore: 61, risk: 'medium', fail: 3, pass: 8, info: 1, maturity: 'L2', lastScanned: '4d ago' },
  { id: 'p3', pipeline: 'fx-gateway-canary', team: 'fx-gateway', cluster: 'gke-payments', riskScore: 48, risk: 'medium', fail: 2, pass: 9, info: 3, maturity: 'L2', lastScanned: '9d ago' },
  { id: 'p4', pipeline: 'ledger-svc-deploy', team: 'ledger-svc', cluster: 'eks-admin-prod', riskScore: 22, risk: 'low', fail: 0, pass: 11, info: 2, maturity: 'L4', lastScanned: '1d ago' },
  { id: 'p5', pipeline: 'settlements-batch', team: 'settlements', cluster: 'aks-emea-prod', riskScore: 74, risk: 'high', fail: 5, pass: 5, info: 0, maturity: 'L1', lastScanned: '15d ago' },
  { id: 'p6', pipeline: 'mesh-core-rollout', team: 'mesh-core', cluster: 'gke-platform', riskScore: 35, risk: 'low', fail: 1, pass: 10, info: 4, maturity: 'L3', lastScanned: '3d ago' }
]

const riskTheme: Record<PipelineRisk, 'danger' | 'warning' | 'success'> = {
  high: 'danger',
  medium: 'warning',
  low: 'success'
}

interface CoverageOrg {
  org: string
  teams: { name: string; pct: number }[]
}

const COVERAGE: CoverageOrg[] = [
  {
    org: 'sub-payments',
    teams: [
      { name: 'core-banking', pct: 66 },
      { name: 'cash-services', pct: 58 },
      { name: 'fx-gateway', pct: 12 },
      { name: 'settlements', pct: 0 },
      { name: 'trace-collect', pct: 0 },
      { name: 'ledger-svc', pct: 0 }
    ]
  },
  {
    org: 'core-platform',
    teams: [
      { name: 'mesh-core', pct: 84 },
      { name: 'infra-tools', pct: 41 },
      { name: 'data-plane', pct: 22 },
      { name: 'edge-svc', pct: 8 }
    ]
  },
  {
    org: 'sub-platform',
    teams: [
      { name: 'observability', pct: 33 },
      { name: 'ci-runners', pct: 19 },
      { name: 'secrets', pct: 5 }
    ]
  }
]

const COVERAGE_BUCKETS = [
  { label: '0%', min: 0 },
  { label: '1–25%', min: 1 },
  { label: '26–50%', min: 26 },
  { label: '51–75%', min: 51 },
  { label: '76–90%', min: 76 }
]

/** Shade a coverage cell green in proportion to its percentage; 0% reads as an empty gray. */
const coverageCellStyle = (pct: number): CSSProperties =>
  pct === 0
    ? { backgroundColor: 'var(--cn-bg-2)' }
    : { backgroundColor: `color-mix(in srgb, var(--cn-set-success-primary-bg) ${25 + pct * 0.7}%, var(--cn-bg-2))` }

const MATURITY_FUNNEL = [
  { label: 'Detected', value: 158 },
  { label: 'Suggested', value: 64 },
  { label: 'Running', value: 22 },
  { label: 'Continuous / auto', value: 9 }
]

const INFRA_STATS = [
  { value: '46', label: 'Kubernetes clusters' },
  { value: '12', label: 'VM / bare-metal groups' },
  { value: '8', label: 'serverless targets' },
  { value: 'AWS 31 · Azure 18 · GCP 9', label: 'by cloud provider' }
]

const FLAGS: { theme: 'warning' | 'info' | 'success'; title: string; description: string }[] = [
  {
    theme: 'warning',
    title: "16 scanned pipelines haven't been re-scanned in 30+ days",
    description: 'Reach numbers above may be stale for them.'
  },
  {
    theme: 'warning',
    title: '8 suppressions expire within 14 days',
    description: 'Each needs a re-justification or it will re-raise.'
  },
  {
    theme: 'info',
    title: '23 pipelines appeared in the account since the last full scan',
    description: 'The account is growing faster than RT is rolling out.'
  },
  {
    theme: 'success',
    title: '4 pipelines disqualified',
    description: 'All critical risks cleared, blast radius bounded — no chaos data needed.'
  }
]

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export const ResilienceUsageView: React.FC = () => {
  const [hideUnscanned, setHideUnscanned] = useState(false)

  const columns: ColumnDef<PipelineRow>[] = [
    {
      accessorKey: 'pipeline',
      header: 'Pipeline',
      enableSorting: false,
      size: 200,
      cell: ({ row }) => (
        <Text variant="body-single-line-strong" color="foreground-1" truncate>
          {row.original.pipeline}
        </Text>
      )
    },
    {
      accessorKey: 'team',
      header: 'Team',
      enableSorting: false,
      size: 140,
      cell: ({ row }) => (
        <Text variant="body-single-line-normal" color="foreground-2" truncate>
          {row.original.team}
        </Text>
      )
    },
    {
      accessorKey: 'cluster',
      header: 'Cluster',
      enableSorting: false,
      size: 170,
      cell: ({ row }) => (
        <div className="flex items-center" style={{ gap: 6 }}>
          <LogoV2 name="kubernetes" size="sm" />
          <Text variant="body-single-line-normal" color="foreground-2" truncate>
            {row.original.cluster}
          </Text>
        </div>
      )
    },
    {
      accessorKey: 'riskScore',
      header: 'Risk',
      enableSorting: true,
      size: 90,
      cell: ({ row }) => (
        <StatusBadgeRisk score={row.original.riskScore} theme={riskTheme[row.original.risk]} />
      )
    },
    {
      id: 'findings',
      header: 'Fail / Pass / Info',
      enableSorting: false,
      size: 130,
      cell: ({ row }) => (
        <div className="flex items-center" style={{ gap: 4 }}>
          <Text variant="body-single-line-strong" color="danger">
            {row.original.fail}
          </Text>
          <Text variant="body-single-line-normal" color="foreground-3">
            /
          </Text>
          <Text variant="body-single-line-strong" color="success">
            {row.original.pass}
          </Text>
          <Text variant="body-single-line-normal" color="foreground-3">
            /
          </Text>
          <Text variant="body-single-line-normal" color="foreground-2">
            {row.original.info}
          </Text>
        </div>
      )
    },
    {
      accessorKey: 'maturity',
      header: 'RT maturity',
      enableSorting: false,
      size: 110,
      cell: ({ row }) => <Tag variant="secondary" theme="blue" size="sm" value={row.original.maturity} />
    },
    {
      accessorKey: 'lastScanned',
      header: 'Last scanned',
      enableSorting: true,
      size: 120,
      cell: ({ row }) => (
        <Text variant="body-single-line-normal" color="foreground-2" className="whitespace-nowrap">
          {row.original.lastScanned}
        </Text>
      )
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      size: 70,
      cell: () => (
        <div className="flex justify-end">
          <Button variant="link" size="sm">
            open
            <IconV2 name="nav-arrow-right" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <SandboxLayout.Main>
      <SandboxLayout.Content>
        {/* Page header */}
        <div className="flex items-start justify-between" style={{ gap: 16 }}>
          <div className="flex flex-col" style={{ gap: 6, maxWidth: 720 }}>
            <Text as="h1" variant="heading-section">
              RT Account Coverage
            </Text>
            <Text color="foreground-3">
              One glimpse of how far Resilience Testing has spread across this CD account — reach, risk,
              infrastructure readiness, and pipeline maturity.
            </Text>
          </div>
          <div className="flex shrink-0 items-center" style={{ gap: 8 }}>
            <FilterButton label="All Organizations" />
            <FilterButton label="All Projects" />
            <FilterButton label="Last 90 days" />
          </div>
        </div>

        <div className="flex flex-col" style={{ gap: 20, marginTop: 20 }}>
          {/* Hero stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
            {HERO_STATS.map(stat => (
              <div
                key={stat.label}
                className="border-cn-2 bg-cn-1 border"
                style={{ padding: 16, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 4 }}
              >
                <Text variant="heading-hero" color={stat.accent === 'danger' ? 'danger' : stat.accent === 'success' ? 'success' : 'foreground-1'}>
                  {stat.value}
                </Text>
                <Text variant="caption-normal" color="foreground-2">
                  {stat.label}
                </Text>
                {stat.sub && (
                  <Text variant="caption-normal" color="foreground-3">
                    {stat.sub}
                  </Text>
                )}
              </div>
            ))}
          </div>

          {/* Pipeline Explorer */}
          <Panel
            title="Pipeline Explorer"
            description="RT maturity, findings and last-scan freshness for pipelines that have run at least one scan."
          >
            {/* Bump the table container radius via its CSS var (inherits into cn-table-v2-container). */}
            <div style={{ '--cn-table-radius': 'var(--cn-rounded-6)' } as CSSProperties}>
              <DataTable<PipelineRow>
                columns={columns}
                data={PIPELINES}
                size="compact"
                getRowId={row => row.id}
                paginationProps={{
                  currentPage: 1,
                  pageSize: 6,
                  totalItems: 42,
                  goToPage: () => {},
                  onPageSizeChange: () => {}
                }}
              />
            </div>
          </Panel>

          {/* Trends */}
          <Panel title="Trends">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 24 }}>
              <Block title="RT reach over time (cumulative pipelines scanned)">
                <LineChart data={[8, 11, 15, 18, 24, 29, 34, 41, 47, 52, 58, 63]} />
              </Block>
              <Block title="Aggregate risk score trend (avg, p95)">
                <LineChart
                  data={[72, 70, 68, 66, 63, 61, 58, 55, 52, 49, 47, 45]}
                  secondary={[95, 95, 94, 93, 93, 92, 91, 91, 90, 90, 89, 88]}
                />
                <Text variant="caption-normal" color="foreground-3">
                  Dashed line = p95 gate; solid = average score, trending down.
                </Text>
              </Block>
              <Block title="Chaos experiments run / week">
                <LineChart data={[4, 6, 5, 9, 8, 12, 11, 15, 13, 18, 21, 19]} />
              </Block>
              <Block title="Suppressions outstanding">
                <LineChart data={[12, 13, 15, 14, 18, 21, 24, 27, 31, 34, 38, 42]} />
                <Text variant="caption-normal" color="foreground-3">
                  Rising = worth a look; suppressions expire at 90 days max.
                </Text>
              </Block>
            </div>
          </Panel>

          {/* Coverage & Reach */}
          <Panel
            title="Coverage & Reach"
            description="Org → project → team coverage across the account. Darker = higher scan coverage."
            actions={
              <Switch
                label="Hide unscanned pipelines"
                checked={hideUnscanned}
                onCheckedChange={setHideUnscanned}
                showOptionalLabel={false}
              />
            }
          >
            <div className="flex flex-col" style={{ gap: 8 }}>
              {COVERAGE.map(orgRow => (
                <div key={orgRow.org} className="flex items-center" style={{ gap: 8 }}>
                  <div style={{ width: 140 }} className="shrink-0">
                    <Text variant="caption-normal" color="foreground-2">
                      org: {orgRow.org}
                    </Text>
                  </div>
                  <div className="flex flex-1 flex-wrap" style={{ gap: 8 }}>
                    {orgRow.teams
                      .filter(team => !hideUnscanned || team.pct > 0)
                      .map(team => (
                        <div
                          key={team.name}
                          className="flex flex-col justify-between"
                          style={{ ...coverageCellStyle(team.pct), width: 148, height: 56, padding: 10, borderRadius: 12 }}
                        >
                          <Text variant="caption-normal" color="foreground-1" truncate>
                            {team.name}
                          </Text>
                          <Text variant="caption-strong" color="foreground-1">
                            {team.pct}%
                          </Text>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-cn-2 mt-4 flex items-center border-t pt-4" style={{ gap: 16 }}>
              <Text variant="caption-normal" color="foreground-3">
                Per-project scan coverage
              </Text>
              <div className="flex items-center" style={{ gap: 8 }}>
                {COVERAGE_BUCKETS.map(bucket => (
                  <div key={bucket.label} className="flex items-center" style={{ gap: 6 }}>
                    <span
                      className="rounded-sm"
                      style={{ width: 14, height: 14, ...coverageCellStyle(bucket.min === 0 ? 0 : bucket.min + 10) }}
                    />
                    <Text variant="caption-normal" color="foreground-3">
                      {bucket.label}
                    </Text>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-cn-2 mt-4 flex items-center justify-between" style={{ padding: '10px 12px', gap: 16, borderRadius: 12 }}>
              <Text variant="caption-normal" color="foreground-2">
                263 projects (60%) have never been scanned.
              </Text>
              <Button variant="link" size="sm">
                View unscanned projects
                <IconV2 name="nav-arrow-right" />
              </Button>
            </div>
          </Panel>

          {/* Risk & Maturity Depth */}
          <Panel
            title="Risk & Maturity Depth"
            description="Only the 63 scanned pipelines can appear here — this is depth, not breadth."
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 24 }}>
              <Block title="Pipeline risk-score distribution (avg 3.85)">
                <Histogram bins={[2, 4, 6, 9, 13, 17, 14, 11, 7, 4]} />
              </Block>
              <Block title="Top recurring risk patterns (by pipelines affected)">
                <HBars
                  unit=""
                  items={[
                    { label: 'SINGLE_REPLICA', value: 12 },
                    { label: 'NO_PDB', value: 9 },
                    { label: 'MISSING_HEALTH_PROBE', value: 7 },
                    { label: 'NO_RESOURCE_LIMITS', value: 6 },
                    { label: 'NO_CHAOS_COVERAGE', value: 4 }
                  ]}
                />
              </Block>
              <Block title="Findings by risk category">
                <StackedBar
                  segments={[
                    { label: 'Availability', value: 39, color: 'var(--cn-set-danger-primary-bg)' },
                    { label: 'Performance', value: 22, color: 'var(--cn-set-warning-primary-bg)' },
                    { label: 'Dependency', value: 21, color: 'var(--cn-comp-data-viz-02-purple)' },
                    { label: 'Configuration', value: 18, color: 'var(--cn-comp-data-viz-01-blue)' }
                  ]}
                />
              </Block>
              <Block title="Passive → active risk maturity">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                  {MATURITY_FUNNEL.map(step => (
                    <div
                      key={step.label}
                      className="border-cn-2 bg-cn-2 flex flex-col items-center justify-center border"
                      style={{ padding: '12px 6px', gap: 4, borderRadius: 12 }}
                    >
                      <Text variant="heading-base" color="foreground-1">
                        {step.value}
                      </Text>
                      <Text variant="caption-normal" color="foreground-3" align="center">
                        {step.label}
                      </Text>
                    </div>
                  ))}
                </div>
              </Block>
            </div>
          </Panel>

          {/* Infrastructure & Topology */}
          <Panel
            title="Infrastructure & Topology"
            description="What onboarding actually operates on — clusters and workload types, not pipelines."
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
              {INFRA_STATS.map(stat => (
                <div key={stat.label} className="flex flex-col" style={{ gap: 4 }}>
                  <Text variant="heading-section" color="foreground-1">
                    {stat.value}
                  </Text>
                  <Text variant="caption-normal" color="foreground-3">
                    {stat.label}
                  </Text>
                </div>
              ))}
            </div>

            <div className="mt-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 24 }}>
              <Block title="Delegate / agent presence (onboarding blocker if absent)">
                <StackedBar
                  segments={[
                    { label: 'Agent installed', value: 58, color: 'var(--cn-set-success-primary-bg)' },
                    { label: 'Not installed', value: 42, color: 'var(--cn-set-danger-primary-bg)' }
                  ]}
                />
              </Block>
              <Block title="Prod vs non-prod split">
                <StackedBar
                  segments={[
                    { label: 'Production', value: 62, color: 'var(--cn-comp-data-viz-01-blue)' },
                    { label: 'Non-prod', value: 38, color: 'var(--cn-border-3)' }
                  ]}
                />
              </Block>
            </div>
          </Panel>

          {/* Situations Worth Flagging */}
          <Panel title="Situations Worth Flagging">
            {/* Bump the alert radius via its CSS var so the flag cards match the panels. */}
            <div className="flex flex-col" style={{ gap: 12, '--cn-alert-radius': 'var(--cn-rounded-5)' } as CSSProperties}>
              {FLAGS.map(flag => (
                <Alert.Root key={flag.title} theme={flag.theme}>
                  <Alert.Title>{flag.title}</Alert.Title>
                  <Alert.Description>{flag.description}</Alert.Description>
                </Alert.Root>
              ))}
            </div>
          </Panel>
        </div>
      </SandboxLayout.Content>
    </SandboxLayout.Main>
  )
}

/* -------------------------------------------------------------------------- */
/* Small local components                                                      */
/* -------------------------------------------------------------------------- */

const FilterButton = ({ label }: { label: string }) => (
  <Button variant="outline" size="sm">
    {label}
    <IconV2 name="nav-arrow-down" />
  </Button>
)

const StatusBadgeRisk = ({ score, theme }: { score: number; theme: 'danger' | 'warning' | 'success' }) => (
  <StatusBadge variant="secondary" theme={theme} size="sm">
    {score}
  </StatusBadge>
)

export default ResilienceUsageView
