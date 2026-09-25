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

type SettingsSection =
  | 'discovery'
  | 'image-registry'
  | 'infrastructures'
  | 'chaoshubs'
  | 'chaos-faults'
  | 'probes'
  | 'actions'
  | 'chaosguard'

interface DiscoveryAgent {
  id: string
  name: string
  lastDiscovery: string
  schedule: string
  servicesDiscovered: number
  lastModified: string
}

const SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: 'discovery', label: 'Discovery' },
  { id: 'image-registry', label: 'Image registry' },
  { id: 'infrastructures', label: 'Resilience testing infrastructures' },
  { id: 'chaoshubs', label: 'ChaosHubs' },
  { id: 'chaos-faults', label: 'Chaos faults' },
  { id: 'probes', label: 'Probes' },
  { id: 'actions', label: 'Actions' },
  { id: 'chaosguard', label: 'ChaosGuard' }
]

const agents: DiscoveryAgent[] = [
  {
    id: 'agent-1',
    name: 'discovery-k8s-demo-cluster',
    lastDiscovery: '5d ago',
    schedule: '15 minutes past the hour',
    servicesDiscovered: 24,
    lastModified: '1h ago'
  },
  {
    id: 'agent-2',
    name: 'discovery-k8s-demo-cluster',
    lastDiscovery: '10d ago',
    schedule: '-',
    servicesDiscovered: 103,
    lastModified: '1h ago'
  },
  {
    id: 'agent-3',
    name: 'discovery-k8s-demo-cluster',
    lastDiscovery: '11d ago',
    schedule: 'Every 15 minutes',
    servicesDiscovered: 35,
    lastModified: '1h ago'
  },
  {
    id: 'agent-4',
    name: 'discovery-k8s-demo-cluster',
    lastDiscovery: '11d ago',
    schedule: '-',
    servicesDiscovered: 57,
    lastModified: '1h ago'
  },
  {
    id: 'agent-5',
    name: 'discovery-k8s-demo-cluster',
    lastDiscovery: '11d ago',
    schedule: 'Every 15 minutes',
    servicesDiscovered: 38,
    lastModified: '1h ago'
  }
]

export const ResilienceSettingsView: React.FC = () => {
  const [section, setSection] = useState<SettingsSection>('discovery')
  const [searchQuery, setSearchQuery] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortLabel, setSortLabel] = useState('Last added')

  const filteredAgents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const matched = query ? agents.filter(agent => agent.name.toLowerCase().includes(query)) : agents
    if (sortLabel === 'Name') {
      return [...matched].sort((a, b) => a.name.localeCompare(b.name))
    }
    return matched
  }, [searchQuery, sortLabel])

  const columns = useMemo<ColumnDef<DiscoveryAgent>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Discovery Agent',
        enableSorting: false,
        size: 280,
        cell: ({ row }) => (
          <div className="gap-cn-xs flex items-center">
            <Text variant="body-single-line-strong" color="foreground-1" truncate>
              {row.original.name}
            </Text>
            <IconV2 name="open-new-window" size="xs" className="text-cn-3 shrink-0" />
          </div>
        )
      },
      {
        accessorKey: 'lastDiscovery',
        header: 'Last Discovery',
        enableSorting: true,
        size: 140,
        cell: ({ row }) => (
          <Text variant="body-single-line-normal" color="foreground-2" className="whitespace-nowrap">
            {row.original.lastDiscovery}
          </Text>
        )
      },
      {
        id: 'status',
        header: 'Discovery Status',
        enableSorting: false,
        size: 160,
        cell: () => (
          <StatusBadge variant="outline" theme="success" icon="check-circle" size="sm">
            Success
          </StatusBadge>
        )
      },
      {
        accessorKey: 'schedule',
        header: 'Discovery Schedule',
        enableSorting: false,
        size: 200,
        cell: ({ row }) => (
          <Text variant="body-single-line-normal" color="foreground-2">
            {row.original.schedule}
          </Text>
        )
      },
      {
        accessorKey: 'servicesDiscovered',
        header: 'Services Discovered',
        enableSorting: false,
        size: 170,
        cell: ({ row }) => (
          <Text variant="body-single-line-normal" color="foreground-2">
            {row.original.servicesDiscovered}
          </Text>
        )
      },
      {
        accessorKey: 'lastModified',
        header: 'Last Modified',
        enableSorting: false,
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
                { title: 'View agent', iconName: 'eye' },
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

  const sectionLabel = SECTIONS.find(item => item.id === section)?.label ?? 'Discovery'

  return (
    <SandboxLayout.Main>
      <SandboxLayout.Content>
        <Text as="h1" variant="heading-section">
          Settings
        </Text>

        <Spacer size={5} />

        <div className="flex items-start" style={{ gap: 32 }}>
          <nav className="flex shrink-0 flex-col" style={{ width: 248, gap: 2 }} aria-label="Settings sections">
            {SECTIONS.map(item => {
              const selected = section === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`flex w-full items-center text-left${selected ? ' bg-cn-2' : ''}`}
                  style={{
                    minHeight: 32,
                    padding: '6px 12px',
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
            <div className="flex items-center justify-between" style={{ gap: 16 }}>
              <Text variant="heading-base">{sectionLabel}</Text>
              {section === 'discovery' && (
                <div className="flex shrink-0 items-center" style={{ gap: 8 }}>
                  <Button variant="outline" size="sm">
                    <IconV2 name="edit" />
                    Edit image registry
                  </Button>
                  <Button size="sm">
                    <IconV2 name="plus" />
                    Create discovery agent
                  </Button>
                </div>
              )}
            </div>

            {section === 'discovery' ? (
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
                      Columns 6/10
                      <IconV2 name="nav-arrow-down" />
                    </Button>
                  </ListActions.Right>
                </ListActions.Root>

                <Spacer size={4} />

                <DataTable<DiscoveryAgent>
                  columns={columns}
                  data={filteredAgents}
                  size="compact"
                  getRowId={row => row.id}
                  currentSorting={sorting}
                  onSortingChange={setSorting}
                  manualSorting
                  paginationProps={{
                    currentPage: page,
                    pageSize,
                    totalItems: filteredAgents.length,
                    goToPage: setPage,
                    onPageSizeChange: nextSize => {
                      setPageSize(nextSize)
                      setPage(1)
                    }
                  }}
                />
              </>
            ) : (
              <>
                <Spacer size={4} />
                <Text color="foreground-3">No {sectionLabel.toLowerCase()} yet.</Text>
              </>
            )}
          </div>
        </div>
      </SandboxLayout.Content>
    </SandboxLayout.Main>
  )
}

export default ResilienceSettingsView
