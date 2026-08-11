import { useMemo, useState } from 'react'

import { Button, Drawer, IconV2, LogoV2, SearchInput, StatusBadge, Table } from '@harnessio/ui/components'

export interface InfrastructureOption {
  id: string
  name: string
}

interface SelectInfrastructureDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (infrastructure: InfrastructureOption) => void
}

const infrastructures: InfrastructureOption[] = [
  { name: 'k8s-demo-infra', id: 'k8sdemoinfra' },
  { name: 'demo-infra', id: 'demoinfra' },
  { name: 'devops-agent', id: 'devopsagent' },
  { name: 'chaos-demo-infra', id: 'chaosdemoinfra' },
  { name: 'prod-k8s-cluster', id: 'prodk8scluster' },
  { name: 'staging-k8s-infra', id: 'stagingk8sinfra' },
  { name: 'qa-k8s-infra', id: 'qak8sinfra' },
  { name: 'sandbox-k8s-01', id: 'sandboxk8s01' }
]

export const SelectInfrastructureDrawer: React.FC<SelectInfrastructureDrawerProps> = ({
  open,
  onOpenChange,
  onSelect
}) => {
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () =>
      infrastructures.filter(
        infra =>
          infra.name.toLowerCase().includes(search.toLowerCase()) ||
          infra.id.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  )

  const handleSelect = (infra: InfrastructureOption) => {
    onSelect(infra)
    onOpenChange(false)
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction="right">
      <Drawer.Content size="md">
        <Drawer.Header>
          <Drawer.Title>Select an infrastructure</Drawer.Title>
          <Drawer.Description className="sr-only">
            Choose the infrastructure to run the chaos experiment on.
          </Drawer.Description>
        </Drawer.Header>

        <Drawer.Body>
          <div className="gap-cn-md flex flex-col">
            <div className="gap-cn-sm flex items-center">
              <div className="grow">
                <SearchInput placeholder="Search" onChange={setSearch} />
              </div>
              <Button variant="outline" iconOnly tooltipProps={{ content: 'Filter' }}>
                <IconV2 name="filter-list" />
              </Button>
            </div>

            <div className="border-cn-2 overflow-hidden rounded border">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>Infrastructure</Table.Head>
                    <Table.Head>Connection status</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filtered.map(infra => (
                    <Table.Row key={infra.id} className="cursor-pointer" onClick={() => handleSelect(infra)}>
                      <Table.Cell>
                        <div className="gap-cn-xs flex items-center">
                          <LogoV2 name="kubernetes" size="sm" />
                          <div className="flex flex-col gap-0.5">
                            <span className="text-cn-2">{infra.name}</span>
                            <span className="text-cn-3 text-xs">ID: {infra.id}</span>
                          </div>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <StatusBadge variant="status" theme="success" size="sm">
                          Connected
                        </StatusBadge>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </div>
          </div>
        </Drawer.Body>

        <Drawer.Footer>
          <div className="flex">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer.Root>
  )
}
