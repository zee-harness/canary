import { createContext, useContext, useState } from 'react'

import { AnyContainerNodeType, CanvasProvider, ContainerNode, NodeContent, PipelineGraph } from '@harnessio/pipeline-graph'
import { Button, Drawer, IconV2, type IconV2NamesType, Select, StatusBadge, Tabs, Text } from '@harnessio/ui/components'
import { PipelineNodes, type VisualYamlValue } from '@harnessio/views'

// The pipeline-graph ships its own stylesheet for the canvas / edges / nodes.
import '@harnessio/pipeline-graph/dist/index.css'

// Smiley placeholder glyph exported from the design (no DS icon matches). Inlined as a
// data-URI mask so it can be tinted with a theme token and avoids SVG-asset resolution quirks.
import addStepIconRaw from './add-step-icon.svg?raw'

const addStepIconMask = `url("data:image/svg+xml,${encodeURIComponent(addStepIconRaw)}")`

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
      className="relative size-full text-left"
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
        <span
          aria-hidden
          className="shrink-0"
          style={{
            width: 22,
            height: 22,
            backgroundColor: 'var(--cn-text-1)',
            maskImage: addStepIconMask,
            WebkitMaskImage: addStepIconMask,
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskPosition: 'center'
          }}
        />
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

enum ChaosNodeType {
  Start = 'start',
  AddStep = 'add-step',
  End = 'end'
}

const nodes: NodeContent[] = [
  { type: ChaosNodeType.Start, containerType: ContainerNode.leaf, component: StartNodeComponent },
  { type: ChaosNodeType.AddStep, containerType: ContainerNode.leaf, component: AddStepNodeComponent },
  { type: ChaosNodeType.End, containerType: ContainerNode.leaf, component: EndNodeComponent }
]

// Empty pipeline: start → "Add step" card → end
const data: AnyContainerNodeType[] = [
  { type: ChaosNodeType.Start, data: {}, config: { width: 40, height: 40, hideLeftPort: true } },
  { type: ChaosNodeType.AddStep, data: {}, config: { width: 220, height: 160 } },
  { type: ChaosNodeType.End, data: {}, config: { width: 40, height: 40, hideRightPort: true } }
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

interface StepOption {
  icon: IconV2NamesType
  title: string
  description: string
}

const GROUP_OPTIONS: StepOption[] = [
  { icon: 'view-columns-2', title: 'Parallel', description: 'Runs multiple steps simultaneously to save time.' }
]

const STEP_OPTIONS: StepOption[] = [
  {
    icon: 'chaos-fault',
    title: 'Fault',
    description: 'A failure injected into the chaos infrastructure as part of a Chaos experiment.'
  },
  {
    icon: 'rt-probe',
    title: 'Probe',
    description: 'A validation mechanism that continuously monitors and verifies the health and behavior of your system.'
  },
  { icon: 'code', title: 'Action', description: 'An event or script within a pipeline.' }
]

const AddStepCard = ({ icon, title, description }: StepOption) => (
  <button
    type="button"
    className="border-cn-2 bg-cn-2 hover:bg-cn-3 flex w-full items-start rounded-cn-3 border text-left transition-colors"
    style={{ gap: 12, padding: 16 }}
  >
    <div
      className="border-cn-2 flex shrink-0 items-center justify-center rounded-cn-2 border"
      style={{ width: 32, height: 32 }}
    >
      <IconV2 name={icon} size="sm" className="text-cn-2" />
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

const AddStepDrawer = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => (
  <Drawer.Root open={open} onOpenChange={onOpenChange} direction="right">
    <Drawer.Content size="sm">
      <Drawer.Header>
        <Drawer.Title>Add Step</Drawer.Title>
        <Drawer.Description className="sr-only">Choose a step type to add to the experiment.</Drawer.Description>
      </Drawer.Header>

      <Drawer.Body>
        <div className="flex flex-col" style={{ gap: 24 }}>
          <div className="flex flex-col" style={{ gap: 12 }}>
            <Text variant="body-single-line-normal" color="foreground-3">
              Group
            </Text>
            <div className="flex flex-col" style={{ gap: 8 }}>
              {GROUP_OPTIONS.map(option => (
                <AddStepCard key={option.title} {...option} />
              ))}
            </div>
          </div>

          <div className="flex flex-col" style={{ gap: 12 }}>
            <Text variant="body-single-line-normal" color="foreground-3">
              Steps
            </Text>
            <div className="flex flex-col" style={{ gap: 8 }}>
              {STEP_OPTIONS.map(option => (
                <AddStepCard key={option.title} {...option} />
              ))}
            </div>
          </div>
        </div>
      </Drawer.Body>

      <Drawer.Footer>
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      </Drawer.Footer>
    </Drawer.Content>
  </Drawer.Root>
)

export const ChaosStudioView = () => {
  const [activeTab, setActiveTab] = useState('studio')
  const [view, setView] = useState<VisualYamlValue>('visual')
  const [addStepOpen, setAddStepOpen] = useState(false)

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
              data={data}
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

      <AddStepDrawer open={addStepOpen} onOpenChange={setAddStepOpen} />
    </AddStepContext.Provider>
  )
}

export default ChaosStudioView
