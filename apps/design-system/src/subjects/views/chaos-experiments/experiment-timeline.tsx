import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'

import { IconV2, StatusBadge } from '@harnessio/ui/components'

type FinalStatus = 'completed' | 'error'
type Phase = 'running' | 'settled' | 'done'

const START_WIDTH = 10 // px — the node starts as a sliver on the timeline
const EXPAND_SPEED = 87.5 // px per second (constant, so node length encodes duration)
const NODE_ANCHOR = 44 // aligns a node's start with the "0s" starting-point line
const LANE_HEIGHT = 140 // taller than a node so it sits with margin inside the lane borders

interface AnimatedNodeProps {
  /** How long the node runs, in ms (also drives the ticking "Xs" counter). */
  duration: number
  title: string
  /** Final rendered width, in px. */
  endWidth: number
  footerLabel: string
  finalStatus: FinalStatus
  icon: ReactNode
  onComplete?: () => void
}

/**
 * A timeline node that grows horizontally from a sliver to its full width while "running"
 * (amber glow), revealing its title as it expands and ticking a duration counter, then
 * settles into a completed (green) / error (red) card. Ported from the Figma Make
 * "Timeline View Node Expanding Animation (Version A)", using design-system tokens.
 */
const AnimatedNode = ({ duration, title, endWidth, footerLabel, finalStatus, icon, onComplete }: AnimatedNodeProps) => {
  const [width, setWidth] = useState(START_WIDTH)
  const [seconds, setSeconds] = useState(1)
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
      const elapsed = now - start

      const nextWidth = Math.min(START_WIDTH + (elapsed / 1000) * EXPAND_SPEED, endWidth)
      setWidth(nextWidth)

      const progress = Math.min(elapsed / duration, 1)
      setSeconds(Math.floor(1 + (duration / 1000 - 1) * progress))

      if (nextWidth < endWidth) {
        raf = requestAnimationFrame(tick)
      } else {
        setWidth(endWidth)
        setSeconds(Math.round(duration / 1000))
        setPhase('settled')
        // Defer so we don't trigger a sibling's state update mid-render.
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
  }, [duration, endWidth])

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
      {/* status badge floats above the card */}
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

      {/* node card */}
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
          <span className="text-cn-1" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>
            {title}
          </span>
        </div>
        <div className="bg-cn-2 border-cn-2 border-t" style={{ padding: '8px 12px' }}>
          <span className="text-cn-2 font-mono" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
            {footerLabel}: {seconds}s
          </span>
        </div>
      </div>
    </div>
  )
}

const FaultIcon = () => <IconV2 name="chaos-fault" size="md" className="text-cn-1 shrink-0" />
const ProbeIcon = () => <IconV2 name="rt-probe" size="md" className="text-cn-1 shrink-0" />

/**
 * Mirrors StatusBadge's warning look but with a spinning icon (StatusBadge renders its icon
 * statically and offers no spin hook). Uses the same `cn-badge*` classes so it matches.
 */
const RunningBadge = () => (
  <div className="cn-badge cn-badge-secondary cn-badge-warning cn-badge-sm inline-flex w-fit items-center transition-colors">
    <IconV2 name="refresh-double" className="animate-spin" />
    Running
  </div>
)

const Lane = ({ children }: { children?: ReactNode }) => (
  <div
    className="border-cn-2 flex items-center border-b"
    style={{ minHeight: LANE_HEIGHT, paddingLeft: NODE_ANCHOR, paddingRight: 16 }}
  >
    {children}
  </div>
)

/**
 * Renders the timeline swimlanes with the running experiment nodes. The fault chain runs
 * first (nginx-pod-delete → node-cpu-hog); a probe runs on its own lane; once everything
 * settles the whole sequence resets and loops.
 */
export const TimelineSwimlanes = ({ laneCount = 8 }: { laneCount?: number }) => {
  const [runId, setRunId] = useState(0)
  const [showSecondFault, setShowSecondFault] = useState(false)

  const handleFirstFaultComplete = useCallback(() => setShowSecondFault(true), [])
  const handleProbeComplete = useCallback(() => {
    setTimeout(() => {
      setShowSecondFault(false)
      setRunId(id => id + 1)
    }, 3000)
  }, [])

  return (
    <>
      {/* Lane 1 — fault chain */}
      <Lane>
        <div className="flex items-start" style={{ gap: 8 }}>
          <AnimatedNode
            key={`fault1-${runId}`}
            duration={3000}
            title="nginx-pod-delete"
            endWidth={300}
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
              endWidth={194}
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
          endWidth={500}
          footerLabel="Probe"
          finalStatus="completed"
          icon={<ProbeIcon />}
          onComplete={handleProbeComplete}
        />
      </Lane>

      {/* remaining empty lanes keep the "flexible & scrollable" grid look */}
      {Array.from({ length: Math.max(laneCount - 2, 0) }).map((_, i) => (
        <div key={`empty-${i}`} className="border-cn-2 border-b" style={{ minHeight: LANE_HEIGHT }} />
      ))}
    </>
  )
}
