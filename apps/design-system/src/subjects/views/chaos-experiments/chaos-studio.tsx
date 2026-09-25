import { createContext, type MouseEvent as ReactMouseEvent, type ReactNode, useContext, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import {
  AnyContainerNodeType,
  CanvasProvider,
  ContainerNode,
  LeafNodeInternalType,
  NodeContent,
  PipelineGraph
} from '@harnessio/pipeline-graph'
import {
  Accordion,
  Button,
  Drawer,
  DropdownMenu,
  IconV2,
  type IconV2NamesType,
  NumberInput,
  SearchInput,
  Select,
  StatusBadge,
  Tabs,
  Text,
  TextInput
} from '@harnessio/ui/components'
import { PipelineNodes, type VisualYamlValue } from '@harnessio/views'

// The pipeline-graph ships its own stylesheet for the canvas / edges / nodes.
import '@harnessio/pipeline-graph/dist/index.css'

// Group/Parallel glyphs exported from the design (no DS icon matches); inlined as data-URI masks.
import addStepGroupRaw from './add-step-group.svg?raw'
import addStepParallelRaw from './add-step-parallel.svg?raw'

const groupIconMask = `url("data:image/svg+xml,${encodeURIComponent(addStepGroupRaw)}")`
const parallelIconMask = `url("data:image/svg+xml,${encodeURIComponent(addStepParallelRaw)}")`


// Lets graph nodes reflect/trigger view-owned state: opening the Add Step drawer from the empty
// placeholder or from a step's floating "+" buttons (parallel = below, sequential = right).
const AddStepContext = createContext<{
  selected: boolean
  onOpen: () => void
  onAddParallel: (nodeName: string) => void
  onAddSequential: (nodeName: string) => void
  onExtend: (nodeName: string) => void
  onRetract: (nodeName: string) => void
  onEdit: (nodeName: string) => void
  onAddStageBefore: (nodeName: string) => void
  onDelete: (nodeName: string) => void
  onAddAtEnd: () => void
}>({
  selected: false,
  onOpen: () => undefined,
  onAddParallel: () => undefined,
  onAddSequential: () => undefined,
  onExtend: () => undefined,
  onRetract: () => undefined,
  onEdit: () => undefined,
  onAddStageBefore: () => undefined,
  onDelete: () => undefined,
  onAddAtEnd: () => undefined
})

// --- Graph node content components (reuse the pipeline studio nodes) ------------------------
const StartNodeComponent = () => <PipelineNodes.StartNode />

/**
 * The end (stop) node, plus a floating "+" revealed when hovering the connector just before it —
 * lets the user add a new stage after the last set of nodes.
 */
function EndNodeComponent() {
  const { onAddAtEnd } = useContext(AddStepContext)
  const [hovered, setHovered] = useState(false)
  return (
    <div className="relative size-full" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <PipelineNodes.EndNode />
      {/* invisible hover target over the connector line just before the stop icon */}
      <div aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, right: '100%', width: 40 }} />
      <div
        className="flex items-center"
        style={{
          position: 'absolute',
          right: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          paddingRight: 10,
          zIndex: 20,
          opacity: hovered ? 1 : 0,
          pointerEvents: hovered ? 'auto' : 'none',
          transition: 'opacity 150ms ease'
        }}
      >
        <Button
          variant="outline"
          size="sm"
          iconOnly
          rounded
          aria-label="Add stage at end"
          tooltipProps={{ content: 'Add', side: 'top' }}
          style={{ backgroundColor: 'var(--cn-comp-pipeline-bg, var(--cn-bg-1))' }}
          onClick={event => {
            event.stopPropagation()
            onAddAtEnd()
          }}
        >
          <IconV2 name="plus" />
        </Button>
      </div>
    </div>
  )
}

/**
 * The empty-step placeholder card: a header (smiley icon + "Add step" + more button) over an
 * empty body, with a brand-blue selected border + ring while its drawer is open. Custom-built
 * because the design's layout (header on top, empty body) differs from the DS StepNode.
 */
function AddStepNodeComponent() {
  const { selected, onOpen } = useContext(AddStepContext)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative flex size-full flex-col text-left"
      style={{
        borderRadius: 8,
        backgroundColor: 'var(--cn-bg-3)',
        border: `1px solid ${selected ? 'var(--cn-border-brand)' : 'var(--cn-border-2)'}`,
        boxShadow: selected
          ? '0 0 0 4px color-mix(in srgb, var(--cn-border-brand) 15%, transparent)'
          : '0 2px 8px -2px rgba(0, 0, 0, 0.25)'
      }}
    >
      <div
        className="flex items-center"
        style={{ gap: 6, minHeight: 44, paddingLeft: 16, paddingRight: 8, paddingTop: 8, paddingBottom: 8 }}
      >
        <IconV2 name="chaos-fault" size="lg" className="text-cn-1 shrink-0" />
        <Text variant="body-single-line-strong" color="foreground-1" className="min-w-0 flex-1" truncate>
          Add step
        </Text>
        <Button
          variant="ghost"
          size="xs"
          iconOnly
          aria-label="More"
          tooltipProps={{ content: 'More' }}
          onClick={e => e.stopPropagation()}
        >
          <IconV2 name="more-horizontal" />
        </Button>
      </div>
    </button>
  )
}

/** Populated step card shown after a step is added (header + footer with its params). */
interface StepNodeData {
  name: string
  icon: IconV2NamesType
  lines: string[]
  /** True when this node is the sole step of its parallel lane and can absorb the next stage. */
  extendable?: boolean
  /** True when this node's parallel lane spans a sibling chain it can release a stage back out of. */
  retractable?: boolean
}

function StepContentNode({ node }: { node: LeafNodeInternalType<StepNodeData> }) {
  const { name, icon, lines, extendable, retractable } = node.data
  const { onAddParallel, onAddSequential, onExtend, onRetract, onEdit, onAddStageBefore, onDelete } =
    useContext(AddStepContext)
  // Reveal only the control for the edge being hovered: the "+" below when the cursor is near the
  // bottom, and the right-edge stack when it's near the right. (The buttons sit outside the card
  // but are DOM descendants, so hovering onto them keeps the zone active.)
  const [zone, setZone] = useState<'bottom' | 'right' | null>(null)
  const handleMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const nearRight = x >= rect.width * 0.6
    const nearBottom = y >= rect.height * 0.6
    if (nearRight && nearBottom) {
      // In the shared corner, pick whichever edge (or its gutter) the cursor is closer to.
      setZone(rect.width - x <= rect.height - y ? 'right' : 'bottom')
    } else if (nearRight) setZone('right')
    else if (nearBottom) setZone('bottom')
    else setZone(null)
  }
  return (
    <div className="relative size-full" onMouseMove={handleMouseMove} onMouseLeave={() => setZone(null)}>
      <div
        className="size-full overflow-hidden"
        style={{
          borderRadius: 8,
          border: '1px solid var(--cn-border-2)',
          backgroundColor: 'var(--cn-bg-3)',
          boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.35)'
        }}
      >
      {/* header: icon chip + name + more */}
      <div
        className="flex items-center"
        style={{ gap: 6, minHeight: 44, paddingLeft: 16, paddingRight: 8, paddingTop: 8, paddingBottom: 8 }}
      >
        <div
          className="flex shrink-0 items-center justify-center"
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            border: '1px solid var(--cn-border-2)',
            backgroundColor: 'var(--cn-text-1)',
            color: 'var(--cn-bg-1)'
          }}
        >
          <IconV2 name={icon} size="sm" />
        </div>
        <Text variant="body-single-line-strong" color="foreground-1" className="min-w-0 flex-1" truncate>
          {name}
        </Text>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button
              variant="ghost"
              size="xs"
              iconOnly
              ignoreIconOnlyTooltip
              aria-label="More"
              onClick={e => e.stopPropagation()}
            >
              <IconV2 name="more-horizontal" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content side="right" align="start" className="min-w-[208px]" onClick={e => e.stopPropagation()}>
            <DropdownMenu.IconItem icon="edit-pencil" title="Edit" onClick={() => onEdit(name)} />
            <DropdownMenu.Separator />
            <DropdownMenu.IconItem icon="plus" title="Add stage before" onClick={() => onAddStageBefore(name)} />
            <DropdownMenu.IconItem icon="plus" title="Add stage after" onClick={() => onAddSequential(name)} />
            <DropdownMenu.Separator />
            <DropdownMenu.IconItem
              icon="trash"
              iconClassName="text-cn-danger"
              title={<Text color="danger">Delete</Text>}
              onClick={() => onDelete(name)}
            />
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>

      {/* footer: step params */}
      <div
        className="border-cn-2 border-t"
        style={{ backgroundColor: 'var(--cn-comp-pipeline-card-footer, var(--cn-bg-2))', padding: '12px 16px' }}
      >
        <div className="flex flex-col" style={{ gap: 6 }}>
          {lines.map(line => (
            <Text key={line} as="p" variant="caption-normal" color="foreground-3">
              {line}
            </Text>
          ))}
        </div>
      </div>
    </div>

      {/* floating add-parallel button — appears when hovering below the node */}
      <div
        className="flex flex-col items-center"
        style={{
          position: 'absolute',
          left: '50%',
          top: '100%',
          transform: 'translateX(-50%)',
          paddingTop: 10,
          zIndex: 20,
          opacity: zone === 'bottom' ? 1 : 0,
          pointerEvents: zone === 'bottom' ? 'auto' : 'none',
          transition: 'opacity 150ms ease'
        }}
      >
        <Button
          variant="outline"
          size="sm"
          iconOnly
          rounded
          aria-label="Add parallel step"
          tooltipProps={{ content: 'Add', side: 'top' }}
          style={{ backgroundColor: 'var(--cn-comp-pipeline-bg, var(--cn-bg-1))' }}
          onClick={event => {
            event.stopPropagation()
            onAddParallel(name)
          }}
        >
          <IconV2 name="plus" />
        </Button>
      </div>

      {/* floating right-edge controls — appear on hover, stacked so the span (extend/retract)
          handles never hide the add-sequential "+". Extend/retract only show for a node that is
          the sole step of its parallel lane; the "+" (add a stage after the group) is always there. */}
      <div
        className="flex flex-col items-center"
        style={{
          position: 'absolute',
          left: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          paddingLeft: 10,
          gap: 6,
          zIndex: 20,
          opacity: zone === 'right' ? 1 : 0,
          pointerEvents: zone === 'right' ? 'auto' : 'none',
          transition: 'opacity 150ms ease'
        }}
      >
        {extendable && (
          <Button
            variant="outline"
            size="sm"
            iconOnly
            rounded
            aria-label="Extend to run in parallel with next step"
            tooltipProps={{ content: 'Run in parallel with next step', side: 'top' }}
            style={{ backgroundColor: 'var(--cn-comp-pipeline-bg, var(--cn-bg-1))' }}
            onClick={event => {
              event.stopPropagation()
              onExtend(name)
            }}
          >
            <IconV2 name="fast-arrow-right" />
          </Button>
        )}
        {retractable && (
          <Button
            variant="outline"
            size="sm"
            iconOnly
            rounded
            aria-label="Retract to stop running in parallel"
            tooltipProps={{ content: 'Stop running in parallel', side: 'top' }}
            style={{ backgroundColor: 'var(--cn-comp-pipeline-bg, var(--cn-bg-1))' }}
            onClick={event => {
              event.stopPropagation()
              onRetract(name)
            }}
          >
            <IconV2 name="fast-arrow-left" />
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          iconOnly
          rounded
          aria-label="Add sequential step"
          tooltipProps={{ content: 'Add', side: 'top' }}
          style={{ backgroundColor: 'var(--cn-comp-pipeline-bg, var(--cn-bg-1))' }}
          onClick={event => {
            event.stopPropagation()
            onAddSequential(name)
          }}
        >
          <IconV2 name="plus" />
        </Button>
      </div>
    </div>
  )
}

/** Transparent group containers: the graph draws the branch/lane edges, so these just pass
    their children through (no stage background). Used for both parallel lanes and the
    sequential chain nested inside a lane. */
function ParallelGroupContentNode({ children }: { children: ReactNode }) {
  return <>{children}</>
}
function SerialGroupContentNode({ children }: { children: ReactNode }) {
  return <>{children}</>
}

enum ChaosNodeType {
  Start = 'start',
  AddStep = 'add-step',
  PodDelete = 'pod-delete',
  Parallel = 'parallel',
  Serial = 'serial',
  End = 'end'
}

const nodes: NodeContent[] = [
  { type: ChaosNodeType.Start, containerType: ContainerNode.leaf, component: StartNodeComponent },
  { type: ChaosNodeType.AddStep, containerType: ContainerNode.leaf, component: AddStepNodeComponent },
  { type: ChaosNodeType.PodDelete, containerType: ContainerNode.leaf, component: StepContentNode },
  { type: ChaosNodeType.Parallel, containerType: ContainerNode.parallel, component: ParallelGroupContentNode },
  { type: ChaosNodeType.Serial, containerType: ContainerNode.serial, component: SerialGroupContentNode },
  { type: ChaosNodeType.End, containerType: ContainerNode.leaf, component: EndNodeComponent }
]

// A configured step: its display name, chip icon, and footer summary lines.
type StepKind = 'fault' | 'cpu-hog' | 'probe'
interface StepDef {
  name: string
  icon: IconV2NamesType
  lines: string[]
}

const STEP_SUFFIXES = ['538a', '6b2c', '7a3d', '9f2h', 'a1b2', 'c3d4']

const makeStep = (kind: StepKind, index: number): StepDef => {
  const suffix = STEP_SUFFIXES[index % STEP_SUFFIXES.length]
  if (kind === 'probe')
    return { name: `system-inline-probe-${suffix}`, icon: 'rt-probe', lines: ['Timeout: 10s', 'Interval: 2s'] }
  if (kind === 'cpu-hog')
    return { name: `pod-cpu-hog-${suffix}`, icon: 'chaos-fault', lines: ['Duration: 60s', 'CPU cores: 1'] }
  return { name: `pod-delete-${suffix}`, icon: 'chaos-fault', lines: ['Duration: 30s', 'Interval: 10s'] }
}

const STEP_WIDTH = 220
const STEP_HEIGHT = 160
// Gap the serial container places between adjacent nodes (pipeline-graph default), i.e. the length
// of the connecting line drawn between two stacked steps.
const SERIAL_NODE_GAP = 36
// How wide to stretch a single-step lane so it spans its longer sibling lane: exactly the combined
// width of that lane's nodes plus the connecting lines between them (no outer padding). Because the
// serial container pads both sides equally, a node this wide, centered in the group, lines its left
// edge up with the first node above and its right edge with the last.
const spanWidth = (len: number) => len * STEP_WIDTH + (len - 1) * SERIAL_NODE_GAP

const stepToNode = (
  step: StepDef,
  opts?: { width?: number; extendable?: boolean; retractable?: boolean }
): AnyContainerNodeType => ({
  type: ChaosNodeType.PodDelete,
  data: {
    name: step.name,
    icon: step.icon,
    lines: step.lines,
    extendable: !!opts?.extendable,
    retractable: !!opts?.retractable
  },
  config: { width: opts?.width ?? STEP_WIDTH, height: STEP_HEIGHT }
})

const START_NODE: AnyContainerNodeType = {
  type: ChaosNodeType.Start,
  data: {},
  config: { width: 40, height: 40, hideLeftPort: true }
}
const END_NODE: AnyContainerNodeType = {
  type: ChaosNodeType.End,
  data: {},
  config: { width: 40, height: 40, hideRightPort: true }
}

// Empty pipeline: start → "Add step" card → end
const EMPTY_DATA: AnyContainerNodeType[] = [
  START_NODE,
  { type: ChaosNodeType.AddStep, data: {}, config: { width: 220, height: 160 } },
  END_NODE
]

// Composable step model so parallel/sequential edits combine instead of replacing each other.
// Each top-level slot is either a single step or a parallel group. A parallel group holds
// branches (lanes), and each branch is itself a sequential chain of one or more steps — this
// nesting is what lets one lane span several stages of another (parallel-of-series).
type Branch = StepDef[]
type StepSlot = { kind: 'single'; step: StepDef } | { kind: 'parallel'; branches: Branch[] }

const countNodes = (slots: StepSlot[]) =>
  slots.reduce(
    (total, slot) =>
      total + (slot.kind === 'parallel' ? slot.branches.reduce((n, b) => n + b.length, 0) : 1),
    0
  )

const slotHasName = (slot: StepSlot, name: string | null) =>
  slot.kind === 'single'
    ? slot.step.name === name
    : slot.branches.some(branch => branch.some(step => step.name === name))

const branchToNode = (branch: Branch): AnyContainerNodeType =>
  branch.length === 1
    ? stepToNode(branch[0])
    : { type: ChaosNodeType.Serial, data: {}, config: {}, children: branch.map(step => stepToNode(step)) }

const buildGraphData = (slots: StepSlot[]): AnyContainerNodeType[] => {
  if (slots.length === 0) return EMPTY_DATA

  const body = slots.map((slot, i): AnyContainerNodeType => {
    if (slot.kind === 'single') return stepToNode(slot.step)

    const lengths = slot.branches.map(b => b.length)
    const maxLen = Math.max(...lengths)
    const minLen = Math.min(...lengths)
    // A single-step lane can extend only into a following single slot, and only for the simple
    // two-lane case (keeps the "which lane spans" choice unambiguous).
    const next = slots[i + 1]
    const canAbsorb = slot.branches.length === 2 && next?.kind === 'single'

    return {
      type: ChaosNodeType.Parallel,
      data: {},
      config: { minWidth: STEP_WIDTH, minHeight: STEP_HEIGHT },
      children: slot.branches.map((branch, bi) => {
        if (branch.length > 1) return branchToNode(branch)
        // A single-step lane: stretch it to span the longer sibling lane. It's extendable when
        // it's (one of) the shortest lane(s) with a following stage to absorb, and retractable
        // when its sibling lane is a chain it can release the last stage back out of.
        const siblingMax = Math.max(0, ...slot.branches.filter((_, j) => j !== bi).map(b => b.length))
        const spanning = maxLen > 1
        const node = stepToNode(branch[0], {
          width: spanning ? spanWidth(maxLen) : undefined,
          extendable: canAbsorb && branch.length === minLen,
          retractable: slot.branches.length === 2 && siblingMax > 1
        })
        // When this lane spans a sibling series, wrap it in a serial container too so both lanes
        // share the same port geometry (equal side padding) — otherwise the fork is asymmetric
        // and the connector kinks.
        return spanning ? { type: ChaosNodeType.Serial, data: {}, config: {}, children: [node] } : node
      })
    }
  })

  return [START_NODE, ...body, END_NODE]
}

const branchOptions = [{ value: 'main', label: 'main' }]

const VIEW_OPTIONS = [
  { value: 'visual', label: 'Visual' },
  { value: 'yaml', label: 'YAML' }
] as const

/**
 * Segmented Visual/YAML toggle: a bordered track with the selected option shown as a
 * bordered pill with a brand-blue label. (The DS ToggleGroup only offers filled selected
 * states, so this is built from tokens to match the design.)
 */
const VisualYamlSegmented = ({
  view,
  setView
}: {
  view: VisualYamlValue
  setView: (view: VisualYamlValue) => void
}) => (
  <div
    className="inline-flex items-center"
    style={{
      gap: 2,
      padding: 3,
      borderRadius: 8,
      backgroundColor: 'var(--cn-bg-2)'
    }}
  >
    {VIEW_OPTIONS.map(({ value, label }) => {
      const selected = view === value
      return (
        <button
          key={value}
          type="button"
          className="cursor-pointer"
          onClick={() => setView(value)}
          style={{
            padding: '4px 14px',
            borderRadius: 6,
            border: `1px solid ${selected ? 'var(--cn-border-3)' : 'transparent'}`,
            backgroundColor: selected ? 'var(--cn-bg-3)' : 'transparent'
          }}
        >
          <Text variant="body-single-line-strong" color={selected ? 'brand' : 'foreground-3'}>
            {label}
          </Text>
        </button>
      )
    })}
  </div>
)

interface StepItem {
  icon?: IconV2NamesType
  /** Data-URI mask for glyphs that have no DS icon (Group / Parallel). */
  iconMask?: string
  title: string
  description: string
  category: 'group' | 'faults' | 'probes' | 'actions'
}

interface StepCategory {
  key: string
  label: string
  icon: IconV2NamesType
  count: number
}

const STEP_CATEGORIES: StepCategory[] = [
  { key: 'all', label: 'All', icon: 'list', count: 22 },
  { key: 'faults', label: 'Faults', icon: 'chaos-fault', count: 10 },
  { key: 'probes', label: 'Probes', icon: 'rt-probe', count: 7 },
  { key: 'actions', label: 'Actions', icon: 'calendar', count: 5 }
]

const STEP_ITEMS: StepItem[] = [
  {
    iconMask: groupIconMask,
    title: 'Group',
    description: 'Container for organizing steps that run sequentially.',
    category: 'group'
  },
  {
    iconMask: parallelIconMask,
    title: 'Parallel',
    description: 'Runs multiple steps simultaneously to save time.',
    category: 'group'
  },
  {
    icon: 'chaos-fault',
    title: 'Pod Delete',
    description: 'Randomly terminates a pod to test how the system handles sudden pod loss and recovery.',
    category: 'faults'
  },
  {
    icon: 'chaos-fault',
    title: 'Pod CPU Hog',
    description: 'Consumes excess CPU within a pod to test behavior under resource contention and throttling.',
    category: 'faults'
  },
  {
    icon: 'chaos-fault',
    title: 'EC2 CPU Hog',
    description: 'Spikes CPU usage on an EC2 instance to test performance under compute resource exhaustion.',
    category: 'faults'
  },
  {
    icon: 'chaos-fault',
    title: 'EC2 DNS Chaos',
    description: 'Disrupts or delays DNS resolution on an EC2 instance to test resilience to name resolution failures.',
    category: 'faults'
  },
  {
    icon: 'chaos-fault',
    title: 'Pod API Latency',
    description: 'Injects artificial delay into API responses from a pod to test timeout handling and downstream resilience.',
    category: 'faults'
  },
  { icon: 'rt-probe', title: 'System Inline Probe', description: 'Command Probe', category: 'probes' },
  { icon: 'rt-probe', title: 'Runtime HTTP Probe', description: 'HTTP Probe', category: 'probes' }
]

/** A category row in the drawer's left sidebar: icon + label + count, with a selected treatment. */
const CategoryItem = ({
  icon,
  label,
  count,
  selected,
  onClick
}: StepCategory & { selected: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative flex items-center rounded-cn-2 transition-colors${selected ? '' : ' hover:bg-cn-2'}`}
    style={{
      gap: 14,
      minHeight: 36,
      paddingLeft: 14,
      paddingRight: 8,
      paddingTop: 2,
      paddingBottom: 2,
      width: 180,
      ...(selected
        ? { background: 'linear-gradient(112deg, rgba(119, 153, 255, 0.2) 13%, rgba(132, 136, 146, 0.09) 85%)' }
        : {})
    }}
  >
    {selected && (
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 2,
          height: 12,
          borderRadius: 1,
          backgroundColor: 'var(--cn-set-brand-primary-bg)'
        }}
      />
    )}
    <IconV2 name={icon} size="sm" className={selected ? 'text-cn-1' : 'text-cn-2'} />
    <span className="flex min-w-0 flex-1 items-center justify-between" style={{ gap: 8 }}>
      <Text
        variant={selected ? 'body-single-line-strong' : 'body-single-line-normal'}
        color={selected ? 'foreground-1' : 'foreground-2'}
      >
        {label}
      </Text>
      <span
        className="inline-flex shrink-0 items-center justify-center"
        style={{
          minWidth: 18,
          height: 18,
          padding: '0 5px',
          borderRadius: 6,
          border: '1px solid var(--cn-border-1)',
          backgroundColor: 'var(--cn-bg-2)'
        }}
      >
        <Text variant="caption-single-line-normal" color="foreground-2">
          {count}
        </Text>
      </span>
    </span>
  </button>
)

const AddStepCard = ({ icon, iconMask, title, description, onClick }: StepItem & { onClick?: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="hover:bg-cn-2 flex w-full items-start rounded-cn-3 text-left transition-colors"
    style={{ gap: 12, padding: 16, border: '1px solid var(--cn-border-2)' }}
  >
    {/* Light chip with a dark glyph (inverted via tokens) to match prod. */}
    <div
      className="flex shrink-0 items-center justify-center rounded-cn-2"
      style={{ width: 36, height: 36, backgroundColor: 'var(--cn-text-1)', color: 'var(--cn-bg-1)' }}
    >
      {iconMask ? (
        <span
          aria-hidden
          style={{
            width: 22,
            height: 22,
            backgroundColor: 'var(--cn-bg-1)',
            maskImage: iconMask,
            WebkitMaskImage: iconMask,
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskPosition: 'center'
          }}
        />
      ) : (
        icon && <IconV2 name={icon} size="lg" />
      )}
    </div>
    <div className="flex flex-col" style={{ gap: 2 }}>
      <Text variant="body-single-line-strong" color="foreground-1">
        {title}
      </Text>
      <Text variant="caption-normal" color="foreground-3">
        {description}
      </Text>
    </div>
  </button>
)

/**
 * Nested configuration drawer for the "Pod Delete" step — stacks on top of the Add Step
 * drawer (DrawerRoot auto-nests when rendered inside an open parent drawer).
 */
const PodDeleteStepDrawer = ({
  open,
  onOpenChange,
  onAddStep,
  mode = 'add',
  stepName = 'pod-delete-538a'
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddStep: () => void
  mode?: 'add' | 'edit'
  stepName?: string
}) => (
  <Drawer.Root open={open} onOpenChange={onOpenChange} direction="right">
    <Drawer.Content size="sm">
      <Drawer.Header>
        <Drawer.Title>{mode === 'edit' ? 'Edit: Pod Delete' : 'Add step: Pod Delete'}</Drawer.Title>
        <Drawer.Description>Simulates pod failure of random replicas of an application deployment.</Drawer.Description>
      </Drawer.Header>

      <Drawer.Body>
        <div className="flex flex-col" style={{ gap: 16 }}>
          <TextInput
            label="Name"
            key={stepName}
            defaultValue={stepName}
            suffix={
              <span
                className="inline-flex items-center"
                style={{ gap: 4, height: 24, padding: '0 9px', borderRadius: 6, border: '1px solid var(--cn-border-2)' }}
              >
                <IconV2 name="sparks" size="xs" className="text-cn-2" />
                <Text variant="caption-single-line-normal" color="foreground-2">
                  suggested
                </Text>
              </span>
            }
          />

          <TextInput label="Namespace" placeholder="e.g. default" />

          <NumberInput label="Duration (in seconds)" tooltipContent="How long the fault is injected." defaultValue={30} />

          <NumberInput
            label="Interval (in seconds)"
            tooltipContent="Time between successive fault iterations."
            defaultValue={10}
          />

          <Accordion.Root type="multiple" variant="card">
            <Accordion.Item value="optional">
              <Accordion.Trigger>Optional configuration</Accordion.Trigger>
              <Accordion.Content>
                <Text variant="body-normal" color="foreground-3">
                  No optional configuration.
                </Text>
              </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item value="advanced">
              <Accordion.Trigger>Advanced</Accordion.Trigger>
              <Accordion.Content>
                <Text variant="body-normal" color="foreground-3">
                  No advanced settings.
                </Text>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion.Root>
        </div>
      </Drawer.Body>

      <Drawer.Footer>
        <div className="flex w-full items-center justify-between">
          <Button variant="secondary" size="sm" iconOnly aria-label="Delete step" tooltipProps={{ content: 'Delete' }}>
            <IconV2 name="trash" />
          </Button>
          <Button size="sm" onClick={onAddStep}>
            {mode === 'edit' ? 'Save' : 'Add step'}
          </Button>
        </div>
      </Drawer.Footer>
    </Drawer.Content>
  </Drawer.Root>
)

/**
 * Config drawer for the "Pod CPU Hog" fault. Mirrors the Pod Delete drawer, swapping in the
 * CPU-hog-specific parameters (CPU cores instead of an interval).
 */
const PodCpuHogStepDrawer = ({
  open,
  onOpenChange,
  onAddStep,
  mode = 'add',
  stepName = 'pod-cpu-hog-538a'
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddStep: () => void
  mode?: 'add' | 'edit'
  stepName?: string
}) => (
  <Drawer.Root open={open} onOpenChange={onOpenChange} direction="right">
    <Drawer.Content size="sm">
      <Drawer.Header>
        <Drawer.Title>{mode === 'edit' ? 'Edit: Pod CPU Hog' : 'Add step: Pod CPU Hog'}</Drawer.Title>
        <Drawer.Description>
          Consumes excess CPU within a pod to test behavior under resource contention and throttling.
        </Drawer.Description>
      </Drawer.Header>

      <Drawer.Body>
        <div className="flex flex-col" style={{ gap: 16 }}>
          <TextInput
            label="Name"
            key={stepName}
            defaultValue={stepName}
            suffix={
              <span
                className="inline-flex items-center"
                style={{ gap: 4, height: 24, padding: '0 9px', borderRadius: 6, border: '1px solid var(--cn-border-2)' }}
              >
                <IconV2 name="sparks" size="xs" className="text-cn-2" />
                <Text variant="caption-single-line-normal" color="foreground-2">
                  suggested
                </Text>
              </span>
            }
          />

          <TextInput label="Namespace" placeholder="e.g. default" />

          <NumberInput label="Duration (in seconds)" tooltipContent="How long the fault is injected." defaultValue={60} />

          <NumberInput
            label="CPU cores"
            tooltipContent="Number of CPU cores to consume in the target pod."
            defaultValue={1}
          />

          <Accordion.Root type="multiple" variant="card">
            <Accordion.Item value="optional">
              <Accordion.Trigger>Optional configuration</Accordion.Trigger>
              <Accordion.Content>
                <NumberInput
                  label="CPU load (in percentage)"
                  tooltipContent="Percentage of each core's capacity to consume."
                  defaultValue={100}
                />
              </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item value="advanced">
              <Accordion.Trigger>Advanced</Accordion.Trigger>
              <Accordion.Content>
                <Text variant="body-normal" color="foreground-3">
                  No advanced settings.
                </Text>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion.Root>
        </div>
      </Drawer.Body>

      <Drawer.Footer>
        <div className="flex w-full items-center justify-between">
          <Button variant="secondary" size="sm" iconOnly aria-label="Delete step" tooltipProps={{ content: 'Delete' }}>
            <IconV2 name="trash" />
          </Button>
          <Button size="sm" onClick={onAddStep}>
            {mode === 'edit' ? 'Save' : 'Add step'}
          </Button>
        </div>
      </Drawer.Footer>
    </Drawer.Content>
  </Drawer.Root>
)

/** Collapsible section header (chevron + title) used inside the probe config drawer. */
const DrawerSection = ({ title, children }: { title: string; children: ReactNode }) => {
  const [open, setOpen] = useState(true)
  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <button type="button" onClick={() => setOpen(value => !value)} className="flex items-center" style={{ gap: 8 }}>
        <IconV2 name={open ? 'nav-arrow-up' : 'nav-arrow-down'} size="sm" className="text-cn-2" />
        <Text variant="heading-base" color="foreground-1">
          {title}
        </Text>
      </button>
      {open && (
        <div className="flex flex-col" style={{ gap: 16 }}>
          {children}
        </div>
      )}
    </div>
  )
}

const PROBE_RUN_PROPS = [
  { label: 'Timeout (in seconds)', value: 10 },
  { label: 'Interval (in seconds)', value: 2 },
  { label: 'Retry', value: 0 },
  { label: 'Attempt', value: 1 },
  { label: 'Polling interval (in seconds)', value: 10 },
  { label: 'Initial delay (in seconds)', value: 5 }
]

const LabeledSelect = ({ label, value, options }: { label: string; value: string; options: string[] }) => (
  <div className="flex flex-col" style={{ gap: 8 }}>
    <Text variant="body-single-line-normal" color="foreground-1">
      {label}
    </Text>
    <Select options={options.map(option => ({ value: option, label: option }))} value={value} onChange={() => undefined} />
  </div>
)

/** Nested configuration drawer for the "System Inline Probe" step. */
const SystemInlineProbeStepDrawer = ({
  open,
  onOpenChange,
  onAddStep,
  mode = 'add'
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddStep: () => void
  mode?: 'add' | 'edit'
}) => (
  <Drawer.Root open={open} onOpenChange={onOpenChange} direction="right">
    <Drawer.Content size="sm">
      <Drawer.Header>
        <Drawer.Title>{mode === 'edit' ? 'Edit: System Inline Probe' : 'Add step: System Inline Probe'}</Drawer.Title>
        <Drawer.Description>Simulates pod failure of random replicas of an application deployment.</Drawer.Description>
      </Drawer.Header>

      <Drawer.Body>
        <div className="flex flex-col" style={{ gap: 16 }}>
          <DrawerSection title="Run properties">
            {PROBE_RUN_PROPS.map(prop => (
              <NumberInput key={prop.label} label={prop.label} defaultValue={prop.value} />
            ))}
          </DrawerSection>

          <DrawerSection title="Probe properties">
            {/* Command — mono code area with a purple mode prefix + character counter */}
            <div className="flex flex-col" style={{ gap: 8 }}>
              <div className="flex items-end justify-between">
                <Text variant="body-single-line-normal" color="foreground-1">
                  Command
                </Text>
                <Text variant="caption-normal" color="foreground-3">
                  121 / 500
                </Text>
              </div>
              <div
                className="flex overflow-hidden"
                style={{ borderRadius: 6, border: '1px solid var(--cn-border-2)', backgroundColor: 'var(--cn-bg-2)' }}
              >
                <div
                  className="flex shrink-0 items-start justify-center"
                  style={{
                    width: 34,
                    paddingTop: 8,
                    borderRight: '1px solid var(--cn-border-2)',
                    color: 'var(--cn-set-purple-outline-text, #ec8cff)'
                  }}
                >
                  <IconV2 name="code-brackets" size="sm" />
                </div>
                <textarea
                  defaultValue={'echo "hello world"'}
                  spellCheck={false}
                  className="text-cn-1 flex-1 resize-none bg-transparent outline-none"
                  style={{ minHeight: 98, padding: '8px 12px', fontFamily: 'var(--cn-font-family-mono)', fontSize: 12 }}
                />
              </div>
            </div>

            <LabeledSelect label="Type" value="String" options={['String', 'Number', 'Boolean']} />
            <LabeledSelect label="Comparison criteria" value="Matches" options={['Matches', 'Contains', 'Equals']} />
            <TextInput label="Value" defaultValue="Hello World" />
          </DrawerSection>
        </div>
      </Drawer.Body>

      <Drawer.Footer>
        <div className="flex w-full items-center justify-between">
          <Button variant="secondary" size="sm" iconOnly aria-label="Delete step" tooltipProps={{ content: 'Delete' }}>
            <IconV2 name="trash" />
          </Button>
          <Button size="sm" onClick={onAddStep}>
            {mode === 'edit' ? 'Save' : 'Add step'}
          </Button>
        </div>
      </Drawer.Footer>
    </Drawer.Content>
  </Drawer.Root>
)

const AddStepDrawer = ({
  open,
  onOpenChange,
  onAddStep
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddStep: (kind: StepKind) => void
}) => {
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [podDeleteOpen, setPodDeleteOpen] = useState(false)
  const [podCpuHogOpen, setPodCpuHogOpen] = useState(false)
  const [probeOpen, setProbeOpen] = useState(false)
  const steps = STEP_ITEMS.filter(
    step =>
      (activeCategory === 'all' || step.category === activeCategory) &&
      step.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction="right">
      <Drawer.Content size="md">
        <Drawer.Header style={{ borderBottom: '1px solid var(--cn-border-2)' }}>
          <Drawer.Title>Add step</Drawer.Title>
          <Drawer.Description className="sr-only">Choose a step to add to the experiment.</Drawer.Description>
        </Drawer.Header>

        <Drawer.Body>
          <div className="flex h-full items-stretch" style={{ gap: 20 }}>
            {/* Category sidebar */}
            <div className="flex shrink-0 flex-col" style={{ gap: 2 }}>
              {STEP_CATEGORIES.map(category => (
                <CategoryItem
                  key={category.key}
                  {...category}
                  selected={activeCategory === category.key}
                  onClick={() => setActiveCategory(category.key)}
                />
              ))}
            </div>

            {/* Vertical separator */}
            <div className="bg-cn-3 w-px shrink-0 self-stretch" />

            {/* Searchable step list */}
            <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 12 }}>
              <SearchInput placeholder="Find steps" onChange={setSearch} />
              <div className="flex flex-col" style={{ gap: 12 }}>
                {steps.map(step => (
                  <AddStepCard
                    key={step.title}
                    {...step}
                    onClick={
                      step.title === 'Pod Delete'
                        ? () => setPodDeleteOpen(true)
                        : step.title === 'Pod CPU Hog'
                          ? () => setPodCpuHogOpen(true)
                          : step.title === 'System Inline Probe'
                            ? () => setProbeOpen(true)
                            : undefined
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </Drawer.Body>
      </Drawer.Content>

      {/* Nested step-config drawers, opened from the step cards. */}
      <PodDeleteStepDrawer
        open={podDeleteOpen}
        onOpenChange={setPodDeleteOpen}
        onAddStep={() => {
          setPodDeleteOpen(false)
          onAddStep('fault')
        }}
      />
      <PodCpuHogStepDrawer
        open={podCpuHogOpen}
        onOpenChange={setPodCpuHogOpen}
        onAddStep={() => {
          setPodCpuHogOpen(false)
          onAddStep('cpu-hog')
        }}
      />
      <SystemInlineProbeStepDrawer
        open={probeOpen}
        onOpenChange={setProbeOpen}
        onAddStep={() => {
          setProbeOpen(false)
          onAddStep('probe')
        }}
      />
    </Drawer.Root>
  )
}

// The graph of the previously-run experiment, shown when arriving from an execution's
// "View experiment": pod-delete-538a → pod-delete-6b2c on top, system-inline-probe spanning below.
const executedExperimentSteps = (): StepSlot[] => [
  {
    kind: 'parallel',
    branches: [
      [makeStep('fault', 0), makeStep('fault', 1)],
      [makeStep('probe', 2)]
    ]
  }
]

export const ChaosStudioView = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('studio')
  const [view, setView] = useState<VisualYamlValue>('visual')
  const [addStepOpen, setAddStepOpen] = useState(false)
  const [steps, setSteps] = useState<StepSlot[]>(() =>
    (location.state as { fromExecution?: boolean } | null)?.fromExecution ? executedExperimentSteps() : []
  )
  // How the drawer was opened + which node's control triggered it (for add-stage / parallel targeting).
  const [pendingAdd, setPendingAdd] = useState<'initial' | 'parallel' | 'sequential' | 'sequential-before'>('initial')
  const [pendingTarget, setPendingTarget] = useState<string | null>(null)
  // The step being edited via the node's "…" menu (drives which config drawer opens).
  const [editTarget, setEditTarget] = useState<{ name: string; kind: StepKind } | null>(null)
  const graphData = buildGraphData(steps)

  const openDrawer = (mode: 'initial' | 'parallel' | 'sequential' | 'sequential-before', target: string | null) => {
    setPendingAdd(mode)
    setPendingTarget(target)
    setAddStepOpen(true)
  }

  const commitAddStep = (kind: StepKind) => {
    setSteps(prev => {
      const step = makeStep(kind, countNodes(prev))
      if (pendingAdd === 'initial') return [{ kind: 'single', step }]
      if (pendingAdd === 'sequential' || pendingAdd === 'sequential-before') {
        const before = pendingAdd === 'sequential-before'
        const idx = prev.findIndex(slot => slotHasName(slot, pendingTarget))
        // No specific target (the end-of-graph "+") → add a new stage at the very end.
        if (idx === -1) return [...prev, { kind: 'single', step }]

        const slot = prev[idx]
        if (slot.kind === 'parallel') {
          // The target lives in one lane: grow that lane into a sequence, so the sibling lane(s)
          // run parallel to the whole sequence.
          const branches = slot.branches.map(branch => {
            const bi = branch.findIndex(s => s.name === pendingTarget)
            if (bi === -1) return branch
            const nextBranch = [...branch]
            nextBranch.splice(before ? bi : bi + 1, 0, step)
            return nextBranch
          })
          const next = [...prev]
          next[idx] = { kind: 'parallel', branches }
          return next
        }

        // A standalone stage: insert a new stage before/after it.
        const next = [...prev]
        next.splice(before ? idx : idx + 1, 0, { kind: 'single', step })
        return next
      }
      // parallel: fold the new step into the targeted slot as a new lane
      return prev.map(slot => {
        if (!slotHasName(slot, pendingTarget)) return slot
        return slot.kind === 'single'
          ? { kind: 'parallel', branches: [[slot.step], [step]] }
          : { kind: 'parallel', branches: [...slot.branches, [step]] }
      })
    })
    setAddStepOpen(false)
  }

  // "Extend": the clicked node's lane stays put (and becomes the spanning lane); the next
  // stage is pulled into the sibling lane, turning it into a sequential chain.
  const extendStep = (nodeName: string) => {
    setSteps(prev => {
      const idx = prev.findIndex(slot => slot.kind === 'parallel' && slotHasName(slot, nodeName))
      const slot = prev[idx]
      const next = prev[idx + 1]
      if (!slot || slot.kind !== 'parallel' || slot.branches.length !== 2 || next?.kind !== 'single') {
        return prev
      }
      const branches = slot.branches.map(branch =>
        branch.some(step => step.name === nodeName) ? branch : [...branch, next.step]
      )
      const nextSlots = [...prev]
      nextSlots[idx] = { kind: 'parallel', branches }
      nextSlots.splice(idx + 1, 1) // the absorbed stage is no longer a standalone slot
      return nextSlots
    })
  }

  // "Retract": the inverse of extend. The clicked node's lane stays put; the last stage of its
  // sibling chain is released back out into a standalone sequential slot after the group.
  const retractStep = (nodeName: string) => {
    setSteps(prev => {
      const idx = prev.findIndex(slot => slot.kind === 'parallel' && slotHasName(slot, nodeName))
      const slot = prev[idx]
      if (!slot || slot.kind !== 'parallel' || slot.branches.length !== 2) return prev
      const siblingIdx = slot.branches.findIndex(branch => !branch.some(step => step.name === nodeName))
      const sibling = slot.branches[siblingIdx]
      if (!sibling || sibling.length < 2) return prev
      const released = sibling[sibling.length - 1]
      const branches = slot.branches.map((branch, j) => (j === siblingIdx ? branch.slice(0, -1) : branch))
      const nextSlots = [...prev]
      nextSlots[idx] = { kind: 'parallel', branches }
      nextSlots.splice(idx + 1, 0, { kind: 'single', step: released })
      return nextSlots
    })
  }

  // Remove a node. Dropping it from a parallel lane collapses empty lanes; a group left with a
  // single lane flattens back into sequential stages.
  const removeStep = (nodeName: string) => {
    setSteps(prev => {
      const result: StepSlot[] = []
      for (const slot of prev) {
        if (slot.kind === 'single') {
          if (slot.step.name !== nodeName) result.push(slot)
          continue
        }
        const branches = slot.branches.map(branch => branch.filter(step => step.name !== nodeName)).filter(b => b.length)
        if (branches.length === 0) continue
        if (branches.length === 1) branches[0].forEach(step => result.push({ kind: 'single', step }))
        else result.push({ kind: 'parallel', branches })
      }
      return result
    })
  }

  // Open the matching config drawer for an existing step (fault kind inferred from its name).
  const editStep = (nodeName: string) => {
    const kind: StepKind = nodeName.startsWith('system-inline-probe')
      ? 'probe'
      : nodeName.startsWith('pod-cpu-hog')
        ? 'cpu-hog'
        : 'fault'
    setEditTarget({ name: nodeName, kind })
  }

  return (
    <AddStepContext.Provider
      value={{
        selected: addStepOpen,
        onOpen: () => openDrawer('initial', null),
        onAddParallel: nodeName => openDrawer('parallel', nodeName),
        onAddSequential: nodeName => openDrawer('sequential', nodeName),
        onExtend: extendStep,
        onRetract: retractStep,
        onEdit: editStep,
        onAddStageBefore: nodeName => openDrawer('sequential-before', nodeName),
        onDelete: removeStep,
        onAddAtEnd: () => openDrawer('sequential', null)
      }}
    >
    <div className="flex h-full flex-col">
      {/* Page header: title + tabs + run */}
      <div
        className="border-cn-2 flex shrink-0 items-center border-b"
        style={{ paddingLeft: 24, paddingRight: 24, height: 56, gap: 16 }}
      >
        <Text variant="heading-section" truncate>
          nginx-pod-delete-test
        </Text>
        <Button variant="ghost" size="sm" iconOnly aria-label="Rename" tooltipProps={{ content: 'Rename' }}>
          <IconV2 name="edit-pencil" />
        </Button>

        <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="ml-auto">
          <Tabs.List variant="ghost">
            <Tabs.Trigger value="studio" icon="pipeline">
              Studio
            </Tabs.Trigger>
            <Tabs.Trigger value="executions" icon="play">
              Executions
            </Tabs.Trigger>
            <Tabs.Trigger value="settings" icon="settings">
              Settings
            </Tabs.Trigger>
            <Tabs.Trigger value="input-sets" icon="list">
              Input sets
            </Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>

        <Button size="sm" onClick={() => navigate('/view-preview/resilience-tests/chaos-experiments/executions')}>
          <IconV2 name="play-solid" />
          Run
        </Button>
      </div>

      {/* Studio: visual/yaml toolbar + canvas + status footer */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* The dotted grid spans the whole area; toolbar floats on top (no bar / divider). */}
        <div className="cn-graph-bg-size bg-cn-graph-bg-gradient relative flex min-h-0 flex-1 flex-col">
          {/* Toolbar */}
          <div className="flex shrink-0 items-center" style={{ paddingLeft: 24, paddingRight: 24, height: 48 }}>
            <div className="flex-1" />
          <VisualYamlSegmented view={view} setView={setView} />
          <div className="flex flex-1 items-center justify-end">
            <Button variant="ghost" size="sm" iconOnly aria-label="Settings" tooltipProps={{ content: 'Settings' }}>
              <IconV2 name="settings" />
            </Button>
          </div>
        </div>

          {/* Canvas */}
          <div className="relative flex min-h-0 flex-1">
          <CanvasProvider>
            <PipelineGraph
              data={graphData}
              nodes={nodes}
              customCreateSVGPath={({ id, path }) => ({
                level1: `<path d="${path}" id="${id}" fill="none" stroke="var(--cn-border-1)" />`,
                level2: ''
              })}
              // We draw plain connector lines (no arrow/dot port markers), so drop the default
              // 4px target-port gap that would otherwise leave a break before each node.
              getPort={() => ({ portSvg: '', rightGap: 0 })}
              // Symmetric vertical padding (the default is 50/20, which offsets container ports by
              // 15px and kinks the start/end connector into a spanning parallel group).
              serialContainerConfig={{ paddingTop: 35, paddingBottom: 35 }}
              parallelContainerConfig={{ paddingTop: 35, paddingBottom: 35 }}
              edgesConfig={{ radius: 10, parallelNodeOffset: 10, serialNodeOffset: 10 }}
            />
          </CanvasProvider>
          </div>
        </div>

        {/* Status footer: problems · repo · branch · sync state */}
        <div
          className="border-cn-2 flex shrink-0 items-center border-t"
          style={{ paddingLeft: 16, paddingRight: 16, height: 40, gap: 16 }}
        >
          <div className="flex items-center" style={{ gap: 12 }}>
            <span className="flex items-center" style={{ gap: 4 }}>
              <IconV2 name="xmark-circle" size="xs" className="text-cn-3" />
              <Text variant="caption-single-line-normal">0</Text>
            </span>
            <span className="flex items-center" style={{ gap: 4 }}>
              <IconV2 name="warning-triangle" size="xs" className="text-cn-3" />
              <Text variant="caption-single-line-normal">0</Text>
            </span>
            <span className="flex items-center" style={{ gap: 4 }}>
              <IconV2 name="info-circle" size="xs" className="text-cn-3" />
              <Text variant="caption-single-line-normal">0</Text>
            </span>
          </div>

          <span className="flex items-center" style={{ gap: 4 }}>
            <Text variant="caption-single-line-normal" color="foreground-3">
              Repo:
            </Text>
            <Text variant="caption-single-line-normal">gitx-testing</Text>
          </span>

          <span className="flex items-center" style={{ gap: 4 }}>
            <Text variant="caption-single-line-normal" color="foreground-3">
              Branch:
            </Text>
            <Select options={branchOptions} value="main" onChange={() => undefined} />
          </span>

          <StatusBadge variant="secondary" theme="warning" size="sm" icon="warning-triangle">
            Out of sync
          </StatusBadge>
        </div>
      </div>
    </div>

      <AddStepDrawer open={addStepOpen} onOpenChange={setAddStepOpen} onAddStep={commitAddStep} />

      {/* Edit config drawers, opened from a node's "…" menu. (Values are illustrative in this mock,
          so Save just closes.) */}
      <PodDeleteStepDrawer
        open={editTarget?.kind === 'fault'}
        onOpenChange={open => !open && setEditTarget(null)}
        onAddStep={() => setEditTarget(null)}
        mode="edit"
        stepName={editTarget?.name}
      />
      <PodCpuHogStepDrawer
        open={editTarget?.kind === 'cpu-hog'}
        onOpenChange={open => !open && setEditTarget(null)}
        onAddStep={() => setEditTarget(null)}
        mode="edit"
        stepName={editTarget?.name}
      />
      <SystemInlineProbeStepDrawer
        open={editTarget?.kind === 'probe'}
        onOpenChange={open => !open && setEditTarget(null)}
        onAddStep={() => setEditTarget(null)}
        mode="edit"
      />
    </AddStepContext.Provider>
  )
}

export default ChaosStudioView
