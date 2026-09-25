import { useMemo, useState } from 'react'

import type { ColumnDef, SortingState } from '@tanstack/react-table'

import {
  Button,
  DataTable,
  DropdownMenu,
  IconV2,
  ListActions,
  MoreActionsTooltip,
  SearchInput,
  Spacer,
  StatusBadge,
  Text
} from '@harnessio/ui/components'
import { SandboxLayout } from '@harnessio/views'

type ExecutionStatus = 'Running' | 'Completed' | 'Error'
type StatusIcon = 'refresh-double' | 'check-circle' | 'xmark-circle'

interface DisasterRecoveryTest {
  name: string
  id: string
  lastExecution: string
  status: ExecutionStatus
  lastModified: string
}

const statusAppearance: Record<ExecutionStatus, { theme: 'warning' | 'success' | 'danger'; icon: StatusIcon }> = {
  Running: { theme: 'warning', icon: 'refresh-double' },
  Completed: { theme: 'success', icon: 'check-circle' },
  Error: { theme: 'danger', icon: 'xmark-circle' }
}

const drTests: DisasterRecoveryTest[] = [
  {
    name: 'Network Partition Scenario',
    id: 'networkpartitionscenario',
    lastExecution: '5 min ago',
    status: 'Running',
    lastModified: '2 hours ago'
  },
  {
    name: 'Cloud Outage Simulation',
    id: 'cloudoutagesimulation',
    lastExecution: '5 min ago',
    status: 'Completed',
    lastModified: '2 hours ago'
  },
  {
    name: 'Quarterly DB Recovery Test',
    id: 'quarterlydatabaserecoverytest',
    lastExecution: '5 min ago',
    status: 'Error',
    lastModified: '2 hours ago'
  },
  {
    name: 'Ransomware Recovery Drill',
    id: 'ransomwarerecoverydrill',
    lastExecution: '5 min ago',
    status: 'Completed',
    lastModified: '2 hours ago'
  },
  {
    name: 'Database Query Spike',
    id: 'databasequeryspike',
    lastExecution: '5 min ago',
    status: 'Completed',
    lastModified: '2 hours ago'
  }
]

export const ResilienceDrTestsView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [executionStatus, setExecutionStatus] = useState<'All' | ExecutionStatus>('All')
  const [sorting, setSorting] = useState<SortingState>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  const filteredTests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return drTests.filter(test => {
      const matchesQuery = !query || test.name.toLowerCase().includes(query) || test.id.includes(query)
      const matchesStatus = executionStatus === 'All' || test.status === executionStatus
      return matchesQuery && matchesStatus
    })
  }, [executionStatus, searchQuery])

  const columns = useMemo<ColumnDef<DisasterRecoveryTest>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Disaster recovery test',
        enableSorting: false,
        size: 320,
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <Text variant="body-single-line-strong" color="foreground-1" truncate>
              {row.original.name}
            </Text>
            <Text variant="caption-single-line-normal" color="foreground-3" truncate>
              Id: {row.original.id}
            </Text>
          </div>
        )
      },
      {
        accessorKey: 'lastExecution',
        header: 'Last Execution',
        enableSorting: true,
        size: 160,
        cell: ({ row }) => (
          <Text variant="body-single-line-normal" color="foreground-2" className="whitespace-nowrap">
            {row.original.lastExecution}
          </Text>
        )
      },
      {
        accessorKey: 'status',
        header: 'Execution Status',
        enableSorting: true,
        size: 170,
        cell: ({ row }) => {
          const appearance = statusAppearance[row.original.status]
          return (
            <StatusBadge variant="outline" theme={appearance.theme} icon={appearance.icon} size="sm">
              {row.original.status}
            </StatusBadge>
          )
        }
      },
      {
        accessorKey: 'lastModified',
        header: 'Last Modified',
        enableSorting: true,
        size: 160,
        cell: ({ row }) => (
          <Text variant="body-single-line-normal" color="foreground-2" className="whitespace-nowrap">
            {row.original.lastModified}
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
                { title: 'View test', iconName: 'eye' },
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

  return (
    <SandboxLayout.Main>
      <SandboxLayout.Content>
        <div className="flex items-center justify-between">
          <Text as="h1" variant="heading-section">
            Disaster Recovery Tests
          </Text>
          <div className="flex items-center" style={{ gap: 8 }}>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button variant="outline" size="sm" iconOnly aria-label="Disaster recovery test actions">
                  <IconV2 name="more-vert" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                <DropdownMenu.Item title="Export tests" onClick={() => {}} />
                <DropdownMenu.Item title="Refresh" onClick={() => {}} />
              </DropdownMenu.Content>
            </DropdownMenu.Root>
            <Button size="sm">
              <IconV2 name="plus" />
              Create DR Test
            </Button>
          </div>
        </div>

        <Spacer size={5} />

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
                    {executionStatus === 'All' ? 'Execution status' : executionStatus}
                    <IconV2 name="nav-arrow-down" />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="start">
                  {(['All', 'Running', 'Completed', 'Error'] as const).map(status => (
                    <DropdownMenu.Item
                      key={status}
                      title={status}
                      onClick={() => {
                        setExecutionStatus(status)
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
              Columns 3/3
              <IconV2 name="nav-arrow-down" />
            </Button>
          </ListActions.Right>
        </ListActions.Root>

        <Spacer size={4} />

        <DataTable<DisasterRecoveryTest>
          columns={columns}
          data={filteredTests}
          size="compact"
          getRowId={row => row.id}
          currentSorting={sorting}
          onSortingChange={setSorting}
          manualSorting
          paginationProps={{
            currentPage: page,
            pageSize,
            pageSizeOptions: [5, 10, 25],
            totalItems: filteredTests.length,
            goToPage: setPage,
            onPageSizeChange: nextSize => {
              setPageSize(nextSize)
              setPage(1)
            }
          }}
        />
      </SandboxLayout.Content>
    </SandboxLayout.Main>
  )
}

export default ResilienceDrTestsView
