import { createContext, useContext, useState } from 'react'

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


// Lets the graph's Add-step card reflect (selected) and trigger the drawer owned by the view.
const AddStepContext = createContext<{ selected: boolean; onOpen: () => void }>({
  selected: false,
  onOpen: () => undefined
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
interface PodDeleteNodeData {
  name: string
  duration: number
  interval: number
}

function PodDeleteStepContentNode({ node }: { node: LeafNodeInternalType<PodDeleteNodeData> }) {
  const { name, duration, interval } = node.data
  return (
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
          <IconV2 name="chaos-fault" size="sm" />
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
          <Text as="p" variant="caption-normal" color="foreground-3">
            Duration: {duration}s
          </Text>
          <Text as="p" variant="caption-normal" color="foreground-3">
            Interval: {interval}s
          </Text>
        </div>
      </div>
    </div>
  )
}

enum ChaosNodeType {
  Start = 'start',
  AddStep = 'add-step',
  PodDelete = 'pod-delete',
  End = 'end'
}

const nodes: NodeContent[] = [
  { type: ChaosNodeType.Start, containerType: ContainerNode.leaf, component: StartNodeComponent },
  { type: ChaosNodeType.AddStep, containerType: ContainerNode.leaf, component: AddStepNodeComponent },
  { type: ChaosNodeType.PodDelete, containerType: ContainerNode.leaf, component: PodDeleteStepContentNode },
  { type: ChaosNodeType.End, containerType: ContainerNode.leaf, component: EndNodeComponent }
]

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

// After adding the Pod Delete step: start → populated step card → end
const STEP_ADDED_DATA: AnyContainerNodeType[] = [
  START_NODE,
  {
    type: ChaosNodeType.PodDelete,
    data: { name: 'pod-delete-538a', duration: 30, interval: 10 },
    config: { width: 220, height: 160 }
  },
  END_NODE
]

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

const AddStepDrawer = ({
  open,
  onOpenChange,
  onAddStep
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddStep: () => void
}) => {
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [podDeleteOpen, setPodDeleteOpen] = useState(false)
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
                    onClick={step.title === 'Pod Delete' ? () => setPodDeleteOpen(true) : undefined}
                  />
                ))}
              </div>
            </div>
          </div>
        </Drawer.Body>
      </Drawer.Content>

      {/* Nested step-config drawer, opened from the Pod Delete card. */}
      <PodDeleteStepDrawer
        open={podDeleteOpen}
        onOpenChange={setPodDeleteOpen}
        onAddStep={() => {
          setPodDeleteOpen(false)
          onAddStep()
        }}
      />
    </Drawer.Root>
  )
}

export const ChaosStudioView = () => {
  const [activeTab, setActiveTab] = useState('studio')
  const [view, setView] = useState<VisualYamlValue>('visual')
  const [addStepOpen, setAddStepOpen] = useState(false)
  const [stepAdded, setStepAdded] = useState(false)
  const graphData = stepAdded ? STEP_ADDED_DATA : EMPTY_DATA

  return (
    <AddStepContext.Provider value={{ selected: addStepOpen, onOpen: () => setAddStepOpen(true) }}>
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

        <Button size="sm">
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

      <AddStepDrawer
        open={addStepOpen}
        onOpenChange={setAddStepOpen}
        onAddStep={() => {
          setStepAdded(true)
          setAddStepOpen(false)
        }}
      />
    </AddStepContext.Provider>
  )
}

export default ChaosStudioView
