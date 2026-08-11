import { Button, Chat, HarnessLogo, IconV2, Text } from '@harnessio/ui/components'

const suggestions = [
  { icon: 'numbered-list-left', label: 'List pipelines' },
  { icon: 'headset-help', label: 'Ask a support question' },
  { icon: 'warning-triangle', label: 'Analyze Pipeline Errors' }
] as const

const Bar = () => (
  <span style={{ width: 2, height: 20, borderRadius: 9999, backgroundColor: 'var(--cn-text-2)' }} />
)

/**
 * Grip straddling the seam between the chat (or collapsed peek) and the main body — two
 * thin vertical bars, one either side of the seam. `seamX` is the seam's x offset within
 * the (relative) body column. Sits above the main panel so both bars stay visible.
 */
export const SeamGrip = ({ open, onToggle, seamX }: { open: boolean; onToggle: () => void; seamX: number }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={open ? 'Collapse AI chat' : 'Expand AI chat'}
    className="group absolute z-20 flex items-center justify-center"
    style={{ top: '50%', left: seamX, transform: 'translate(-50%, -50%)', width: 22, height: 44, gap: 8 }}
  >
    <Bar />
    <Bar />
  </button>
)

/**
 * The collapsed AI chat: a thin, slightly-shorter card tucked BEHIND the main body so its
 * left edge peeks out from beneath the main border (stacked-cards look). Must be rendered
 * inside the `relative` body column; the main panel sits above it (z-10) and hides its right
 * side. Clicking expands the chat.
 */
export const CollapsedChatPeek = ({ onExpand }: { onExpand: () => void }) => (
  <button
    type="button"
    onClick={onExpand}
    aria-label="Expand AI chat"
    className="absolute"
    style={{
      left: 6,
      top: 16,
      bottom: 16,
      width: 34,
      zIndex: 0,
      borderRadius: 12,
      border: '1px solid var(--cn-border-2)',
      backgroundColor: 'var(--cn-bg-1)'
    }}
  />
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
