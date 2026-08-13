import { memo, ReactNode, useCallback, useEffect, useRef, useState } from 'react'

import { IconV2, StatusBadge, Text } from '@harnessio/ui/components'

// --- Shared coordinate system -------------------------------------------------------------
// A single pixels-per-second scale is used by BOTH the time axis (spacing between 1s ticks)
// and the node expansion, so a node that has run Xs ends exactly at the Xs tick.
const PX_PER_SECOND = 104
const AXIS_START = 44 // x of the "0s" tick / starting-point line / node anchor
const MAX_SECONDS = 30 // how far the axis extends
const TRAILING_PAD = 24
const TOTAL_WIDTH = AXIS_START + MAX_SECONDS * PX_PER_SECOND + TRAILING_PAD
const MIN_NODE_WIDTH = 8 // initial sliver before a node has visibly expanded
// Sized so the centered node block leaves an ~8px gap to the lane's top/bottom borders.
const LANE_HEIGHT = 122

/** Total run length: the longest path — probe (5s) == fault chain (3s + 2s). */
export const RUN_DURATION_SECONDS = 5
const BASE_CLOCK_SECONDS = 20 * 3600 + 15 * 60 + 8 // 20:15:08

const pad2 = (n: number) => String(n).padStart(2, '0')
const formatRelative = (s: number) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`)
const formatClock = (i: number) => {
  const total = BASE_CLOCK_SECONDS + i
  return `${pad2(Math.floor(total / 3600) % 24)}:${pad2(Math.floor(total / 60) % 60)}:${pad2(total % 60)}`
}

type FinalStatus = 'completed' | 'error'
type Phase = 'running' | 'settled' | 'done'

interface AnimatedNodeProps {
  /** How long the node runs, in ms. Its final width is (duration/1000) * PX_PER_SECOND. */
  duration: number
  title: string
  footerLabel: string
  finalStatus: FinalStatus
  icon: ReactNode
  onComplete?: () => void
}

/**
 * A timeline node whose width tracks elapsed time on the shared PX_PER_SECOND scale, so its
 * right edge lines up with the current second on the axis. It glows while running, then
 * settles into a completed (green) / error (red) card.
 */
const AnimatedNode = ({ duration, title, footerLabel, finalStatus, icon, onComplete }: AnimatedNodeProps) => {
  const fullSeconds = duration / 1000
  const [width, setWidth] = useState(MIN_NODE_WIDTH)
  const [seconds, setSeconds] = useState(0)
  const [phase, setPhase] = useState<Phase>('running')
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    let raf = 0
    let settleTimer: ReturnType<typeof setTimeout>
    let start: number | null = null
    let cancelled = false

    const tick = (now: number) => {
      if (cancelled) return
      if (start === null) start = now
      const elapsedSeconds = Math.min((now - start) / 1000, fullSeconds)

      setWidth(Math.max(elapsedSeconds * PX_PER_SECOND, MIN_NODE_WIDTH))
      setSeconds(Math.floor(elapsedSeconds))

      if (elapsedSeconds < fullSeconds) {
        raf = requestAnimationFrame(tick)
      } else {
        setWidth(fullSeconds * PX_PER_SECOND)
        setSeconds(Math.round(fullSeconds))
        setPhase('settled')
        setTimeout(() => onCompleteRef.current?.(), 0)
        settleTimer = setTimeout(() => {
          if (!cancelled) setPhase('done')
        }, 300)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      clearTimeout(settleTimer)
    }
  }, [fullSeconds])

  const isRunning = phase === 'running'
  const borderColor = isRunning
    ? 'var(--cn-border-warning)'
    : finalStatus === 'error'
      ? 'var(--cn-border-danger)'
      : 'var(--cn-border-success)'
  const glow = isRunning
    ? '0 0 16px color-mix(in srgb, var(--cn-border-warning) 55%, transparent), 0 0 34px color-mix(in srgb, var(--cn-border-warning) 28%, transparent)'
    : 'none'

  return (
    <div className="relative shrink-0" style={{ paddingTop: 26 }}>
      <div className="absolute left-0 top-0">
        {phase === 'done' ? (
          finalStatus === 'error' ? (
            <StatusBadge variant="secondary" theme="danger" icon="xmark-circle" size="sm">
              Error
            </StatusBadge>
          ) : (
            <StatusBadge variant="secondary" theme="success" icon="check-circle" size="sm">
              Completed
            </StatusBadge>
          )
        ) : (
          <RunningBadge />
        )}
      </div>

      <div
        className="overflow-hidden"
        style={{
          width,
          borderRadius: 8,
          border: `1px solid ${borderColor}`,
          backgroundColor: 'var(--cn-bg-1)',
          boxShadow: glow,
          transition: 'box-shadow 300ms ease, border-color 300ms ease'
        }}
      >
        <div className="flex items-center" style={{ gap: 6, padding: '8px 12px', minHeight: 44 }}>
          {icon}
          <Text as="span" variant="body-single-line-normal" color="foreground-1" className="whitespace-nowrap">
            {title}
          </Text>
        </div>
        <div className="bg-cn-2 border-cn-2 border-t" style={{ padding: '8px 12px' }}>
          <Text as="span" variant="caption-single-line-code" color="foreground-2" className="whitespace-nowrap">
            {footerLabel}: {seconds}s
          </Text>
        </div>
      </div>
    </div>
  )
}

/**
 * Mirrors StatusBadge's warning look but with a spinning loader icon (StatusBadge renders
 * its icon statically and offers no spin hook). Uses the same `cn-badge*` classes so it matches.
 */
export const RunningBadge = () => (
  <div className="cn-badge cn-badge-secondary cn-badge-warning cn-badge-sm inline-flex w-fit items-center transition-colors">
    <IconV2 name="loader" className="animate-spin" />
    Running
  </div>
)

const FaultIcon = () => <IconV2 name="chaos-fault" size="md" className="text-cn-1 shrink-0" />
const ProbeIcon = () => <IconV2 name="rt-probe" size="md" className="text-cn-1 shrink-0" />

const Lane = ({ children }: { children?: ReactNode }) => (
  <div
    className="border-cn-2 flex items-center border-b"
    style={{ minHeight: LANE_HEIGHT, paddingLeft: AXIS_START, paddingRight: 16 }}
  >
    {children}
  </div>
)

/** One row of the time axis: a 1s-spaced set of ticks aligned to the shared scale. */
const TickStrip = ({ format, small }: { format: (i: number) => string; small?: boolean }) => (
  <div className="bg-cn-2 border-cn-2 relative border-b" style={{ width: TOTAL_WIDTH, height: 34 }}>
    {Array.from({ length: MAX_SECONDS + 1 }).map((_, i) => (
      <div
        key={i}
        className="absolute flex flex-col items-center"
        style={{ left: AXIS_START + i * PX_PER_SECOND, top: 6, transform: 'translateX(-50%)' }}
      >
        <Text
          as="span"
          variant="caption-single-line-code"
          color="foreground-3"
          align="center"
          className="whitespace-nowrap"
          style={small ? { fontSize: 10 } : undefined}
        >
          {format(i)}
        </Text>
        <span style={{ width: 1, height: 8, marginTop: 3, backgroundColor: 'var(--cn-border-3)' }} />
      </div>
    ))}
  </div>
)

/**
 * The scrollable timeline canvas: a 1s time axis (relative + absolute) over swimlanes with
 * the running experiment nodes. Fault chain runs first (nginx-pod-delete → node-cpu-hog);
 * a probe runs on its own lane; once everything settles the sequence resets and loops.
 */
export const TimelineCanvas = memo(function TimelineCanvas({
  onStatusChange
}: {
  /** Reports the overall timeline status as the run completes and loops. */
  onStatusChange?: (status: 'running' | 'completed') => void
}) {
  const [runId, setRunId] = useState(0)
  const [showSecondFault, setShowSecondFault] = useState(false)
  const onStatusChangeRef = useRef(onStatusChange)
  onStatusChangeRef.current = onStatusChange
  const resetTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const handleFirstFaultComplete = useCallback(() => setShowSecondFault(true), [])
  const handleProbeComplete = useCallback(() => {
    // The probe is the longest node, so its completion means the whole run is done.
    onStatusChangeRef.current?.('completed')
    clearTimeout(resetTimerRef.current)
    resetTimerRef.current = setTimeout(() => {
      setShowSecondFault(false)
      setRunId(id => id + 1)
      onStatusChangeRef.current?.('running')
    }, 3000)
  }, [])

  return (
    <div style={{ width: TOTAL_WIDTH, minWidth: '100%' }}>
      {/* time axis (sticky while scrolling vertically) */}
      <div className="bg-cn-2 sticky top-0 z-10">
        <TickStrip format={formatRelative} />
        <TickStrip format={formatClock} small />
      </div>

      {/* swimlanes + starting point line */}
      <div className="relative">
        <div
          aria-hidden
          className="absolute bottom-0 top-0"
          style={{ left: AXIS_START, borderLeft: '1px dashed var(--cn-border-3)' }}
        />

        {/* Lane 1 — fault chain */}
        <Lane>
          <div className="flex items-start" style={{ gap: 8 }}>
            <AnimatedNode
              key={`fault1-${runId}`}
              duration={3000}
              title="nginx-pod-delete"
              footerLabel="Fault"
              finalStatus="completed"
              icon={<FaultIcon />}
              onComplete={handleFirstFaultComplete}
            />
            {showSecondFault && (
              <AnimatedNode
                key={`fault2-${runId}`}
                duration={2000}
                title="node-cpu-hog"
                footerLabel="Fault"
                finalStatus="error"
                icon={<FaultIcon />}
              />
            )}
          </div>
        </Lane>

        {/* Lane 2 — probe */}
        <Lane>
          <AnimatedNode
            key={`probe-${runId}`}
            duration={5000}
            title="system-inline-probe"
            footerLabel="Probe"
            finalStatus="completed"
            icon={<FaultIcon />}
            onComplete={handleProbeComplete}
          />
        </Lane>

        {/* remaining empty lanes keep the "flexible & scrollable" grid look */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`empty-${i}`} className="border-cn-2 border-b" style={{ minHeight: LANE_HEIGHT }} />
        ))}
      </div>
    </div>
  )
})
