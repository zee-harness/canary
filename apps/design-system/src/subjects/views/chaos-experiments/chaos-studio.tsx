import { createContext, type ReactNode, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'

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
}>({
  selected: false,
  onOpen: () => undefined,
  onAddParallel: () => undefined,
  onAddSequential: () => undefined,
  onExtend: () => undefined,
  onRetract: () => undefined
})

// --- Graph node content components (reuse the pipeline studio nodes) ------------------------
const StartNodeComponent = () => <PipelineNodes.StartNode />
const EndNodeComponent = () => <PipelineNodes.EndNode />

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
  const { onAddParallel, onAddSequential, onExtend, onRetract } = useContext(AddStepContext)
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className="relative size-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
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

      {/* floating add-parallel button — appears on hover below the node */}
      <div
        className="flex flex-col items-center"
        style={{
          position: 'absolute',
          left: '50%',
          top: '100%',
          transform: 'translateX(-50%)',
          paddingTop: 10,
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
          opacity: hovered ? 1 : 0,
          pointerEvents: hovered ? 'auto' : 'none',
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
type StepKind = 'fault' | 'probe'
interface StepDef {
  name: string
  icon: IconV2NamesType
  lines: string[]
}

const STEP_SUFFIXES = ['538a', '6b2c', '7a3d', '9f2h', 'a1b2', 'c3d4']

const makeStep = (kind: StepKind, index: number): StepDef => {
  const suffix = STEP_SUFFIXES[index % STEP_SUFFIXES.length]
  return kind === 'probe'
    ? { name: `system-inline-probe-${suffix}`, icon: 'rt-probe', lines: ['Timeout: 10s', 'Interval: 2s'] }
    : { name: `pod-delete-${suffix}`, icon: 'chaos-fault', lines: ['Duration: 30s', 'Interval: 10s'] }
}

const STEP_WIDTH = 220
const STEP_HEIGHT = 160
// Serial container spacing (see pipeline-graph defaults): 42px padding each side + 36px between nodes.
const SERIAL_PADDING = 42
const SERIAL_NODE_GAP = 36
// Rendered width of a sequential lane of `len` steps, used to stretch a single-step lane so it
// visually spans its longer sibling lane (matching the design).
const laneWidth = (len: number) => 2 * SERIAL_PADDING + len * STEP_WIDTH + (len - 1) * SERIAL_NODE_GAP

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
        return stepToNode(branch[0], {
          width: maxLen > 1 ? laneWidth(maxLen) : undefined,
          extendable: canAbsorb && branch.length === minLen,
          retractable: slot.branches.length === 2 && siblingMax > 1
        })
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
  onAddStep
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddStep: () => void
}) => (
  <Drawer.Root open={open} onOpenChange={onOpenChange} direction="right">
    <Drawer.Content size="sm">
      <Drawer.Header>
        <Drawer.Title>Add step: Pod Delete</Drawer.Title>
        <Drawer.Description>Simulates pod failure of random replicas of an application deployment.</Drawer.Description>
      </Drawer.Header>

      <Drawer.Body>
        <div className="flex flex-col" style={{ gap: 16 }}>
          <TextInput
            label="Name"
            defaultValue="pod-delete-538a"
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
            Add step
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
  onAddStep
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddStep: () => void
}) => (
  <Drawer.Root open={open} onOpenChange={onOpenChange} direction="right">
    <Drawer.Content size="sm">
      <Drawer.Header>
        <Drawer.Title>Add step: System Inline Probe</Drawer.Title>
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
            Add step
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

export const ChaosStudioView = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('studio')
  const [view, setView] = useState<VisualYamlValue>('visual')
  const [addStepOpen, setAddStepOpen] = useState(false)
  const [steps, setSteps] = useState<StepSlot[]>([])
  // How the drawer was opened + which node's "+" triggered it (for parallel/sequential targeting).
  const [pendingAdd, setPendingAdd] = useState<'initial' | 'parallel' | 'sequential'>('initial')
  const [pendingTarget, setPendingTarget] = useState<string | null>(null)
  const graphData = buildGraphData(steps)

  const openDrawer = (mode: 'initial' | 'parallel' | 'sequential', target: string | null) => {
    setPendingAdd(mode)
    setPendingTarget(target)
    setAddStepOpen(true)
  }

  const commitAddStep = (kind: StepKind) => {
    setSteps(prev => {
      const step = makeStep(kind, countNodes(prev))
      if (pendingAdd === 'initial') return [{ kind: 'single', step }]
      if (pendingAdd === 'sequential') {
        // insert a new single step after the targeted slot (or at the end)
        const idx = prev.findIndex(slot => slotHasName(slot, pendingTarget))
        const next = [...prev]
        next.splice(idx === -1 ? prev.length : idx + 1, 0, { kind: 'single', step })
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

  return (
    <AddStepContext.Provider
      value={{
        selected: addStepOpen,
        onOpen: () => openDrawer('initial', null),
        onAddParallel: nodeName => openDrawer('parallel', nodeName),
        onAddSequential: nodeName => openDrawer('sequential', nodeName),
        onExtend: extendStep,
        onRetract: retractStep
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

        <Button size="sm" onClick={() => navigate('/view-preview/chaos-experiments/executions')}>
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
    </AddStepContext.Provider>
  )
}

export default ChaosStudioView
