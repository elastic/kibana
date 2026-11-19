# Edit with AI

## What is "Edit with AI"?

The **Edit with AI** button appears in the Attack Discovery settings flyout's workflow configuration panel. When clicked, it opens the Agent Builder sidebar via `openChat({ sessionTag: 'security', newConversation: true, autoSendInitialMessage: false, ... })`. It intentionally passes **no** `agentId`, so Agent Builder uses its default agent (the `sessionTag: 'security'` scopes the conversation to the security session). The chat is pre-loaded with the user's current ES|QL alert retrieval query as an attachment. The user then iterates on the query through natural-language conversation, and changes are synchronized back to the settings editor in real time.

## How it works

The component uses a **dual-path sync model** to detect when the agent produces an updated ES|QL query. Both paths ultimately call `onEsqlQueryChange` to push the new query into the settings editor.

### Path 1: Explicit tool call (primary)

The component registers a `browserApiTool` called `update_esql_query` via `openChat()`. When the agent calls this tool, the handler fires immediately and applies the new query.

### Path 2: Attachment-based sync (fallback)

Agent Builder publishes the active conversation, including its versioned `attachments`, on `agentBuilder.events.ui.activeConversation$`, and publishes it again after each agent reply. When the conversation opened by **Edit with AI** has an ES|QL attachment whose query differs from the last one seen, the `tryGetLatestEsqlQueryFromAttachments` helper extracts it and the component applies it.

### Why both paths?

LLMs do not always call tools when instructed. The explicit tool call is the preferred path because it applies changes mid-round (instant feedback), but the attachment fallback catches changes the agent makes to the ES|QL attachment without calling the tool.

## Why `activeConversation$`

The fallback used to read the attachments from the `round_complete` chat event, which is no longer sent to the browser ([#290761](https://github.com/elastic/kibana/pull/290761)). `activeConversation$` is the public observable that carries the conversation with its attachments:

```
EventsServiceStartContract {
  ui: {
    activeConversation$: Observable<ActiveConversation | null>
  }
}
```

It is not a per-round event. It replays the open conversation to new subscribers, and publishes it again whenever it changes: after each reply, but also when it is marked as read, renamed or pinned, and when the user switches conversations. The fallback therefore:

1. **Ignores everything until Edit with AI is clicked.** The click records the query that was sent as the starting point.
2. **Follows only the conversation opened by Edit with AI**, which is the first conversation published after the click.
3. **Applies a query only when the ES|QL attachment's query changes** from the last one seen. The tool updates the editor but not the attachment, so an unchanged attachment is never re-applied: the fallback does not put the original query back after a tool call, or over the user's own edits.

## Trade-offs and known limitations

### Applied only after a reply finishes

The fallback runs when Agent Builder refetches the conversation after a reply, so unlike the tool it does not apply changes mid-round.

### Conversation tracking is based on order

The first conversation published after the click is treated as the Edit with AI conversation. If the user switches to an existing conversation before sending the first message, that conversation is followed instead.

### Manual lifecycle management

The subscription is managed in a `useEffect` with explicit subscribe/unsubscribe. Refs hold the `onEsqlQueryChange` callback and the tracked conversation, so the subscription is not recreated on every render.
