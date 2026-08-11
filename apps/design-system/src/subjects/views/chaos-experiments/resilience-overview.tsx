import { useState } from 'react'

import { Button, CardSelect, IconV2, Text } from '@harnessio/ui/components'
import { SandboxLayout } from '@harnessio/views'

type OnboardingOption = 'onboard-infrastructure' | 'scan-infrastructure' | 'scan-pipeline'

export const ResilienceOverview: React.FC = () => {
  const [selected, setSelected] = useState<OnboardingOption>()

  return (
    <SandboxLayout.Main>
      <SandboxLayout.Content>
        <div className="flex items-center justify-center" style={{ minHeight: '85vh' }}>
          <div className="gap-cn-2xl flex flex-col text-cn-1" style={{ width: 400 }}>
            <div className="gap-cn-2xs flex flex-col">
              <Text variant="heading-section">Get Started</Text>
              <Text color="foreground-3">Select an option to get started with resilience testing</Text>
            </div>

            <CardSelect.Root
              type="single"
              gap="sm"
              value={selected}
              onValueChange={val => setSelected(val as OnboardingOption)}
            >
            <CardSelect.Item value="onboard-infrastructure" icon="settings">
              <CardSelect.Title>Onboard an infrastructure</CardSelect.Title>
              <CardSelect.Description>
                Set up an infrastructure and onboard services to run resilience tests.
              </CardSelect.Description>
            </CardSelect.Item>

            <CardSelect.Item value="scan-infrastructure" icon="infrastructure">
              <CardSelect.Title>Scan an infrastructure for risks</CardSelect.Title>
              <CardSelect.Description>
                Run a passive risk scan on an existing Kubernetes infrastructure.
              </CardSelect.Description>
            </CardSelect.Item>

            <CardSelect.Item value="scan-pipeline" icon="pipeline">
              <CardSelect.Title>Scan a pipeline for risks</CardSelect.Title>
              <CardSelect.Description>
                Run a passive risk scan on an existing Harness CI/CD pipeline.
              </CardSelect.Description>
            </CardSelect.Item>
          </CardSelect.Root>

            <div className="flex items-center justify-center">
              <Button variant="link" size="sm">
                Learn more
                <IconV2 name="open-new-window" />
              </Button>
            </div>
          </div>
        </div>
      </SandboxLayout.Content>
    </SandboxLayout.Main>
  )
}

export default ResilienceOverview
