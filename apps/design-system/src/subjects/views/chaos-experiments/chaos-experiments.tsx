import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { ColumnDef, RowSelectionState, SortingState } from '@tanstack/react-table'

import {
  Button,
  DataTable,
  DropdownMenu,
  IconV2,
  ListActions,
  LogoV2,
  MoreActionsTooltip,
  SearchInput,
  Spacer,
  StatusBadge,
  Text
} from '@harnessio/ui/components'
import { SandboxLayout } from '@harnessio/views'

import { CreateChaosExperimentDrawer } from './create-chaos-experiment-drawer'

type ExecutionStatus = 'running' | 'completed' | 'error' | 'suspended'
type InfraType = 'k8s' | 'windows' | 'linux' | 'generic'

interface ChaosExperiment {
  id: string
  name: string
  infrastructure: string
  infraType: InfraType
  schedule: string
  lastExecution: string
  status: ExecutionStatus
  lastModified: string
}

const experiments: ChaosExperiment[] = [
  {
    name: 'nginx-pod-delete-437az',
    id: '2a8b0d97-1011-4c26-80d2-5c44165b16e3',
    infrastructure: 'k8s-demo-infra',
    infraType: 'k8s',
    schedule: 'Runs hourly',
    lastExecution: '5 min ago',
    status: 'running',
    lastModified: '2 hours ago'
  },
  {
    name: 'vmware-windows-cpu-hog',
    id: '3e7f0c25-2012-4d37-9212-6d5c6e7a2345',
    infrastructure: 'windows-agent-01',
    infraType: 'windows',
    schedule: 'Runs daily',
    lastExecution: '20 min ago',
    status: 'running',
    lastModified: '2 hours ago'
  },
  {
    name: 'nginx-pod-delete-9f2hk',
    id: '5b9f1e92-3013-4c26-83b3-7d2ea70b4567',
    infrastructure: 'demo-infra',
    infraType: 'k8s',
    schedule: 'Non-Cron',
    lastExecution: '20 min ago',
    status: 'completed',
    lastModified: '2 hours ago'
  },
  {
    name: 'pod-network-partition-asfq',
    id: '6a7c2e02-4014-4f59-95b4-8e3f0eb22345',
    infrastructure: 'devops-agent',
    infraType: 'k8s',
    schedule: 'Non-Cron',
    lastExecution: '20 min ago',
    status: 'error',
    lastModified: '2 hours ago'
  },
  {
    name: 'nginx-pod-restart-5l8f3',
    id: '1f1a2c39-5015-4f6a-9c8d-9c0b2c123456',
    infrastructure: 'linux-demo-agent',
    infraType: 'linux',
    schedule: 'Non-Cron',
    lastExecution: '20 min ago',
    status: 'completed',
    lastModified: '10 hours ago'
  },
  {
    name: 'nginx-pod-monitor-6t7r4',
    id: '8c3e9d56-6016-4a7b-b1a1-5a4d3e4a5678',
    infrastructure: 'windows-agent-01',
    infraType: 'windows',
    schedule: 'Runs daily',
    lastExecution: '30 min ago',
    status: 'completed',
    lastModified: '15 hours ago'
  },
  {
    name: 'nginx-pod-delete-437az',
    id: '2a8b0d97-1011-4c26-80d2-5c44165b16e3',
    infrastructure: 'k8s-demo-infra',
    infraType: 'k8s',
    schedule: 'Runs daily',
    lastExecution: '30 min ago',
    status: 'completed',
    lastModified: '2 days ago'
  },
  {
    name: 'nginx-pod-restart-5l8f3',
    id: '1f1a2c39-5015-4f6a-9c8d-9c0b2c123456',
    infrastructure: 'k8s-demo-infra',
    infraType: 'k8s',
    schedule: 'Non-Cron',
    lastExecution: '50 min ago',
    status: 'suspended',
    lastModified: '2 days ago'
  },
  {
    name: 'node-cpu-hog-demo-test',
    id: '5b9f1e92-3013-4c26-83b3-7d2ea712s4a5',
    infrastructure: 'k8s-demo-infra',
    infraType: 'k8s',
    schedule: 'Non-Cron',
    lastExecution: '2 days ago',
    status: 'completed',
    lastModified: '2 days ago'
  },
  {
    name: 'nginx-pod-delete-9f2hk',
    id: '5b9f1e92-3013-4c26-83b3-7d2ea70b4567',
    infrastructure: 'k8s-demo-infra',
    infraType: 'k8s',
    schedule: 'Non-Cron',
    lastExecution: '5 days ago',
    status: 'completed',
    lastModified: '2 days ago'
  }
]

// Branded infra types map to real technology logos; anything else falls back to a generic icon.
const infraLogoMap: Partial<Record<InfraType, 'kubernetes' | 'windows' | 'linux'>> = {
  k8s: 'kubernetes',
  windows: 'windows',
  linux: 'linux'
}

const statusConfig: Record<
  ExecutionStatus,
  { label: string; theme: 'warning' | 'success' | 'danger'; icon: 'refresh-double' | 'check-circle' | 'xmark-circle' | 'warning-circle' }
> = {
  running: { label: 'Running', theme: 'warning', icon: 'refresh-double' },
  completed: { label: 'Completed', theme: 'success', icon: 'check-circle' },
  error: { label: 'Error', theme: 'danger', icon: 'xmark-circle' },
  suspended: { label: 'Suspended', theme: 'warning', icon: 'warning-circle' }
}

export const ChaosExperimentsView: React.FC = () => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [sorting, setSorting] = useState<SortingState>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const columns = useMemo<ColumnDef<ChaosExperiment>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Chaos experiment',
        enableSorting: false,
        size: 320,
        minSize: 280,
        cell: ({ row }) => <span className="text-cn-1 truncate font-medium">{row.original.name}</span>
      },
      {
        accessorKey: 'infrastructure',
        header: 'Infrastructure',
        enableSorting: false,
        size: 190,
        cell: ({ row }) => {
          const logo = infraLogoMap[row.original.infraType]
          return (
            <div className="gap-cn-xs flex items-center">
              {logo ? (
                <LogoV2 name={logo} size="sm" />
              ) : (
                <IconV2 name="infrastructure" size="sm" color="neutral" />
              )}
              <span className="text-cn-2 truncate">{row.original.infrastructure}</span>
            </div>
          )
        }
      },
      {
        accessorKey: 'schedule',
        header: 'Schedule',
        enableSorting: false,
        size: 130,
        cell: ({ row }) => <span className="text-cn-2 whitespace-nowrap">{row.original.schedule}</span>
      },
      {
        accessorKey: 'lastExecution',
        header: 'Last Execution',
        enableSorting: true,
        size: 150,
        cell: ({ row }) => <span className="text-cn-2 whitespace-nowrap">{row.original.lastExecution}</span>
      },
      {
        accessorKey: 'status',
        header: 'Execution Status',
        enableSorting: false,
        size: 160,
        cell: ({ row }) => {
          const config = statusConfig[row.original.status]
          return (
            <StatusBadge variant="secondary" theme={config.theme} icon={config.icon} size="sm">
              {config.label}
            </StatusBadge>
          )
        }
      },
      {
        accessorKey: 'lastModified',
        header: 'Last Modified',
        enableSorting: true,
        size: 150,
        cell: ({ row }) => <span className="text-cn-2 whitespace-nowrap">{row.original.lastModified}</span>
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        size: 100,
        cell: ({ row }) => {
          const { status, schedule } = row.original
          const isRunning = status === 'running'
          const isScheduled = schedule !== 'Non-Cron'

          const primaryAction: {
            icon: 'stop-solid' | 'clock-solid' | 'play-solid'
            label: string
            onClick?: () => void
          } = isRunning
            ? { icon: 'stop-solid', label: 'Stop run' }
            : isScheduled
              ? { icon: 'clock-solid', label: 'View schedule' }
              : {
                  icon: 'play-solid',
                  label: 'Run experiment',
                  onClick: () => navigate('/view-preview/chaos-experiments/executions')
                }

          return (
            <div className="gap-cn-2xs flex items-center justify-end">
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label={primaryAction.label}
                tooltipProps={{ content: primaryAction.label }}
                theme={isRunning ? 'danger' : 'default'}
                onClick={primaryAction.onClick}
              >
                <IconV2 name={primaryAction.icon} />
              </Button>
              <MoreActionsTooltip
                buttonSize="sm"
                actions={[
                  { title: 'Edit', iconName: 'edit' },
                  { title: 'Clone', iconName: 'copy' },
                  { title: 'Delete', iconName: 'trash', isDanger: true }
                ]}
              />
            </div>
          )
        }
      }
    ],
    [navigate]
  )

  return (
    <SandboxLayout.Main>
      <SandboxLayout.Content>
        {/* Page header */}
        <Text as="h1" variant="heading-section">
          Chaos Experiments
        </Text>

        <Spacer size={5} />

        {/* Filter / table actions toolbar */}
        <ListActions.Root>
          <ListActions.Left>
            <div className="flex items-center" style={{ gap: 8 }}>
              <SearchInput
                inputContainerClassName="max-w-80"
                placeholder="Search"
                defaultValue={searchQuery}
                onChange={setSearchQuery}
              />
              <Button variant="ghost">
                <IconV2 name="plus" />
                Add filter
              </Button>
            </div>
          </ListActions.Left>
          <ListActions.Right className="gap-cn-xs">
            <Button variant="outline">
              <IconV2 name="sort-2" />
              Last executed
              <IconV2 name="nav-arrow-down" />
            </Button>
            <Button variant="outline">
              <IconV2 name="view-columns-2" />
              Columns 6/10
              <IconV2 name="nav-arrow-down" />
            </Button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button>
                  <IconV2 name="plus" />
                  New experiment
                  <IconV2 name="nav-arrow-down" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                <DropdownMenu.IconItem
                  icon="empty-page"
                  title="Create from blank"
                  onClick={() => setCreateDrawerOpen(true)}
                />
                <DropdownMenu.IconItem icon="copy" title="Create from template" onClick={() => {}} />
                <DropdownMenu.IconItem icon="upload" title="Upload YAML" onClick={() => {}} />
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </ListActions.Right>
        </ListActions.Root>

        <Spacer size={4} />

        {/* Table */}
        <DataTable<ChaosExperiment>
          columns={columns}
          data={experiments}
          size="compact"
          getRowId={(row, index) => `${row.id}-${index}`}
          enableRowSelection
          currentRowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          currentSorting={sorting}
          onSortingChange={setSorting}
          manualSorting
          paginationProps={{
            currentPage: page,
            pageSize,
            totalItems: 115,
            goToPage: setPage,
            onPageSizeChange: setPageSize
          }}
        />

        <CreateChaosExperimentDrawer open={createDrawerOpen} onOpenChange={setCreateDrawerOpen} />
      </SandboxLayout.Content>
    </SandboxLayout.Main>
  )
}

export default ChaosExperimentsView
