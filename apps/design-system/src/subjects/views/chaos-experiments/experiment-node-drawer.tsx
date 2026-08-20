import { ReactNode, useState } from 'react'

import { Button, Drawer, IconV2, type IconV2NamesType, StatusBadge, Tabs, Text } from '@harnessio/ui/components'

/** Log severity → the colored accent bar on the left of each line. */
type LogLevel = 'default' | 'info' | 'warning' | 'error'

interface LogLine {
  time: string
  message: string
  level?: LogLevel
}

export interface NodeDetail {
  title: string
  icon: IconV2NamesType
  status: 'completed' | 'error'
  duration: string
  started: string
  ended: string
  logs: LogLine[]
}

const ACCENT_COLOR: Record<LogLevel, string> = {
  default: 'var(--cn-border-3)',
  info: 'var(--cn-set-blue-primary-bg)',
  warning: 'var(--cn-set-warning-primary-bg)',
  error: 'var(--cn-set-danger-primary-bg)'
}

/** Node detail (metadata + logs) keyed by the timeline node id. Mock content for the demo. */
export const NODE_DETAILS: Record<string, NodeDetail> = {
  'nginx-pod-delete': {
    title: 'Pod Delete',
    icon: 'chaos-fault',
    status: 'completed',
    duration: '3s',
    started: '20 Aug 2026, 20:15:08',
    ended: '20 Aug 2026, 20:15:11',
    logs: [
      { time: '20:15:08.049', message: '[Start]: pod-delete FAULT START' },
      { time: '20:15:08.512', message: '[Info]: Experiment initialized for nginx-pod-delete' },
      { time: '20:15:08.879', message: "[Probe]: Running pre-chaos probe 'nginx-http-probe'", level: 'info' },
      { time: '20:15:09.104', message: '[Probe]: {Actual value: 200, Expected value: 200, Operator: ==}' },
      { time: '20:15:09.286', message: "[Probe]: 'nginx-http-probe' probe Passed 😄" },
      {
        time: '20:15:09.301',
        message: 'The chaos inputs are args: { "PodsAffectedPerc": "100"; "Sequence": "parallel"; }'
      },
      { time: '20:15:09.302', message: '[Chaos]: Number of pods targeted: 1' },
      { time: '20:15:09.303', message: '[Chaos]: Target pods list for chaos: [nginx-6799fc88d8-9rc2d]' },
      { time: '20:15:09.512', message: '[Info]: Deleting the following pods', level: 'info' },
      { time: '20:15:09.640', message: '[Wait]: Waiting for the chaos interval of 3s', level: 'info' },
      { time: '20:15:09.882', message: '[Status]: Verifying the recreation of the application pod', level: 'info' },
      { time: '20:15:10.220', message: '[Status]: Checking whether application containers are in ready state' },
      {
        time: '20:15:10.410',
        message: '[Status]: Container status: { "Pod": "nginx-6799fc88d8-h95k2"; "Readiness": "true"; "container": "nginx"; }'
      },
      {
        time: '20:15:10.640',
        message: '[Warning]: Pod recreation took longer than the readiness threshold',
        level: 'warning'
      },
      { time: '20:15:10.905', message: '[Status]: Application pod is now running' },
      { time: '20:15:11.010', message: "[Probe]: Running post-chaos probe 'nginx-http-probe'", level: 'info' },
      { time: '20:15:11.180', message: "[Probe]: 'nginx-http-probe' probe Passed 😄" },
      { time: '20:15:11.204', message: '[Confirmation]: pod-delete fault has been reverted' },
      { time: '20:15:11.205', message: '[Result]: The experiment step completed successfully' }
    ]
  },
  'node-cpu-hog': {
    title: 'Node CPU Hog',
    icon: 'chaos-fault',
    status: 'error',
    duration: '2s',
    started: '20 Aug 2026, 20:15:11',
    ended: '20 Aug 2026, 20:15:13',
    logs: [
      { time: '20:15:11.220', message: '[Start]: node-cpu-hog FAULT START' },
      { time: '20:15:11.640', message: '[Info]: Targeting node k8s-agent-01', level: 'info' },
      { time: '20:15:11.905', message: '[Chaos]: Injecting CPU stress on 2 cores at 100% load' },
      { time: '20:15:12.410', message: '[Status]: Monitoring node resource utilization' },
      { time: '20:15:12.880', message: '[Warning]: Node CPU pressure exceeded 95%', level: 'warning' },
      { time: '20:15:13.104', message: '[Error]: Failed to reach steady state within the deadline', level: 'error' },
      { time: '20:15:13.205', message: '[Error]: helper pod crashed: OOMKilled', level: 'error' },
      { time: '20:15:13.206', message: '[Result]: The experiment step failed', level: 'error' }
    ]
  },
  'system-inline-probe': {
    title: 'System Inline Probe',
    icon: 'rt-probe',
    status: 'completed',
    duration: '5s',
    started: '20 Aug 2026, 20:15:08',
    ended: '20 Aug 2026, 20:15:13',
    logs: [
      { time: '20:15:08.049', message: '[Start]: system-inline-probe START' },
      { time: '20:15:08.512', message: '[Probe]: Executing inline command probe', level: 'info' },
      {
        time: '20:15:09.104',
        message:
          '[Probe]: The cmd probe information is as follows args: { "Command": "./healthcheck.sh"; "Comparator": "contains"; "Mode": "Continuous"; }'
      },
      { time: '20:15:10.286', message: '[Probe]: {Actual value: [Pass], Expected value: [Pass], Operator: contains}' },
      { time: '20:15:11.512', message: '[Probe]: Polling target endpoint (attempt 1)', level: 'info' },
      { time: '20:15:12.640', message: '[Status]: Health check returned HTTP 200' },
      { time: '20:15:13.180', message: "[Probe]: 'system-inline-probe' probe Passed 😄" },
      { time: '20:15:13.205', message: '[Result]: Probe completed successfully' }
    ]
  }
}

const InfoItem = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col items-start" style={{ gap: 4 }}>
    <Text color="foreground-3">{label}</Text>
    {typeof children === 'string' ? <Text color="foreground-1">{children}</Text> : children}
  </div>
)

const LogRow = ({ line }: { line: LogLine }) => {
  const level = line.level ?? 'default'
  const messageColor =
    level === 'warning' ? 'var(--cn-text-warning)' : level === 'error' ? 'var(--cn-text-danger)' : undefined
  return (
    <div
      className="flex items-start"
      style={{
        gap: 6,
        paddingLeft: 4,
        paddingRight: 4,
        // Faintly tint warning/error rows like the design's highlighted lines.
        backgroundColor:
          level === 'warning'
            ? 'color-mix(in srgb, var(--cn-set-warning-primary-bg) 10%, transparent)'
            : level === 'error'
              ? 'color-mix(in srgb, var(--cn-set-danger-primary-bg) 10%, transparent)'
              : undefined
      }}
    >
      <span
        aria-hidden
        className="shrink-0"
        style={{ width: 4, height: 20, borderRadius: 1, backgroundColor: ACCENT_COLOR[level] }}
      />
      <Text as="span" variant="caption-single-line-code" className="whitespace-pre-wrap" style={{ color: messageColor }}>
        <span style={{ color: 'var(--cn-text-3)' }}>[{line.time}]</span> {line.message}
      </Text>
    </div>
  )
}

interface NodeLogsDrawerProps {
  detail: NodeDetail | null
  onClose: () => void
}

/** Read-only drawer showing a completed timeline node's status summary and execution logs. */
export const NodeLogsDrawer = ({ detail, onClose }: NodeLogsDrawerProps) => {
  const [activeTab, setActiveTab] = useState('logs')

  return (
    <Drawer.Root open={!!detail} onOpenChange={open => !open && onClose()} direction="right">
      <Drawer.Content size="md">
        {/* Header: node icon chip + title + close */}
        <div className="border-cn-2 flex shrink-0 items-center border-b" style={{ padding: 20, gap: 10 }}>
          <div
            className="flex shrink-0 items-center justify-center"
            style={{
              width: 32,
              height: 32,
              borderRadius: 4,
              border: '1px solid var(--cn-border-2)',
              backgroundColor: 'var(--cn-text-1)',
              color: 'var(--cn-bg-1)'
            }}
          >
            <IconV2 name={detail?.icon ?? 'chaos-fault'} size="sm" />
          </div>
          <Drawer.Title className="flex-1 truncate">{detail?.title ?? ''}</Drawer.Title>
          <Drawer.Description className="sr-only">
            Execution status and logs for the {detail?.title ?? 'step'} step.
          </Drawer.Description>
          <Drawer.Close asChild>
            <Button variant="ghost" iconOnly ignoreIconOnlyTooltip aria-label="Close">
              <IconV2 name="xmark" />
            </Button>
          </Drawer.Close>
        </div>

        <Drawer.Body scrollable={false} classNameContent="flex h-full flex-col">
          <div className="flex min-h-0 flex-1 flex-col" style={{ gap: 16 }}>
            {/* Status summary */}
            <div className="flex flex-wrap items-start" style={{ gap: 40 }}>
              <InfoItem label="Status">
                {detail?.status === 'error' ? (
                  <StatusBadge variant="secondary" theme="danger" icon="xmark-circle" size="sm">
                    Failed
                  </StatusBadge>
                ) : (
                  <StatusBadge variant="secondary" theme="success" icon="check-circle" size="sm">
                    Completed
                  </StatusBadge>
                )}
              </InfoItem>
              <InfoItem label="Duration">{detail?.duration ?? ''}</InfoItem>
              <InfoItem label="Started">{detail?.started ?? ''}</InfoItem>
              <InfoItem label="Ended">{detail?.ended ?? ''}</InfoItem>
            </div>

            {/* Tabs */}
            <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
              <Tabs.List>
                <Tabs.Trigger value="logs">Logs</Tabs.Trigger>
                <Tabs.Trigger value="details">Details</Tabs.Trigger>
              </Tabs.List>
            </Tabs.Root>

            {/* Log console */}
            {activeTab === 'logs' ? (
              <div
                className="border-cn-2 min-h-0 flex-1 overflow-auto rounded-md border"
                style={{ backgroundColor: 'var(--cn-bg-0)', padding: '16px 12px' }}
              >
                <div className="flex flex-col" style={{ gap: 6 }}>
                  {(detail?.logs ?? []).map((line, i) => (
                    <LogRow key={i} line={line} />
                  ))}
                </div>
              </div>
            ) : (
              <div
                className="border-cn-2 flex min-h-0 flex-1 items-center justify-center rounded-md border"
                style={{ backgroundColor: 'var(--cn-bg-0)', padding: 24 }}
              >
                <Text color="foreground-3">No additional details for this step.</Text>
              </div>
            )}
          </div>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer.Root>
  )
}
