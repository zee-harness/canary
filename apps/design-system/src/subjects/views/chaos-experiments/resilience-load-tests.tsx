import { useMemo, useState } from 'react'

import type { ColumnDef, SortingState } from '@tanstack/react-table'

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

type TestType = 'Locust' | 'JMeter'
type InfrastructureType = 'Kubernetes' | 'Linux'
type StatusIcon = 'refresh-double' | 'check-circle' | 'xmark-circle'

interface LoadTest {
  name: string
  id: string
  icon: 'harness' | 'linux'
  testType: TestType
  infrastructureType: InfrastructureType
  users: number
  duration: string
  lastExecution: string
  status: { label: string; theme: 'warning' | 'success' | 'danger'; icon: StatusIcon }
  lastModified: string
}

const loadTests: LoadTest[] = [
  {
    name: 'API Gateway Stress Test-03',
    id: 'apigatewaystresstest03',
    icon: 'harness',
    testType: 'Locust',
    infrastructureType: 'Kubernetes',
    users: 1000,
    duration: '5 min',
    lastExecution: '5 min ago',
    status: { label: 'Running', theme: 'warning', icon: 'refresh-double' },
    lastModified: '2 hours ago'
  },
  {
    name: 'Checkout Flow Load Test',
    id: 'checkoutflowloadtest',
    icon: 'harness',
    testType: 'JMeter',
    infrastructureType: 'Kubernetes',
    users: 500,
    duration: '2 min',
    lastExecution: '5 min ago',
    status: { label: 'Completed', theme: 'success', icon: 'check-circle' },
    lastModified: '2 hours ago'
  },
  {
    name: 'API Gateway Stress Test-02',
    id: 'checkoutflowloadtest02',
    icon: 'harness',
    testType: 'Locust',
    infrastructureType: 'Kubernetes',
    users: 1000,
    duration: '5 min',
    lastExecution: '5 min ago',
    status: { label: 'Aborted', theme: 'danger', icon: 'xmark-circle' },
    lastModified: '2 hours ago'
  },
  {
    name: 'Database Query Spike',
    id: 'databasequeryspike',
    icon: 'linux',
    testType: 'Locust',
    infrastructureType: 'Linux',
    users: 2000,
    duration: '5 min',
    lastExecution: '5 min ago',
    status: { label: 'Running', theme: 'success', icon: 'check-circle' },
    lastModified: '2 hours ago'
  },
  {
    name: 'API Gateway Stress Test-01',
    id: 'apigatewaystresstest01',
    icon: 'harness',
    testType: 'Locust',
    infrastructureType: 'Kubernetes',
    users: 300,
    duration: '1 min',
    lastExecution: '5 min ago',
    status: { label: 'Running', theme: 'success', icon: 'check-circle' },
    lastModified: '2 hours ago'
  }
]

export const ResilienceLoadTestsView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [infrastructureType, setInfrastructureType] = useState<'All' | InfrastructureType>('All')
  const [testType, setTestType] = useState<'All' | TestType>('All')
  const [sorting, setSorting] = useState<SortingState>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filteredTests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return loadTests.filter(test => {
      const matchesQuery = !query || test.name.toLowerCase().includes(query) || test.id.includes(query)
      const matchesInfra = infrastructureType === 'All' || test.infrastructureType === infrastructureType
      const matchesType = testType === 'All' || test.testType === testType
      return matchesQuery && matchesInfra && matchesType
    })
  }, [infrastructureType, searchQuery, testType])

  const columns = useMemo<ColumnDef<LoadTest>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Load test',
        enableSorting: false,
        size: 280,
        cell: ({ row }) => (
          <div className="gap-cn-sm flex items-center">
            <LogoV2 name={row.original.icon} size="sm" />
            <div className="flex min-w-0 flex-col">
              <Text variant="body-single-line-strong" color="foreground-1" truncate>
                {row.original.name}
              </Text>
              <Text variant="caption-single-line-normal" color="foreground-3" truncate>
                Id: {row.original.id}
              </Text>
            </div>
          </div>
        )
      },
      {
        accessorKey: 'testType',
        header: 'Test type',
        enableSorting: false,
        size: 120,
        cell: ({ row }) => (
          <Text variant="body-single-line-normal" color="foreground-2">
            {row.original.testType}
          </Text>
        )
      },
      {
        accessorKey: 'users',
        header: 'Users',
        enableSorting: true,
        size: 100,
        cell: ({ row }) => (
          <Text variant="body-single-line-normal" color="foreground-2">
            {row.original.users}
          </Text>
        )
      },
      {
        accessorKey: 'duration',
        header: 'Duration',
        enableSorting: true,
        size: 110,
        cell: ({ row }) => (
          <Text variant="body-single-line-normal" color="foreground-2">
            {row.original.duration}
          </Text>
        )
      },
      {
        accessorKey: 'lastExecution',
        header: 'Last Execution',
        enableSorting: true,
        size: 140,
        cell: ({ row }) => (
          <Text variant="body-single-line-normal" color="foreground-2" className="whitespace-nowrap">
            {row.original.lastExecution}
          </Text>
        )
      },
      {
        id: 'status',
        header: 'Execution Status',
        enableSorting: false,
        size: 160,
        cell: ({ row }) => (
          <StatusBadge variant="outline" theme={row.original.status.theme} icon={row.original.status.icon} size="sm">
            {row.original.status.label}
          </StatusBadge>
        )
      },
      {
        accessorKey: 'lastModified',
        header: 'Last Modified',
        enableSorting: true,
        size: 140,
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
            Load Tests
          </Text>
          <div className="flex items-center" style={{ gap: 8 }}>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button variant="outline" size="sm" iconOnly aria-label="Load test actions">
                  <IconV2 name="more-vert" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                <DropdownMenu.Item title="Export load tests" onClick={() => {}} />
                <DropdownMenu.Item title="Refresh" onClick={() => {}} />
              </DropdownMenu.Content>
            </DropdownMenu.Root>
            <Button size="sm">
              <IconV2 name="plus" />
              Create Load Test
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
                    {infrastructureType === 'All' ? 'Infrastructure type' : infrastructureType}
                    <IconV2 name="nav-arrow-down" />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="start">
                  <DropdownMenu.Item
                    title="All"
                    onClick={() => {
                      setInfrastructureType('All')
                      setPage(1)
                    }}
                  />
                  <DropdownMenu.Item
                    title="Kubernetes"
                    onClick={() => {
                      setInfrastructureType('Kubernetes')
                      setPage(1)
                    }}
                  />
                  <DropdownMenu.Item
                    title="Linux"
                    onClick={() => {
                      setInfrastructureType('Linux')
                      setPage(1)
                    }}
                  />
                </DropdownMenu.Content>
              </DropdownMenu.Root>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <Button variant="outline" size="sm">
                    {testType === 'All' ? 'Test type' : testType}
                    <IconV2 name="nav-arrow-down" />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="start">
                  <DropdownMenu.Item
                    title="All"
                    onClick={() => {
                      setTestType('All')
                      setPage(1)
                    }}
                  />
                  <DropdownMenu.Item
                    title="Locust"
                    onClick={() => {
                      setTestType('Locust')
                      setPage(1)
                    }}
                  />
                  <DropdownMenu.Item
                    title="JMeter"
                    onClick={() => {
                      setTestType('JMeter')
                      setPage(1)
                    }}
                  />
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
              Columns 6/10
              <IconV2 name="nav-arrow-down" />
            </Button>
          </ListActions.Right>
        </ListActions.Root>

        <Spacer size={4} />

        <DataTable<LoadTest>
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

export default ResilienceLoadTestsView
