import { useState } from 'react'

import { Button, Card, IconV2, StatusBadge, Text, type IconPropsV2 } from '@harnessio/ui/components'
import { SandboxLayout } from '@harnessio/views'

type OnboardingOption = 'onboard-infrastructure' | 'scan-infrastructure' | 'scan-pipeline'

interface OnboardingCard {
  value: OnboardingOption
  icon: IconPropsV2['name']
  title: string
  description: string
}

const ONBOARDING_CARDS: OnboardingCard[] = [
  {
    value: 'onboard-infrastructure',
    icon: 'repository',
    title: 'Onboard an infrastructure',
    description: 'Prepare your existing infrastructures or add new ones to start with resilience testing.'
  },
  {
    value: 'scan-infrastructure',
    icon: 'infrastructure',
    title: 'Scan an infrastructure for risks',
    description: 'Find resilience risks on your Kubernetes applications without running chaos experiments.'
  },
  {
    value: 'scan-pipeline',
    icon: 'pipeline',
    title: 'Scan a pipeline for risks',
    description: 'Let our Resilience Test AI agents detect resilience risks and provide recommendations on resilience testing.'
  }
]

export const ResilienceOverview: React.FC = () => {
  const [selected, setSelected] = useState<OnboardingOption>()

  return (
    <SandboxLayout.Main>
      <SandboxLayout.Content>
        <div className="flex items-center justify-center" style={{ minHeight: '85vh' }}>
          <div className="flex flex-col items-center" style={{ gap: 24 }}>
            {/* Header */}
            <div className="flex flex-col items-center text-center" style={{ gap: 6 }}>
              <IconV2
                name="chaos-tests-solid"
                skipSize
                style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, color: 'var(--cn-set-orange-primary-bg)' }}
              />
              <Text variant="heading-hero">Get Started</Text>
              <Text color="foreground-3">Select an option to get started with resilience testing</Text>
            </div>

            {/* Option cards */}
            <div className="flex flex-col" style={{ gap: 12, width: 480 }}>
              {ONBOARDING_CARDS.map(card => (
                <Card.Root
                  key={card.value}
                  role="button"
                  tabIndex={0}
                  selected={selected === card.value}
                  onClick={() => setSelected(card.value)}
                  style={{ width: '100%' }}
                >
                  <Card.Content className="flex flex-col items-start" style={{ gap: 12 }}>
                    <div className="flex w-full items-center justify-between">
                      <IconV2 name={card.icon} size="md" color="info" />
                      <StatusBadge variant="outline" theme="success" size="sm">
                        3 available
                      </StatusBadge>
                    </div>
                    <div className="flex flex-col items-start" style={{ gap: 2 }}>
                      <Text color="foreground-1">{card.title}</Text>
                      <Text color="foreground-3" variant="caption-normal">
                        {card.description}
                      </Text>
                    </div>
                  </Card.Content>
                </Card.Root>
              ))}
            </div>

            {/* Learn more */}
            <Button variant="link" size="sm">
              Learn more
              <IconV2 name="open-new-window" />
            </Button>
          </div>
        </div>
      </SandboxLayout.Content>
    </SandboxLayout.Main>
  )
}

export default ResilienceOverview
