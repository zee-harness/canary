import { Button, Chat, HarnessLogo, IconV2, Text } from '@harnessio/ui/components'

const suggestions = [
  { icon: 'numbered-list-left', label: 'List pipelines' },
  { icon: 'headset-help', label: 'Ask a support question' },
  { icon: 'warning-triangle', label: 'Analyze Pipeline Errors' }
] as const

/**
 * The clickable grip on the left border of the main body that expands / collapses
 * the AI chat panel. Positioned on the inset gutter (6px) so it sits on the panel edge.
 */
export const ChatMarker = ({ open, onToggle }: { open: boolean; onToggle: () => void }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={open ? 'Collapse AI chat' : 'Expand AI chat'}
    className="group absolute top-1/2 z-20 flex items-center justify-center"
    style={{ left: 6, transform: 'translate(-50%, -50%)', width: 18, height: 60 }}
  >
    <span className="gap-cn-3xs flex flex-col items-center">
      <span
        className="bg-cn-3 transition-colors group-hover:bg-cn-1"
        style={{ width: 3, height: 22, borderRadius: 9999 }}
      />
      <span
        className="bg-cn-3 transition-colors group-hover:bg-cn-1"
        style={{ width: 3, height: 22, borderRadius: 9999 }}
      />
    </span>
  </button>
)

/** The expandable "New Chat" AI panel that sits between the sidebar and the main body. */
export const ChatPanel = ({ onClose }: { onClose: () => void }) => (
  <div
    className="my-cn-2xs ml-cn-2xs border-cn-2 bg-cn-1 flex shrink-0 flex-col overflow-hidden rounded-cn-3 border"
    style={{ width: 360 }}
  >
    {/* Header */}
    <div className="px-cn-lg py-cn-md flex items-center justify-between">
      <Text variant="body-single-line-strong">New Chat</Text>
      <div className="gap-cn-3xs flex items-center">
        <Button size="sm" iconOnly variant="ghost" tooltipProps={{ content: 'New chat' }}>
          <IconV2 name="edit-pencil" />
        </Button>
        <Button size="sm" iconOnly variant="ghost" onClick={onClose} tooltipProps={{ content: 'Collapse' }}>
          <IconV2 name="xmark" />
        </Button>
        <Button size="sm" iconOnly variant="ghost" tooltipProps={{ content: 'More' }}>
          <IconV2 name="more-vert" />
        </Button>
      </div>
    </div>

    {/* Greeting */}
    <div className="gap-cn-sm px-cn-lg flex flex-1 flex-col items-center justify-center text-center">
      <HarnessLogo size={36} />
      <Text variant="heading-subsection">How can I help you today?</Text>
    </div>

    {/* Suggestions + composer */}
    <div className="px-cn-lg pb-cn-lg gap-cn-xs flex flex-col">
      {suggestions.map(s => (
        <Button key={s.label} variant="outline" className="w-full justify-start">
          <IconV2 name={s.icon} />
          {s.label}
        </Button>
      ))}
      <div className="mt-cn-2xs">
        <Chat.Input placeholder="What would you like to know?" />
      </div>
      <Text align="center" color="foreground-3" variant="caption-normal">
        Harness AI can make mistakes. Check answers.
      </Text>
    </div>
  </div>
)
