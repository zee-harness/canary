import { useState } from 'react'

import {
  AnyContainerNodeType,
  CanvasProvider,
  ContainerNode,
  LeafNodeInternalType,
  NodeContent,
  PipelineGraph
} from '@harnessio/pipeline-graph'
import { Button, IconV2, Select, StatusBadge, Tabs, Text } from '@harnessio/ui/components'
import { PipelineNodes, type VisualYamlValue } from '@harnessio/views'

// The pipeline-graph ships its own stylesheet for the canvas / edges / nodes.
import '@harnessio/pipeline-graph/dist/index.css'

// --- Graph node content components (reuse the pipeline studio nodes) ------------------------
const StartNodeComponent = () => <PipelineNodes.StartNode />
const EndNodeComponent = () => <PipelineNodes.EndNode />

interface StepNodeDataType {
  name?: string
  icon?: React.ReactElement
}

/** The single empty-step placeholder shown on a fresh chaos experiment. */
function AddStepNodeComponent({ node }: { node: LeafNodeInternalType<StepNodeDataType> }) {
  const { name, icon } = node.data
  return <PipelineNodes.StepNode name={name} icon={icon} onEllipsisClick={() => undefined} onClick={() => undefined} />
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

// start → empty "Add step" → end
const data: AnyContainerNodeType[] = [
  { type: ChaosNodeType.Start, data: {}, config: { width: 40, height: 40, hideLeftPort: true } },
  {
    type: ChaosNodeType.AddStep,
    data: {
      name: 'Add step',
      icon: <IconV2 name="plus" size="lg" className="m-cn-xs text-cn-2" />
    } satisfies StepNodeDataType,
    config: { width: 200, height: 80 }
  },
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
      border: '1px solid var(--cn-border-1)',
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

export const ChaosStudioView = () => {
  const [activeTab, setActiveTab] = useState('studio')
  const [view, setView] = useState<VisualYamlValue>('visual')

  return (
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
  )
}

export default ChaosStudioView
