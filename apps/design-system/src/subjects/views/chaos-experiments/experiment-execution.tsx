import { ReactNode, useEffect, useRef, useState } from 'react'

import { Button, IconV2, MoreActionsTooltip, StatusBadge, Tabs, Text } from '@harnessio/ui/components'

import { RUN_DURATION_SECONDS, RunningBadge, TimelineCanvas } from './experiment-timeline'

const formatDuration = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
}

const InfoItem = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col items-start" style={{ gap: 4 }}>
    <Text color="foreground-3">{label}</Text>
    {typeof children === 'string' ? <Text color="foreground-1">{children}</Text> : children}
  </div>
)

export const ExperimentExecutionView = () => {
  const [activeTab, setActiveTab] = useState('timeline')
  const [timelineStatus, setTimelineStatus] = useState<'running' | 'completed'>('running')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const statusRef = useRef(timelineStatus)
  statusRef.current = timelineStatus
  const runStartRef = useRef(0)

  // Stamp the run's start whenever a new run begins (so the counter restarts from 0s).
  useEffect(() => {
    if (timelineStatus === 'running') {
      runStartRef.current = performance.now()
      setElapsedSeconds(0)
    }
  }, [timelineStatus])

  // Tick while running; derive elapsed from the start timestamp so the value is correct
  // regardless of how many timers fire, and freezes once completed.
  useEffect(() => {
    const id = setInterval(() => {
      if (statusRef.current === 'running') {
        setElapsedSeconds(Math.floor((performance.now() - runStartRef.current) / 1000))
      }
    }, 500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex h-full flex-col">
      {/* Execution header */}
      <div
        className="border-cn-2 flex shrink-0 flex-col border-b"
        style={{ paddingLeft: 24, paddingRight: 24, paddingTop: 20, gap: 20 }}
      >
        {/* title + actions */}
        <div className="flex items-start justify-between" style={{ gap: 16 }}>
          <Text variant="heading-hero" truncate>
            nginx-pod-delete-test #1
          </Text>
          <div className="flex shrink-0 items-center" style={{ gap: 8 }}>
            <MoreActionsTooltip
              buttonSize="sm"
              actions={[
                { title: 'Rerun experiment', iconName: 'refresh' },
                { title: 'Download logs', iconName: 'download' },
                { title: 'Delete', iconName: 'trash', isDanger: true }
              ]}
            />
            <Button variant="primary" theme="danger" size="sm">
              <IconV2 name="stop-solid" />
              Abort
            </Button>
            <Button size="sm">View experiment</Button>
          </div>
        </div>

        {/* info row */}
        <div className="flex items-center" style={{ gap: 40 }}>
          <InfoItem label="Status">
            {timelineStatus === 'completed' ? (
              <StatusBadge variant="secondary" theme="success" icon="check-circle" size="sm">
                Completed
              </StatusBadge>
            ) : (
              <RunningBadge />
            )}
          </InfoItem>
          <InfoItem label="Duration">
            {formatDuration(
              timelineStatus === 'completed' ? RUN_DURATION_SECONDS : Math.min(elapsedSeconds, RUN_DURATION_SECONDS)
            )}
          </InfoItem>
          <InfoItem label="Infrastructure">k8s-agent-01</InfoItem>
          <InfoItem label="Resilience Score">
            {timelineStatus === 'completed' ? '75%' : 'Calculating...'}
          </InfoItem>
        </div>

        {/* tabs */}
        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Trigger value="timeline">Execution Timeline</Tabs.Trigger>
            <Tabs.Trigger value="yaml">YAML</Tabs.Trigger>
            <Tabs.Trigger value="report">Report</Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>
      </div>

      {/* Timeline canvas */}
      <div
        className="min-h-0 flex-1 overflow-auto"
        style={{ backgroundColor: 'var(--cn-comp-pipeline-bg, var(--cn-bg-2))' }}
      >
        <TimelineCanvas onStatusChange={setTimelineStatus} />
      </div>
    </div>
  )
}

export default ExperimentExecutionView
