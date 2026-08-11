import { ReactNode, useEffect, useRef, useState } from 'react'

import { Button, IconV2, MoreActionsTooltip, StatusBadge, Tabs, Text } from '@harnessio/ui/components'

import { RunningBadge, TimelineSwimlanes } from './experiment-timeline'

// Timeline axis: relative offsets (top row) + absolute clock times (bottom row).
const RELATIVE_TIMES = [
  '0s',
  '10s',
  '20s',
  '30s',
  '40s',
  '50s',
  '1m 0s',
  '1m 10s',
  '1m 20s',
  '1m 30s',
  '1m 40s',
  '1m 50s',
  '2m 0s',
  '2m 10s'
]
const ABSOLUTE_TIMES = [
  '3 Jun 20:15:08',
  '20:15:18',
  '20:15:28',
  '20:15:38',
  '20:15:48',
  '20:15:58',
  '20:16:08',
  '20:16:18',
  '20:16:28',
  '20:16:38',
  '20:16:48',
  '20:16:58',
  '20:17:08',
  '20:17:18'
]

const COLUMN_WIDTH = 40
const COLUMN_GAP = 64
const AXIS_PADDING_X = 24
// The starting-point line aligns with the centre of the first ("0s") column.
const STARTING_POINT_X = AXIS_PADDING_X + COLUMN_WIDTH / 2

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

const TickColumn = ({ label, small }: { label: string; small?: boolean }) => (
  <div className="flex shrink-0 flex-col items-center" style={{ width: COLUMN_WIDTH, gap: 4 }}>
    <span
      className="text-cn-3 text-center font-mono"
      style={{ fontSize: small ? 10 : 12, lineHeight: '18px', whiteSpace: 'nowrap' }}
    >
      {label}
    </span>
    <span style={{ width: 1, height: 9, backgroundColor: 'var(--cn-border-3)' }} />
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
            <Button variant="outline" theme="danger" size="sm">
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
          <InfoItem label="Duration">{formatDuration(elapsedSeconds)}</InfoItem>
          <InfoItem label="Created">3m ago</InfoItem>
          <InfoItem label="Infrastructure">k8s-agent-01</InfoItem>
          <InfoItem label="Resilience Score">Calculating...</InfoItem>
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
        <div style={{ width: 'max-content', minWidth: '100%' }}>
          {/* time axis (sticky while scrolling vertically) */}
          <div className="bg-cn-2 sticky top-0 z-10">
            <div
              className="border-cn-2 flex border-b"
              style={{ gap: COLUMN_GAP, paddingLeft: AXIS_PADDING_X, paddingRight: AXIS_PADDING_X, paddingTop: 8 }}
            >
              {RELATIVE_TIMES.map(t => (
                <TickColumn key={t} label={t} />
              ))}
            </div>
            <div
              className="border-cn-2 flex border-b"
              style={{ gap: COLUMN_GAP, paddingLeft: AXIS_PADDING_X, paddingRight: AXIS_PADDING_X, paddingTop: 8 }}
            >
              {ABSOLUTE_TIMES.map((t, i) => (
                <TickColumn key={i} label={t} small />
              ))}
            </div>
          </div>

          {/* swimlanes + starting point line */}
          <div className="relative">
            <div
              aria-hidden
              className="absolute bottom-0 top-0"
              style={{ left: STARTING_POINT_X, borderLeft: '1px dashed var(--cn-border-3)' }}
            />
            <TimelineSwimlanes onStatusChange={setTimelineStatus} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExperimentExecutionView
