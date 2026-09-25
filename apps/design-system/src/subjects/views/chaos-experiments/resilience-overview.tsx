import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { ColumnDef, SortingState } from '@tanstack/react-table'

import {
  Button,
  Card,
  DataTable,
  DropdownMenu,
  IconV2,
  ListActions,
  LogoV2,
  SearchInput,
  Spacer,
  StatusBadge,
  Tabs,
  Text,
  type IconPropsV2
} from '@harnessio/ui/components'
import { SandboxLayout } from '@harnessio/views'

type ScanTab = 'pipelines' | 'infrastructures'
type ScanKind = 'rule' | 'ai'
type ScanStatus = 'completed' | 'error'

interface PipelineScanRisks {
  critical: number
  high: number
  medium: number
  low: number
}

interface OnboardingCard {
  icon: IconPropsV2['name']
  title: string
  description: string
}

interface PipelineScan {
  id: string
  name: string
  kind: ScanKind
  score: number | null
  risks: PipelineScanRisks | null
  status: ScanStatus
  action: 'onboard' | 'view'
}

const ONBOARDING_CARDS: OnboardingCard[] = [
  {
    icon: 'repository',
    title: 'Onboard an infrastructure',
    description: 'Prepare your existing infrastructures or add new ones to start with resilience testing.'
  },
  {
    icon: 'infrastructure',
    title: 'Scan an infrastructure for risks',
    description: 'Find resilience risks on your Kubernetes applications without running chaos experiments.'
  },
  {
    icon: 'pipeline',
    title: 'Scan a pipeline for risks',
    description:
      'Let our Resilience Test AI agents detect resilience risks and provide recommendations on resilience testing.'
  }
]

const RISK_COLORS = {
  critical: 'var(--cn-text-danger)',
  high: 'var(--cn-set-orange-primary-bg)',
  medium: 'var(--cn-text-warning)',
  low: 'var(--cn-set-blue-primary-bg)'
}

const PIPELINE_SCORE_COLOR = 'var(--cn-set-orange-primary-bg)'

const pipelineScans: PipelineScan[] = [
  {
    id: 'pipeline-scan-1',
    name: 'devops-core-pipeline-scan-0152',
    kind: 'rule',
    score: 567,
    risks: { critical: 4, high: 5, medium: 26, low: 17 },
    status: 'completed',
    action: 'onboard'
  },
  {
    id: 'pipeline-scan-2',
    name: 'devops-core-pipeline-scan-prod',
    kind: 'ai',
    score: null,
    risks: null,
    status: 'error',
    action: 'view'
  },
  {
    id: 'pipeline-scan-3',
    name: 'devops-core-pipeline-scan-prod',
    kind: 'rule',
    score: 650,
    risks: { critical: 2, high: 3, medium: 3, low: 2 },
    status: 'completed',
    action: 'onboard'
  }
]

const riskTotal = (risks: PipelineScanRisks) => risks.critical + risks.high + risks.medium + risks.low

const RiskStack = ({ risks }: { risks: PipelineScanRisks }) => {
  const total = riskTotal(risks)
  const segments = [
    { key: 'critical', value: risks.critical, color: RISK_COLORS.critical },
    { key: 'high', value: risks.high, color: RISK_COLORS.high },
    { key: 'medium', value: risks.medium, color: RISK_COLORS.medium },
    { key: 'low', value: risks.low, color: RISK_COLORS.low }
  ]

  return (
    <div className="flex items-center" style={{ gap: 8 }}>
      <div className="bg-cn-2 flex h-1.5 overflow-hidden rounded-full" style={{ width: 72 }}>
        {segments.map(segment =>
          segment.value > 0 ? (
            <div
              key={segment.key}
              style={{ width: `${(segment.value / total) * 100}%`, backgroundColor: segment.color }}
            />
          ) : null
        )}
      </div>
      <Text variant="body-single-line-normal" color="foreground-1" className="whitespace-nowrap">
        {total} total
      </Text>
    </div>
  )
}

export const ResilienceOverview: React.FC = () => {
  const navigate = useNavigate()
  const [tab, setTab] = useState<ScanTab>('pipelines')
  const [searchQuery, setSearchQuery] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortLabel, setSortLabel] = useState('Last added')

  const filteredScans = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const matched = query ? pipelineScans.filter(scan => scan.name.toLowerCase().includes(query)) : pipelineScans
    if (sortLabel === 'Name') return [...matched].sort((a, b) => a.name.localeCompare(b.name))
    return matched
  }, [searchQuery, sortLabel])

  const totals = useMemo(
    () =>
      filteredScans.reduce(
        (sum, scan) => {
          if (!scan.risks) return sum
          return {
            total: sum.total + riskTotal(scan.risks),
            critical: sum.critical + scan.risks.critical,
            high: sum.high + scan.risks.high,
            medium: sum.medium + scan.risks.medium,
            low: sum.low + scan.risks.low
          }
        },
        { total: 0, critical: 0, high: 0, medium: 0, low: 0 }
      ),
    [filteredScans]
  )

  const openScan = (scan: PipelineScan) => {
    navigate(`/view-preview/resilience-tests/insights?section=pipeline-scans&scan=${scan.id}`)
  }

  const columns = useMemo<ColumnDef<PipelineScan>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Pipeline',
        enableSorting: true,
        size: 220,
        cell: ({ row }) => (
          <div className="gap-cn-sm flex min-w-0 items-center">
            <LogoV2 name="harness" size="sm" />
            <Text variant="body-single-line-normal" color="foreground-1" truncate>
              {row.original.name}
            </Text>
          </div>
        )
      },
      {
        accessorKey: 'kind',
        header: 'Scan type',
        enableSorting: false,
        size: 140,
        cell: ({ row }) =>
          row.original.kind === 'ai' ? (
            <StatusBadge variant="outline" theme="info" icon="sparks" size="sm">
              AI
            </StatusBadge>
          ) : (
            <StatusBadge variant="outline" theme="success" icon="list" size="sm">
              Rule-based
            </StatusBadge>
          )
      },
      {
        accessorKey: 'score',
        header: 'Risk score',
        enableSorting: false,
        size: 160,
        cell: ({ row }) =>
          row.original.score === null ? (
            <Text variant="body-single-line-normal" color="foreground-3">
              -
            </Text>
          ) : (
            <div className="flex items-center" style={{ gap: 8 }}>
              <div className="bg-cn-2 h-1.5 overflow-hidden rounded-full" style={{ width: 56 }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(row.original.score / 1000) * 100}%`,
                    backgroundColor: PIPELINE_SCORE_COLOR
                  }}
                />
              </div>
              <Text variant="body-single-line-normal" color="foreground-1" className="whitespace-nowrap">
                {row.original.score} / 1000
              </Text>
            </div>
          )
      },
      {
        id: 'risks',
        header: 'Risks detected',
        enableSorting: false,
        size: 160,
        cell: ({ row }) =>
          row.original.risks ? (
            <RiskStack risks={row.original.risks} />
          ) : (
            <Text variant="body-single-line-normal" color="foreground-3">
              -
            </Text>
          )
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableSorting: false,
        size: 130,
        cell: ({ row }) =>
          row.original.status === 'completed' ? (
            <StatusBadge variant="outline" theme="success" icon="check-circle" size="sm">
              Completed
            </StatusBadge>
          ) : (
            <StatusBadge variant="outline" theme="danger" icon="xmark-circle" size="sm">
              Error
            </StatusBadge>
          )
      },
      {
        id: 'action',
        header: '',
        enableSorting: false,
        size: 120,
        cell: ({ row }) => (
          <div onClick={event => event.stopPropagation()}>
            {row.original.action === 'view' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate(`/view-preview/resilience-tests/insights?section=pipeline-scans&scan=${row.original.id}`)
                }
              >
                <IconV2 name="eye" />
                View
              </Button>
            ) : (
              <Button variant="outline" size="sm">
                <IconV2 name="plus" />
                Onboard
              </Button>
            )}
          </div>
        )
      }
    ],
    [navigate]
  )

  const summaryValues =
    tab === 'infrastructures'
      ? { total: 0, critical: 0, high: 0, medium: 0, low: 0 }
      : searchQuery.trim()
        ? totals
        : { total: 52, critical: 4, high: 5, medium: 26, low: 17 }

  const summary = [
    { label: 'Total risks', value: summaryValues.total, color: 'var(--cn-text-1)' },
    { label: 'Critical risks', value: summaryValues.critical, color: RISK_COLORS.critical },
    { label: 'High risks', value: summaryValues.high, color: RISK_COLORS.high },
    { label: 'Medium risks', value: summaryValues.medium, color: RISK_COLORS.medium },
    { label: 'Low risks', value: summaryValues.low, color: RISK_COLORS.low }
  ]

  return (
    <SandboxLayout.Main>
      <SandboxLayout.Content>
        <Text as="h1" variant="heading-section">
          Overview
        </Text>

        <Spacer size={5} />

        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
          {ONBOARDING_CARDS.map(card => (
            <Card.Root key={card.title}>
              <Card.Content className="flex flex-col items-start" style={{ gap: 12 }}>
                <div className="flex w-full items-start justify-between">
                  <IconV2 name={card.icon} size="md" color="info" />
                  <StatusBadge variant="outline" theme="success" size="sm">
                    3 available
                  </StatusBadge>
                </div>
                <div className="flex flex-col items-start" style={{ gap: 4 }}>
                  <Text variant="body-strong" color="foreground-1">
                    {card.title}
                  </Text>
                  <Text color="foreground-3" variant="caption-normal">
                    {card.description}
                  </Text>
                </div>
              </Card.Content>
            </Card.Root>
          ))}
        </div>

        <Spacer size={8} />

        <Text variant="heading-base">Recent Scans</Text>

        <Spacer size={4} />

        <Tabs.Root value={tab} onValueChange={value => setTab(value as ScanTab)}>
          <Tabs.List>
            <Tabs.Trigger value="pipelines">Pipelines</Tabs.Trigger>
            <Tabs.Trigger value="infrastructures">Infrastructures</Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>

        <Spacer size={4} />

        <ListActions.Root>
          <ListActions.Left>
            <SearchInput
              inputContainerClassName="max-w-80"
              placeholder="Search"
              defaultValue={searchQuery}
              onChange={value => {
                setSearchQuery(value)
                setPage(1)
              }}
            />
          </ListActions.Left>
          <ListActions.Right className="gap-cn-xs">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button variant="outline" size="sm">
                  <IconV2 name="sort-2" />
                  {sortLabel}
                  <IconV2 name="nav-arrow-down" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                <DropdownMenu.Item title="Last added" onClick={() => setSortLabel('Last added')} />
                <DropdownMenu.Item title="Name" onClick={() => setSortLabel('Name')} />
              </DropdownMenu.Content>
            </DropdownMenu.Root>
            <Button size="sm">
              <IconV2 name="plus" />
              New scan
            </Button>
          </ListActions.Right>
        </ListActions.Root>

        <Spacer size={4} />

        <div className="grid" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }}>
          {summary.map(item => (
            <Card.Root key={item.label}>
              <Card.Content className="flex flex-col" style={{ gap: 8 }}>
                <Text variant="caption-single-line-normal" color="foreground-3">
                  {item.label}
                </Text>
                <Text variant="heading-section" style={{ color: item.color }}>
                  {item.value}
                </Text>
              </Card.Content>
            </Card.Root>
          ))}
        </div>

        <Spacer size={4} />

        {tab === 'pipelines' ? (
          <DataTable<PipelineScan>
            columns={columns}
            data={filteredScans}
            size="compact"
            getRowId={row => row.id}
            getRowClassName={() => 'cursor-pointer'}
            onRowClick={openScan}
            currentSorting={sorting}
            onSortingChange={setSorting}
            manualSorting
            paginationProps={{
              currentPage: page,
              pageSize,
              totalItems: filteredScans.length,
              goToPage: setPage,
              onPageSizeChange: nextSize => {
                setPageSize(nextSize)
                setPage(1)
              }
            }}
          />
        ) : (
          <Text color="foreground-3">No infrastructure scans yet.</Text>
        )}
      </SandboxLayout.Content>
    </SandboxLayout.Main>
  )
}

export default ResilienceOverview
