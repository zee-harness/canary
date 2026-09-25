import { useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { ColumnDef, SortingState } from '@tanstack/react-table'

import {
  Button,
  Card,
  DataTable,
  Drawer,
  DropdownMenu,
  IconV2,
  ListActions,
  LogoV2,
  MoreActionsTooltip,
  SearchInput,
  Spacer,
  StatusBadge,
  Tabs,
  Text
} from '@harnessio/ui/components'
import { SandboxLayout } from '@harnessio/views'

type InsightsSection = 'services' | 'risks' | 'pipeline-scans' | 'infrastructure-scans' | 'dashboards'

interface DiscoveredService {
  name: string
  discoveryAgent: string
  infrastructure: string
  passiveRisks: number
  confirmedRisks: number
}

const SECTIONS: { id: InsightsSection; label: string }[] = [
  { id: 'services', label: 'Services' },
  { id: 'risks', label: 'Risks' },
  { id: 'pipeline-scans', label: 'Pipeline Scans' },
  { id: 'infrastructure-scans', label: 'Infrastructure Scans' },
  { id: 'dashboards', label: 'Dashboards' }
]

const services: DiscoveredService[] = [
  { name: 'accounts-db', discoveryAgent: 'k8s-discovery', infrastructure: 'rt-chaos-infra', passiveRisks: 18, confirmedRisks: 5 },
  { name: 'cart-service', discoveryAgent: 'k8s-discovery', infrastructure: 'rt-chaos-infra', passiveRisks: 18, confirmedRisks: 5 },
  { name: 'order-service', discoveryAgent: 'k8s-discovery', infrastructure: 'rt-chaos-infra', passiveRisks: 24, confirmedRisks: 3 },
  { name: 'payment-service', discoveryAgent: 'k8s-discovery', infrastructure: 'rt-chaos-infra', passiveRisks: 12, confirmedRisks: 4 },
  { name: 'user-service', discoveryAgent: 'k8s-discovery', infrastructure: 'rt-chaos-infra', passiveRisks: 30, confirmedRisks: 7 },
  { name: 'checkout-service', discoveryAgent: 'k8s-discovery', infrastructure: 'rt-chaos-infra', passiveRisks: 30, confirmedRisks: 7 },
  { name: 'history-service', discoveryAgent: 'k8s-discovery', infrastructure: 'rt-chaos-infra', passiveRisks: 30, confirmedRisks: 7 }
]

const RISK_COLORS = {
  total: 'var(--cn-text-1)',
  critical: 'var(--cn-text-danger)',
  high: 'var(--cn-set-orange-primary-bg)',
  medium: 'var(--cn-text-warning)',
  low: 'var(--cn-set-blue-primary-bg)'
}

interface ServiceAtRisk {
  name: string
  namespace: string
  infrastructure: string
  total: number
  critical: number
  high: number
  medium: number
  low: number
}

const servicesAtRisk: ServiceAtRisk[] = [
  {
    name: 'cart-service',
    namespace: 'default',
    infrastructure: 'chaos-k8-infra',
    total: 10,
    critical: 3,
    high: 2,
    medium: 3,
    low: 2
  },
  {
    name: 'accounts-db',
    namespace: 'default',
    infrastructure: 'chaos-k8-infra',
    total: 7,
    critical: 2,
    high: 1,
    medium: 2,
    low: 2
  },
  {
    name: 'payment-service',
    namespace: 'default',
    infrastructure: 'chaos-k8-infra',
    total: 7,
    critical: 2,
    high: 1,
    medium: 2,
    low: 2
  }
]

type RiskSeverity = 'critical' | 'high' | 'medium' | 'low'

interface RiskFinding {
  title: string
  source: string
  detected: string
  description: string
  experiment: string
}

const FINDINGS: Record<RiskSeverity, RiskFinding[]> = {
  critical: [
    {
      title: 'Single Pod Replica',
      source: 'pipeline scan',
      detected: '2 days ago',
      description:
        'Detects workloads running with a single replica, making them a single point of failure with zero tolerance for pod-level disruptions.',
      experiment: 'pod-delete'
    },
    {
      title: 'Missing Liveness or Readiness Probes',
      source: 'pipeline scan',
      detected: '2 days ago',
      description:
        'Detects containers without liveness or readiness probes, causing Kubernetes to route traffic to unhealthy pods and never restart stuck ones.',
      experiment: 'pod-cpu-hog'
    },
    {
      title: 'Host Namespace Sharing',
      source: 'pipeline scan',
      detected: '2 days ago',
      description:
        'Detects pods using hostNetwork, hostPID, or hostIPC, which share the host node’s network stack, process tree, or IPC namespace.',
      experiment: 'pod-delete'
    }
  ],
  high: [
    {
      title: 'Aggressive Rolling Update Configuration',
      source: 'pipeline scan',
      detected: '2 days ago',
      description:
        'Detects Deployments with maxUnavailable greater than zero combined with small replica counts, causing capacity loss during every rolling update.',
      experiment: 'pod-delete'
    },
    {
      title: 'No Pod Disruption Budget',
      source: 'infrastructure scan',
      detected: '5 days ago',
      description: 'Detects workloads that can be evicted without a minimum availability guarantee during node drains.',
      experiment: 'pod-delete'
    }
  ],
  medium: [
    {
      title: 'Unbounded CPU Requests',
      source: 'pipeline scan',
      detected: '1 week ago',
      description: 'Detects containers without CPU requests, so the scheduler cannot reserve capacity for the workload.',
      experiment: 'pod-cpu-hog'
    },
    {
      title: 'Missing Memory Limits',
      source: 'pipeline scan',
      detected: '1 week ago',
      description: 'Detects containers that can grow without a memory limit and be OOMKilled under load.',
      experiment: 'pod-memory-hog'
    },
    {
      title: 'Shared EmptyDir Volume',
      source: 'infrastructure scan',
      detected: '3 days ago',
      description: 'Detects pods that share writable emptyDir volumes across containers without an isolation boundary.',
      experiment: 'pod-delete'
    }
  ],
  low: [
    {
      title: 'No Network Policy',
      source: 'infrastructure scan',
      detected: '1 week ago',
      description: 'Detects namespaces where workloads accept traffic from any pod because no NetworkPolicy is applied.',
      experiment: 'pod-network-loss'
    },
    {
      title: 'Latest Image Tag',
      source: 'pipeline scan',
      detected: '4 days ago',
      description: 'Detects containers pinned to the latest tag, so a reschedule can pull an untested image.',
      experiment: 'pod-delete'
    }
  ]
}

const SEVERITY_THEME: Record<RiskSeverity, 'danger' | 'warning' | 'info'> = {
  critical: 'danger',
  high: 'warning',
  medium: 'warning',
  low: 'info'
}

const findingsFor = (service: ServiceAtRisk) =>
  (['critical', 'high', 'medium', 'low'] as const).flatMap(severity =>
    FINDINGS[severity].slice(0, service[severity]).map(finding => ({ ...finding, severity }))
  )

const ServiceRiskDrawer = ({
  service,
  open,
  onOpenChange
}: {
  service: ServiceAtRisk | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) => {
  const [severity, setSeverity] = useState<RiskSeverity | 'all'>('all')
  const findings = service ? findingsFor(service) : []
  const visible = severity === 'all' ? findings : findings.filter(finding => finding.severity === severity)

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction="right">
      <Drawer.Content size="md">
        <Drawer.Header logo="harness">
          <Drawer.Title>{service?.name}</Drawer.Title>
          <Drawer.Description>
            {service ? `${service.infrastructure} / ${service.namespace}` : ''}
          </Drawer.Description>
        </Drawer.Header>
        <Drawer.Body>
          {service && (
            <div className="flex flex-col" style={{ gap: 16 }}>
              <div className="flex flex-wrap items-center justify-between" style={{ gap: 12 }}>
                <Text variant="heading-base">Total risks: {service.total}</Text>
                <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
                  {(['critical', 'high', 'medium', 'low'] as const).map(level => (
                    <Button
                      key={level}
                      size="sm"
                      variant={severity === level ? 'secondary' : 'outline'}
                      onClick={() => setSeverity(current => (current === level ? 'all' : level))}
                    >
                      <span
                        className="inline-block rounded-full"
                        style={{ width: 8, height: 8, backgroundColor: RISK_COLORS[level] }}
                      />
                      {level[0].toUpperCase() + level.slice(1)} ({service[level]})
                    </Button>
                  ))}
                </div>
              </div>

              {visible.map(finding => (
                <Card.Root key={`${finding.severity}-${finding.title}`}>
                  <Card.Content className="flex flex-col" style={{ gap: 8 }}>
                    <div className="flex items-center" style={{ gap: 8 }}>
                      <StatusBadge variant="secondary" theme={SEVERITY_THEME[finding.severity]} size="sm">
                        {finding.severity}
                      </StatusBadge>
                      <Text variant="body-strong" color="foreground-1">
                        {finding.title}
                      </Text>
                      <IconV2 name="open-new-window" size="xs" className="text-cn-3" />
                    </div>
                    <Text variant="caption-normal" color="foreground-3">
                      Passive: last detected in {finding.source}, {finding.detected}
                    </Text>
                    <Text variant="body-normal" color="foreground-2">
                      {finding.description}
                    </Text>
                    <div
                      className="flex items-center justify-between"
                      style={{ gap: 12, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--cn-border-2)' }}
                    >
                      <div className="flex items-center" style={{ gap: 8 }}>
                        <IconV2 name="sparks" size="sm" color="info" />
                        <Text variant="body-single-line-normal" color="foreground-1">
                          Recommended: Create a {finding.experiment} experiment
                        </Text>
                      </div>
                      <Button size="sm" variant="outline">
                        <IconV2 name="plus" />
                        Create
                      </Button>
                    </div>
                  </Card.Content>
                </Card.Root>
              ))}
            </div>
          )}
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  )
}

interface ListedRisk {
  id: string
  severity: RiskSeverity
  title: string
  service: string
  validation: 'Passive' | 'Confirmed'
  source: string
  lastDetected: string
}

const listedRisks: ListedRisk[] = [
  {
    id: 'risk-1',
    severity: 'critical',
    title: 'Single replica in deployment',
    service: 'cart-service',
    validation: 'Passive',
    source: 'scan-05-11-2026',
    lastDetected: '10 min ago'
  },
  {
    id: 'risk-2',
    severity: 'critical',
    title: 'Missing resource limits',
    service: 'payment-service',
    validation: 'Confirmed',
    source: 'pod-delete-53r',
    lastDetected: '10 min ago'
  },
  {
    id: 'risk-3',
    severity: 'high',
    title: 'Memory exhaustion under peak load',
    service: 'accounts-db',
    validation: 'Passive',
    source: 'scan-05-11-2026',
    lastDetected: '10 min ago'
  },
  {
    id: 'risk-4',
    severity: 'high',
    title: 'Memory exhaustion under peak load',
    service: 'accounts-db',
    validation: 'Passive',
    source: 'scan-05-11-2026',
    lastDetected: '10 min ago'
  },
  {
    id: 'risk-5',
    severity: 'medium',
    title: 'Downtime stream not handled',
    service: 'payment-service',
    validation: 'Passive',
    source: 'Manifest scan',
    lastDetected: '10 min ago'
  },
  {
    id: 'risk-6',
    severity: 'medium',
    title: 'Downtime stream not handled',
    service: 'checkout-service',
    validation: 'Passive',
    source: 'Manifest scan',
    lastDetected: '10 min ago'
  },
  {
    id: 'risk-7',
    severity: 'medium',
    title: 'Downtime stream not handled',
    service: 'cart-service',
    validation: 'Passive',
    source: 'Manifest scan',
    lastDetected: '10 min ago'
  },
  {
    id: 'risk-8',
    severity: 'low',
    title: 'No disaster recovery test performed',
    service: 'cart-service',
    validation: 'Passive',
    source: 'Manifest scan',
    lastDetected: '10 min ago'
  }
]

const SEVERITY_BADGE: Record<RiskSeverity, { label: string; theme: 'danger' | 'warning' | 'info' | 'risk' }> = {
  critical: { label: 'Critical', theme: 'danger' },
  high: { label: 'High', theme: 'warning' },
  medium: { label: 'Medium', theme: 'risk' },
  low: { label: 'Low', theme: 'info' }
}

const RISK_SUMMARY = [
  { label: 'Total risks', value: 218 },
  { label: 'Risks scanned from pipelines', value: 57 },
  { label: 'Risks scanned from services', value: 57 },
  { label: 'Risks confirmed from probes', value: 32 }
]

const RiskCount = ({ value, label, color }: { value: number; label: string; color: string }) => (
  <div className="flex min-w-0 flex-col">
    <Text variant="body-single-line-strong" style={{ color }}>
      {value}
    </Text>
    <Text variant="caption-single-line-normal" color="foreground-3" truncate>
      {label}
    </Text>
  </div>
)

const InsightsRiskList = ({ onOpenService }: { onOpenService: (service: ServiceAtRisk) => void }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [severity, setSeverity] = useState<RiskSeverity | 'all'>('all')
  const [sorting, setSorting] = useState<SortingState>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return listedRisks.filter(risk => {
      const matchesQuery =
        !query || risk.title.toLowerCase().includes(query) || risk.service.toLowerCase().includes(query)
      const matchesSeverity = severity === 'all' || risk.severity === severity
      return matchesQuery && matchesSeverity
    })
  }, [searchQuery, severity])

  const columns = useMemo<ColumnDef<ListedRisk>[]>(
    () => [
      {
        accessorKey: 'severity',
        header: 'Severity',
        enableSorting: true,
        size: 130,
        cell: ({ row }) => {
          const badge = SEVERITY_BADGE[row.original.severity]
          return (
            <StatusBadge variant="outline" theme={badge.theme} icon="warning-circle" size="sm">
              {badge.label}
            </StatusBadge>
          )
        }
      },
      {
        accessorKey: 'title',
        header: 'Risk',
        enableSorting: true,
        size: 220,
        cell: ({ row }) => (
          <Text variant="body-normal" color="foreground-1">
            {row.original.title}
          </Text>
        )
      },
      {
        accessorKey: 'service',
        header: 'Service',
        enableSorting: false,
        size: 140,
        cell: ({ row }) => {
          const service = servicesAtRisk.find(item => item.name === row.original.service)
          return (
            <Button variant="link" size="sm" onClick={() => service && onOpenService(service)}>
              {row.original.service}
            </Button>
          )
        }
      },
      {
        accessorKey: 'validation',
        header: 'Latest validation',
        enableSorting: false,
        size: 150,
        cell: ({ row }) => (
          <Text variant="body-single-line-normal" color="foreground-2">
            {row.original.validation}
          </Text>
        )
      },
      {
        accessorKey: 'source',
        header: 'Source',
        enableSorting: false,
        size: 160,
        cell: ({ row }) => (
          <Text variant="body-single-line-normal" color="foreground-2">
            {row.original.source}
          </Text>
        )
      },
      {
        accessorKey: 'lastDetected',
        header: 'Last detected',
        enableSorting: true,
        size: 140,
        cell: ({ row }) => (
          <Text variant="body-single-line-normal" color="foreground-2" className="whitespace-nowrap">
            {row.original.lastDetected}
          </Text>
        )
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        size: 48,
        cell: () => (
          <div className="flex justify-end">
            <MoreActionsTooltip
              buttonSize="sm"
              actions={[
                { title: 'View risk', iconName: 'eye' },
                { title: 'Edit', iconName: 'edit' },
                { title: 'Delete', iconName: 'trash', isDanger: true }
              ]}
            />
          </div>
        )
      }
    ],
    [onOpenService]
  )

  return (
    <>
      <ListActions.Root>
        <ListActions.Left>
          <div className="flex items-center" style={{ gap: 8 }}>
            <SearchInput
              inputContainerClassName="max-w-80"
              placeholder="Search"
              defaultValue={searchQuery}
              onChange={value => {
                setSearchQuery(value)
                setPage(1)
              }}
            />
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button variant="outline" size="sm">
                  {severity === 'all' ? 'Severity' : SEVERITY_BADGE[severity].label}
                  <IconV2 name="nav-arrow-down" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="start">
                <DropdownMenu.Item
                  title="All"
                  onClick={() => {
                    setSeverity('all')
                    setPage(1)
                  }}
                />
                {(Object.keys(SEVERITY_BADGE) as RiskSeverity[]).map(level => (
                  <DropdownMenu.Item
                    key={level}
                    title={SEVERITY_BADGE[level].label}
                    onClick={() => {
                      setSeverity(level)
                      setPage(1)
                    }}
                  />
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
            <Button variant="ghost" size="sm">
              <IconV2 name="plus" />
              Add filter
            </Button>
          </div>
        </ListActions.Left>
        <ListActions.Right>
          <Button variant="outline" size="sm">
            <IconV2 name="view-columns-2" />
            Columns 5/6
            <IconV2 name="nav-arrow-down" />
          </Button>
        </ListActions.Right>
      </ListActions.Root>
      <Spacer size={4} />
      <DataTable<ListedRisk>
        columns={columns}
        data={filtered}
        size="compact"
        getRowId={row => row.id}
        currentSorting={sorting}
        onSortingChange={setSorting}
        manualSorting
        paginationProps={{
          currentPage: page,
          pageSize,
          totalItems: filtered.length,
          goToPage: setPage,
          onPageSizeChange: nextSize => {
            setPageSize(nextSize)
            setPage(1)
          }
        }}
      />
    </>
  )
}

const InsightsRisks = () => {
  const [tab, setTab] = useState<'summary' | 'risks'>('summary')
  const [selectedService, setSelectedService] = useState<ServiceAtRisk | null>(null)

  const columns = useMemo<ColumnDef<ServiceAtRisk>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Service',
        enableSorting: false,
        size: 220,
        cell: ({ row }) => (
          <div className="gap-cn-sm flex items-center">
            <LogoV2 name="harness" size="sm" />
            <Text variant="body-single-line-strong" color="foreground-1" truncate>
              {row.original.name}
            </Text>
          </div>
        )
      },
      {
        accessorKey: 'namespace',
        header: 'Namespace',
        enableSorting: false,
        size: 140,
        cell: ({ row }) => (
          <Text variant="body-single-line-normal" color="foreground-2">
            {row.original.namespace}
          </Text>
        )
      },
      {
        id: 'risks',
        header: 'Risks detected',
        enableSorting: false,
        size: 320,
        cell: ({ row }) => (
          <div className="flex items-end" style={{ gap: 16 }}>
            <RiskCount value={row.original.total} label="Total" color={RISK_COLORS.total} />
            <RiskCount value={row.original.critical} label="Critical" color={RISK_COLORS.critical} />
            <RiskCount value={row.original.high} label="High" color={RISK_COLORS.high} />
            <RiskCount value={row.original.medium} label="Medium" color={RISK_COLORS.medium} />
            <RiskCount value={row.original.low} label="Low" color={RISK_COLORS.low} />
          </div>
        )
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        size: 140,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setSelectedService(row.original)}>
              <IconV2 name="eye" />
              View details
            </Button>
          </div>
        )
      }
    ],
    []
  )

  return (
    <>
      <Spacer size={4} />
      <Tabs.Root value={tab} onValueChange={value => setTab(value as 'summary' | 'risks')}>
        <Tabs.List>
          <Tabs.Trigger value="summary">Summary</Tabs.Trigger>
          <Tabs.Trigger value="risks">Risks</Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>
      <Spacer size={4} />
      {tab === 'summary' ? (
        <>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
            {RISK_SUMMARY.map(item => (
              <Card.Root key={item.label}>
                <Card.Content className="flex flex-col" style={{ gap: 8 }}>
                  <Text variant="caption-single-line-normal" color="foreground-3">
                    {item.label}
                  </Text>
                  <Text variant="heading-section">{item.value}</Text>
                </Card.Content>
              </Card.Root>
            ))}
          </div>
          <Spacer size={5} />
          <Text variant="body-strong">Top services at risk</Text>
          <Spacer size={4} />
          <DataTable<ServiceAtRisk> columns={columns} data={servicesAtRisk} size="compact" getRowId={row => row.name} />
        </>
      ) : (
        <InsightsRiskList onOpenService={setSelectedService} />
      )}
      <ServiceRiskDrawer
        key={selectedService?.name ?? 'closed'}
        service={selectedService}
        open={selectedService !== null}
        onOpenChange={open => {
          if (!open) setSelectedService(null)
        }}
      />
    </>
  )
}

type PipelineScanKind = 'rule' | 'ai'
type PipelineScanStatus = 'completed' | 'error'

interface PipelineScanRisks {
  critical: number
  high: number
  medium: number
  low: number
}

interface PipelineScan {
  id: string
  name: string
  kind: PipelineScanKind
  score: number | null
  risks: PipelineScanRisks | null
  status: PipelineScanStatus
  action: 'onboard' | 'view'
  overviewName: string
  pipelineId: string
  pipelineName: string
  scanned: string
  lastUpdated: string
  scanTimestamp: string
  servicesScanned: number | null
  risksDetectedAgo: string | null
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
    action: 'onboard',
    overviewName: 'devops-core-pipeline-scan-0215',
    pipelineId: 'devops-core-pipeline',
    pipelineName: 'devops-core-pipeline',
    scanned: '10m ago',
    lastUpdated: '10m ago',
    scanTimestamp: '2026-05-26 13:07 UTC',
    servicesScanned: 42,
    risksDetectedAgo: '5 minutes ago'
  },
  {
    id: 'pipeline-scan-2',
    name: 'devops-core-pipeline-scan-prod',
    kind: 'ai',
    score: null,
    risks: null,
    status: 'error',
    action: 'view',
    overviewName: 'devops-core-pipeline-scan-0216',
    pipelineId: 'devops-core-pipeline',
    pipelineName: 'devops-core-pipeline',
    scanned: '10m ago',
    lastUpdated: '10m ago',
    scanTimestamp: '2026-05-26 13:12 UTC',
    servicesScanned: null,
    risksDetectedAgo: null
  },
  {
    id: 'pipeline-scan-3',
    name: 'devops-core-pipeline-scan-prod',
    kind: 'rule',
    score: 650,
    risks: { critical: 2, high: 3, medium: 3, low: 2 },
    status: 'completed',
    action: 'onboard',
    overviewName: 'devops-core-pipeline-scan-0301',
    pipelineId: 'devops-core-pipeline',
    pipelineName: 'devops-core-pipeline',
    scanned: '10m ago',
    lastUpdated: '10m ago',
    scanTimestamp: '2026-05-26 12:41 UTC',
    servicesScanned: 18,
    risksDetectedAgo: '12 minutes ago'
  }
]

const riskTotal = (risks: PipelineScanRisks) => risks.critical + risks.high + risks.medium + risks.low

const RiskStack = ({ risks }: { risks: PipelineScanRisks }) => {
  const total = riskTotal(risks)
  const segments = [
    { key: 'critical', value: risks.critical, color: 'var(--cn-text-danger)' },
    { key: 'high', value: risks.high, color: 'var(--cn-set-orange-primary-bg)' },
    { key: 'medium', value: risks.medium, color: 'var(--cn-text-warning)' },
    { key: 'low', value: risks.low, color: 'var(--cn-set-blue-primary-bg)' }
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

const ScanDetailField = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col items-start" style={{ gap: 4 }}>
    <Text variant="caption-single-line-normal" color="foreground-3">
      {label}
    </Text>
    {children}
  </div>
)

const PipelineScanDetails = ({ scan, onBack }: { scan: PipelineScan; onBack: () => void }) => {
  const [tab, setTab] = useState<'summary' | 'heatmap' | 'services'>('summary')
  const riskBoxes = scan.risks
    ? [
        { label: 'Critical', value: scan.risks.critical, color: RISK_COLORS.critical },
        { label: 'High', value: scan.risks.high, color: RISK_COLORS.high },
        { label: 'Medium', value: scan.risks.medium, color: RISK_COLORS.medium },
        { label: 'Low', value: scan.risks.low, color: RISK_COLORS.low }
      ]
    : []

  return (
    <>
      <div className="flex items-start justify-between" style={{ gap: 16 }}>
        <div className="flex min-w-0 flex-col" style={{ gap: 8 }}>
          <div className="flex items-center" style={{ gap: 8 }}>
            <button type="button" onClick={onBack} className="text-left">
              <Text variant="body-single-line-normal" color="foreground-3">
                Pipeline Scans
              </Text>
            </button>
            <Text variant="body-single-line-normal" color="foreground-3">
              /
            </Text>
            <Text variant="body-single-line-normal" color="foreground-1" truncate>
              {scan.name}
            </Text>
          </div>
          <Text variant="heading-base">{scan.name}</Text>
        </div>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="outline" size="sm" iconOnly aria-label="Scan actions">
              <IconV2 name="more-vert" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            <DropdownMenu.Item title="Rerun scan" onClick={() => {}} />
            <DropdownMenu.Item title="Export scan" onClick={() => {}} />
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>

      <Spacer size={5} />

      <div className="flex items-start" style={{ gap: 40 }}>
        <ScanDetailField label="Status">
          {scan.status === 'completed' ? (
            <StatusBadge variant="outline" theme="success" icon="check-circle" size="sm">
              Completed
            </StatusBadge>
          ) : (
            <StatusBadge variant="outline" theme="danger" icon="xmark-circle" size="sm">
              Error
            </StatusBadge>
          )}
        </ScanDetailField>
        <ScanDetailField label="Scanned">
          <Text variant="body-single-line-normal" color="foreground-1">
            {scan.scanned}
          </Text>
        </ScanDetailField>
        <ScanDetailField label="Last updated">
          <Text variant="body-single-line-normal" color="foreground-1">
            {scan.lastUpdated}
          </Text>
        </ScanDetailField>
      </div>

      <Spacer size={5} />

      <Tabs.Root value={tab} onValueChange={value => setTab(value as 'summary' | 'heatmap' | 'services')}>
        <Tabs.List>
          <Tabs.Trigger value="summary">Summary</Tabs.Trigger>
          <Tabs.Trigger value="heatmap">Risk detection heatmap</Tabs.Trigger>
          <Tabs.Trigger value="services">Services with risk</Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>

      <Spacer size={4} />

      {tab === 'summary' ? (
        <div className="flex flex-col" style={{ gap: 16 }}>
          <Card.Root>
            <Card.Content className="flex flex-col" style={{ gap: 16 }}>
              <Text variant="body-strong">Overview</Text>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
                <ScanDetailField label="Name">
                  <Text variant="body-single-line-normal" color="foreground-1">
                    {scan.overviewName}
                  </Text>
                  <ScanDetailField label="Pipeline">
                    <Button variant="link" size="sm">
                      {scan.pipelineName}
                    </Button>
                  </ScanDetailField>
                </ScanDetailField>
                <ScanDetailField label="ID">
                  <Text variant="body-single-line-normal" color="foreground-1">
                    {scan.pipelineId}
                  </Text>
                </ScanDetailField>
                <ScanDetailField label="Scan timestamp">
                  <Text variant="body-single-line-normal" color="foreground-1">
                    {scan.scanTimestamp}
                  </Text>
                </ScanDetailField>
              </div>
            </Card.Content>
          </Card.Root>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
            <Card.Root>
              <Card.Content className="flex flex-col" style={{ gap: 12 }}>
                <Text variant="body-strong">Services scanned</Text>
                <Text variant="heading-section">
                  {scan.servicesScanned === null ? '-' : scan.servicesScanned}
                </Text>
              </Card.Content>
            </Card.Root>
            <Card.Root>
              <Card.Content className="flex flex-col" style={{ gap: 12 }}>
                <Text variant="body-strong">Risk score</Text>
                {scan.score === null ? (
                  <Text variant="heading-section" color="foreground-3">
                    -
                  </Text>
                ) : (
                  <div className="flex items-baseline" style={{ gap: 8 }}>
                    <Text variant="heading-section" style={{ color: RISK_COLORS.critical }}>
                      {scan.score}
                    </Text>
                    <Text variant="heading-section" color="foreground-1">
                      / 1000
                    </Text>
                  </div>
                )}
              </Card.Content>
            </Card.Root>
          </div>

          <Card.Root>
            <Card.Content className="flex items-center justify-between" style={{ gap: 16 }}>
              <div className="flex flex-col" style={{ gap: 4 }}>
                <Text variant="body-strong">Risks detected in this pipeline</Text>
                <Text variant="caption-single-line-normal" color="foreground-3">
                  {scan.risksDetectedAgo ?? 'Not available'}
                </Text>
              </div>
              {riskBoxes.length > 0 ? (
                <div className="flex items-stretch" style={{ gap: 12 }}>
                  {riskBoxes.map(item => (
                    <div
                      key={item.label}
                      className="flex flex-col items-start"
                      style={{
                        gap: 4,
                        minWidth: 88,
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: '1px solid var(--cn-border-2)'
                      }}
                    >
                      <Text variant="caption-single-line-normal" color="foreground-3">
                        {item.label}
                      </Text>
                      <Text variant="heading-base" style={{ color: item.color }}>
                        {item.value}
                      </Text>
                    </div>
                  ))}
                </div>
              ) : (
                <Text color="foreground-3">No risks detected</Text>
              )}
            </Card.Content>
          </Card.Root>
        </div>
      ) : (
        <Text color="foreground-3">
          {tab === 'heatmap' ? 'No risk detection heatmap yet.' : 'No services with risk yet.'}
        </Text>
      )}
    </>
  )
}

const InsightsPipelineScans = ({ onOpenScan }: { onOpenScan: (scan: PipelineScan) => void }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortLabel, setSortLabel] = useState('Last added')
  const [sorting, setSorting] = useState<SortingState>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const matched = query ? pipelineScans.filter(scan => scan.name.toLowerCase().includes(query)) : pipelineScans
    if (sortLabel === 'Name') return [...matched].sort((a, b) => a.name.localeCompare(b.name))
    return matched
  }, [searchQuery, sortLabel])

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
              <Button variant="outline" size="sm" onClick={() => onOpenScan(row.original)}>
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
    [onOpenScan]
  )

  return (
    <>
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
          <Button variant="outline" size="sm">
            <IconV2 name="view-columns-2" />
            Columns 4/10
            <IconV2 name="nav-arrow-down" />
          </Button>
        </ListActions.Right>
      </ListActions.Root>
      <Spacer size={4} />
      <DataTable<PipelineScan>
        columns={columns}
        data={filtered}
        size="compact"
        getRowId={row => row.id}
        getRowClassName={() => 'cursor-pointer'}
        onRowClick={onOpenScan}
        currentSorting={sorting}
        onSortingChange={setSorting}
        manualSorting
        paginationProps={{
          currentPage: page,
          pageSize,
          totalItems: filtered.length,
          goToPage: setPage,
          onPageSizeChange: nextSize => {
            setPageSize(nextSize)
            setPage(1)
          }
        }}
      />
    </>
  )
}

const SECTION_IDS = new Set<InsightsSection>(SECTIONS.map(item => item.id))

export const ResilienceInsightsView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const sectionParam = searchParams.get('section')
  const section: InsightsSection = SECTION_IDS.has(sectionParam as InsightsSection)
    ? (sectionParam as InsightsSection)
    : 'services'
  const setSection = (id: InsightsSection) => {
    if (id === 'services') setSearchParams({}, { replace: true })
    else setSearchParams({ section: id }, { replace: true })
  }
  const selectedScan =
    section === 'pipeline-scans' ? pipelineScans.find(scan => scan.id === searchParams.get('scan')) ?? null : null
  const openScan = (scan: PipelineScan) => setSearchParams({ section: 'pipeline-scans', scan: scan.id })
  const closeScan = () => setSearchParams({ section: 'pipeline-scans' })
  const [searchQuery, setSearchQuery] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortLabel, setSortLabel] = useState('Last added')

  const filteredServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const matched = query ? services.filter(service => service.name.toLowerCase().includes(query)) : services
    if (sortLabel === 'Name') {
      return [...matched].sort((a, b) => a.name.localeCompare(b.name))
    }
    return matched
  }, [searchQuery, sortLabel])

  const columns = useMemo<ColumnDef<DiscoveredService>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Service',
        enableSorting: false,
        size: 240,
        cell: ({ row }) => (
          <div className="gap-cn-sm flex items-center">
            <LogoV2 name="harness" size="sm" />
            <Text variant="body-single-line-strong" color="foreground-1" truncate>
              {row.original.name}
            </Text>
          </div>
        )
      },
      {
        accessorKey: 'discoveryAgent',
        header: 'Discovery Agent',
        enableSorting: false,
        size: 180,
        cell: ({ row }) => (
          <Text variant="body-single-line-normal" color="foreground-2">
            {row.original.discoveryAgent}
          </Text>
        )
      },
      {
        accessorKey: 'infrastructure',
        header: 'Infrastructure',
        enableSorting: false,
        size: 180,
        cell: ({ row }) => (
          <Text variant="body-single-line-normal" color="foreground-2">
            {row.original.infrastructure}
          </Text>
        )
      },
      {
        accessorKey: 'passiveRisks',
        header: 'Passive Risks',
        enableSorting: true,
        size: 140,
        cell: ({ row }) => (
          <Text variant="body-single-line-normal" color="foreground-2">
            {row.original.passiveRisks}
          </Text>
        )
      },
      {
        accessorKey: 'confirmedRisks',
        header: 'Confirmed Risks',
        enableSorting: true,
        size: 160,
        cell: ({ row }) => (
          <Text variant="body-single-line-normal" color="foreground-2">
            {row.original.confirmedRisks}
          </Text>
        )
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        size: 48,
        cell: () => (
          <div className="flex justify-end">
            <MoreActionsTooltip
              buttonSize="sm"
              actions={[
                { title: 'View service', iconName: 'eye' },
                { title: 'Edit', iconName: 'edit' },
                { title: 'Delete', iconName: 'trash', isDanger: true }
              ]}
            />
          </div>
        )
      }
    ],
    []
  )

  const sectionLabel = SECTIONS.find(item => item.id === section)?.label ?? 'Services'

  return (
    <SandboxLayout.Main>
      <SandboxLayout.Content>
        <Text as="h1" variant="heading-section">
          Insights
        </Text>

        <Spacer size={5} />

        <div className="flex items-start" style={{ gap: 32 }}>
          <nav className="flex shrink-0 flex-col" style={{ width: 180, gap: 2 }} aria-label="Insights sections">
            {SECTIONS.map(item => {
              const selected = section === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`flex w-full items-center text-left${selected ? ' bg-cn-2' : ''}`}
                  style={{
                    height: 32,
                    padding: '0 12px',
                    borderRadius: 4,
                    boxShadow: selected ? 'inset 2px 0 0 var(--cn-text-brand)' : undefined
                  }}
                >
                  <Text variant="body-single-line-normal" color={selected ? 'foreground-1' : 'foreground-3'}>
                    {item.label}
                  </Text>
                </button>
              )
            })}
          </nav>

          <div className="flex min-w-0 flex-1 flex-col">
            {selectedScan ? (
              <PipelineScanDetails scan={selectedScan} onBack={closeScan} />
            ) : (
              <>
            <div className="flex items-center justify-between">
              <Text variant="heading-base">{sectionLabel}</Text>
              {(section === 'services' || section === 'pipeline-scans') && (
                <div className="flex items-center" style={{ gap: 8 }}>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        iconOnly
                        aria-label={section === 'services' ? 'Service actions' : 'Scan actions'}
                      >
                        <IconV2 name="more-vert" />
                      </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end">
                      {section === 'services' ? (
                        <>
                          <DropdownMenu.Item title="Export services" onClick={() => {}} />
                          <DropdownMenu.Item title="Refresh discovery" onClick={() => {}} />
                        </>
                      ) : (
                        <>
                          <DropdownMenu.Item title="Export scans" onClick={() => {}} />
                          <DropdownMenu.Item title="Refresh scans" onClick={() => {}} />
                        </>
                      )}
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                  <Button size="sm">
                    <IconV2 name="plus" />
                    {section === 'services' ? 'Onboard service' : 'New scan'}
                  </Button>
                </div>
              )}
            </div>

            {section === 'services' ? (
              <>
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
                    <Button variant="outline" size="sm">
                      <IconV2 name="view-columns-2" />
                      Columns 4/10
                      <IconV2 name="nav-arrow-down" />
                    </Button>
                  </ListActions.Right>
                </ListActions.Root>

                <Spacer size={4} />

                <DataTable<DiscoveredService>
                  columns={columns}
                  data={filteredServices}
                  size="compact"
                  getRowId={row => row.name}
                  currentSorting={sorting}
                  onSortingChange={setSorting}
                  manualSorting
                  paginationProps={{
                    currentPage: page,
                    pageSize,
                    totalItems: filteredServices.length,
                    goToPage: setPage,
                    onPageSizeChange: nextSize => {
                      setPageSize(nextSize)
                      setPage(1)
                    }
                  }}
                />
              </>
            ) : section === 'risks' ? (
              <InsightsRisks />
            ) : section === 'pipeline-scans' ? (
              <InsightsPipelineScans onOpenScan={openScan} />
            ) : (
              <>
                <Spacer size={4} />
                <Text color="foreground-3">No {sectionLabel.toLowerCase()} yet.</Text>
              </>
            )}
              </>
            )}
          </div>
        </div>
      </SandboxLayout.Content>
    </SandboxLayout.Main>
  )
}

export default ResilienceInsightsView
