import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Accordion, Button, CardSelect, Drawer, IconV2, Label, LogoV2, Text, TextInput } from '@harnessio/ui/components'

import { EnvironmentOption, SelectEnvironmentDrawer } from './select-environment-drawer'
import { InfrastructureOption, SelectInfrastructureDrawer } from './select-infrastructure-drawer'

interface CreateChaosExperimentDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type InfraType = 'kubernetes' | 'linux' | 'windows'

export const CreateChaosExperimentDrawer: React.FC<CreateChaosExperimentDrawerProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate()
  const [name, setName] = useState('nginx-pod-delete-test')
  const [infraType, setInfraType] = useState<InfraType>('kubernetes')
  const [environment, setEnvironment] = useState<EnvironmentOption>()
  const [envDrawerOpen, setEnvDrawerOpen] = useState(false)
  const [infrastructure, setInfrastructure] = useState<InfrastructureOption>()
  const [infraDrawerOpen, setInfraDrawerOpen] = useState(false)

  const handleClose = () => onOpenChange(false)

  // Selecting env + infra and submitting drops the user into the Chaos Studio.
  const handleSubmit = () => {
    onOpenChange(false)
    navigate('/view-preview/resilience-tests/chaos-experiments/studio')
  }

  const handleSelectEnvironment = (env: EnvironmentOption) => {
    setEnvironment(env)
    // Reset the dependent infrastructure selection when the environment changes.
    setInfrastructure(undefined)
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction="right">
      <Drawer.Content size="md">
        <Drawer.Header>
          <Drawer.Title>Create chaos experiment</Drawer.Title>
          <Drawer.Description className="sr-only">
            Configure a new chaos experiment by entering a name and selecting the target infrastructure.
          </Drawer.Description>
        </Drawer.Header>

        <Drawer.Body>
          <div className="gap-cn-md flex flex-col">
            <TextInput
              label="Name"
              optional
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter experiment name"
            />

            <Accordion.Root type="multiple" variant="card" defaultValue={['infrastructure']}>
              <Accordion.Item value="metadata">
                <Accordion.Trigger suffix={<Text color="foreground-3">Optional</Text>}>Metadata</Accordion.Trigger>
                <Accordion.Content>
                  <div className="gap-cn-md flex flex-col">
                    <TextInput label="Description" optional placeholder="Add a description" />
                    <TextInput label="Tags" optional placeholder="Add tags" />
                  </div>
                </Accordion.Content>
              </Accordion.Item>

              <Accordion.Item value="infrastructure">
                <Accordion.Trigger>Resilience testing infrastructure</Accordion.Trigger>
                <Accordion.Content>
                  <div className="gap-cn-xl flex flex-col">
                    <div className="gap-cn-sm flex flex-col">
                      <Label optional>Infrastructure Type</Label>
                      <CardSelect.Root
                        type="single"
                        gap="sm"
                        value={infraType}
                        onValueChange={val => setInfraType(val as InfraType)}
                      >
                        <CardSelect.Item value="kubernetes" logo="kubernetes">
                          <CardSelect.Title>Kubernetes</CardSelect.Title>
                          <div className="gap-cn-2xs mt-cn-3xs flex items-center">
                            <Text color="foreground-2">Supported fault types:</Text>
                            <LogoV2 name="kubernetes" size="xs" />
                            <LogoV2 name="docker" size="xs" />
                            <LogoV2 name="windows" size="xs" />
                          </div>
                        </CardSelect.Item>

                        <CardSelect.Item value="linux" logo="linux">
                          <CardSelect.Title>Linux</CardSelect.Title>
                          <div className="gap-cn-2xs mt-cn-3xs flex items-center">
                            <Text color="foreground-2">Supported fault types:</Text>
                            <LogoV2 name="linux" size="xs" />
                          </div>
                        </CardSelect.Item>

                        <CardSelect.Item value="windows" logo="windows">
                          <CardSelect.Title>Windows</CardSelect.Title>
                          <div className="gap-cn-2xs mt-cn-3xs flex items-center">
                            <Text color="foreground-2">Supported fault types:</Text>
                            <LogoV2 name="windows" size="xs" />
                          </div>
                        </CardSelect.Item>
                      </CardSelect.Root>
                    </div>

                    <button type="button" className="w-full cursor-pointer text-left" onClick={() => setEnvDrawerOpen(true)}>
                      <TextInput
                        label="Environment"
                        optional
                        readOnly
                        className="pointer-events-none"
                        value={environment?.name ?? ''}
                        placeholder="Select an environment"
                        suffix={<IconV2 name="nav-arrow-right" size="xs" className="mr-cn-2xs" />}
                      />
                    </button>

                    <button
                      type="button"
                      className="w-full cursor-pointer text-left disabled:cursor-not-allowed"
                      disabled={!environment}
                      onClick={() => setInfraDrawerOpen(true)}
                    >
                      <TextInput
                        label="Infrastructure"
                        optional
                        readOnly
                        disabled={!environment}
                        className="pointer-events-none"
                        value={infrastructure?.name ?? ''}
                        placeholder="Select an infrastructure"
                        suffix={<IconV2 name="nav-arrow-right" size="xs" className="mr-cn-2xs" />}
                      />
                    </button>
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            </Accordion.Root>
          </div>
        </Drawer.Body>

        <Drawer.Footer>
          <div className="gap-cn-sm flex w-full items-center justify-between">
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Submit</Button>
          </div>
        </Drawer.Footer>
      </Drawer.Content>

      <SelectEnvironmentDrawer open={envDrawerOpen} onOpenChange={setEnvDrawerOpen} onSelect={handleSelectEnvironment} />

      <SelectInfrastructureDrawer
        open={infraDrawerOpen}
        onOpenChange={setInfraDrawerOpen}
        onSelect={infra => setInfrastructure(infra)}
      />
    </Drawer.Root>
  )
}
