import { useMemo, useState } from 'react'

import { Button, Drawer, IconV2, SearchInput, StatusBadge, Table } from '@harnessio/ui/components'

export interface EnvironmentOption {
  id: string
  name: string
  tagged?: boolean
}

interface SelectEnvironmentDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (environment: EnvironmentOption) => void
}

const environments: EnvironmentOption[] = [
  { name: 'udit-testing-env', id: 'udittestingenv', tagged: true },
  { name: 'sandbox-environment-2', id: 'sandboxenv2' },
  { name: 'demo-env', id: 'demoenv' },
  { name: 'chaos-demo-env-01', id: 'chaosdemoenv01' },
  { name: 'harness-testing-env', id: 'harnesstestingenv', tagged: true },
  { name: 'dev-backup-env-06', id: 'tornadobackupenv06' },
  { name: 'sandbox-environment-1', id: 'sandboxenvironment2' },
  { name: 'gust-demo-env-08', id: 'gustdemoenv08' },
  { name: 'k8s-preprod-env-09', id: 'k8spreprodenv09' },
  { name: 'demo-qa-env-10', id: 'demoqaenv10' }
]

export const SelectEnvironmentDrawer: React.FC<SelectEnvironmentDrawerProps> = ({ open, onOpenChange, onSelect }) => {
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () =>
      environments.filter(
        env =>
          env.name.toLowerCase().includes(search.toLowerCase()) ||
          env.id.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  )

  const handleSelect = (env: EnvironmentOption) => {
    onSelect(env)
    onOpenChange(false)
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction="right">
      <Drawer.Content size="md">
        <Drawer.Header>
          <Drawer.Title>Select an environment</Drawer.Title>
          <Drawer.Description className="sr-only">Choose an environment to run the chaos experiment on.</Drawer.Description>
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
                    <Table.Head>Environment</Table.Head>
                    <Table.Head>Type</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filtered.map(env => (
                    <Table.Row key={env.id} className="cursor-pointer" onClick={() => handleSelect(env)}>
                      <Table.Cell>
                        <div className="flex flex-col gap-0.5">
                          <div className="gap-cn-2xs flex items-center">
                            <span className="text-cn-2">{env.name}</span>
                            {env.tagged && <IconV2 name="label" size="xs" className="text-cn-3" />}
                          </div>
                          <span className="text-cn-3 text-xs">ID: {env.id}</span>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <StatusBadge variant="outline" theme="info" size="sm">
                          Pre-Production
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
