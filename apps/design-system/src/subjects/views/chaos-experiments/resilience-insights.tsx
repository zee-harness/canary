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

export const ResilienceInsightsView: React.FC = () => {
  const [section, setSection] = useState<InsightsSection>('services')
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
            <div className="flex items-center justify-between">
              <Text variant="heading-base">{sectionLabel}</Text>
              {section === 'services' && (
                <div className="flex items-center" style={{ gap: 8 }}>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <Button variant="outline" size="sm" iconOnly aria-label="Service actions">
                        <IconV2 name="more-vert" />
                      </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end">
                      <DropdownMenu.Item title="Export services" onClick={() => {}} />
                      <DropdownMenu.Item title="Refresh discovery" onClick={() => {}} />
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                  <Button size="sm">
                    <IconV2 name="plus" />
                    Onboard service
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

export default ResilienceInsightsView
