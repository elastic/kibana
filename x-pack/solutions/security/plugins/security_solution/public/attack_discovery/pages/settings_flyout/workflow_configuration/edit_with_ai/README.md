# Edit with AI

## What is "Edit with AI"?

The **Edit with AI** button appears in the Attack Discovery settings flyout's workflow configuration panel. When clicked, it opens the Agent Builder sidebar with the [Threat Hunting agent](../../../../../../common/constants.ts), pre-loaded with the user's current ES|QL alert retrieval query as an attachment. The user then iterates on the query through natural-language conversation, and changes are synchronized back to the settings editor in real time.

## How it works

The component uses a **dual-path sync model** to detect when the agent produces an updated ES|QL query. Both paths ultimately call `onEsqlQueryChange` to push the new query into the settings editor.

### Path 1: Explicit tool call (primary)

The component registers a `browserApiTool` called `update_esql_query` via `openChat()`. When the agent calls this tool, the handler fires immediately and applies the new query. A ref (`hasExplicitEsqlToolCallInRoundRef`) is set to `true` so the fallback path knows not to double-apply.

### Path 2: Attachment-based sync (fallback)

After each agent round completes, a `RoundCompleteEvent` is emitted containing the conversation's updated `attachments` array. The `tryGetLatestEsqlQueryFromAttachments` helper extracts the most recent ES|QL attachment, and if the tool-call path didn't already handle it, applies the query.

### Why both paths?

LLMs do not always call tools when instructed. The explicit tool call is the preferred path because it applies changes mid-round (instant feedback), but the attachment fallback ensures changes are never silently lost if the agent skips the tool call. The `hasExplicitEsqlToolCallInRoundRef` flag prevents the same query from being applied twice in a single round.

## Why `events.chat$` instead of `onRoundComplete` on `openChat()`

### Background

The first implementation added an `onRoundComplete` callback prop to `EmbeddableConversationProps` in the core Agent Builder plugin (`x-pack/platform/plugins/shared/agent_builder/`). While functional, this required modifying files owned by the Agent Builder team — creating a cross-team maintenance burden and merge-conflict risk on every upstream rebase.

### The public alternative: `events.chat$`

Agent Builder already exposes a public observable for exactly this purpose:

```
EventsServiceStartContract {
  chat$: Observable<BrowserChatEvent>
}
```

This observable (`agentBuilder.events.chat$`) receives every `ChatEvent` from the HTTP SSE stream. The data flow is:

```
HTTP SSE stream
  → ChatService processes events
    → propagateEvents() tap operator
      → EventsService Subject (events$)
        → .asObservable().pipe(share())
          → chat$ (public contract)
```

The key insight is that `propagateEvents()` is a `tap()` operator in the chat service's event pipeline — it forwards every event (including `RoundCompleteEvent`) to the `EventsService` Subject before any downstream consumer sees it. This means `chat$` carries the exact same `RoundCompleteEventData` (with `.attachments` and `.round`) that would be delivered via a scoped callback.

### Filtering

The `useRoundComplete` hook subscribes to `chat$` and filters using the public `isRoundCompleteEvent` type guard from `@kbn/agent-builder-common`:

```typescript
eventsService.chat$
  .pipe(filter(isRoundCompleteEvent))
  .subscribe((event) => {
    onRoundComplete(event.data);
  });
```

All required types are already public exports:

| Type | Package |
|------|---------|
| `EventsServiceStartContract` | `@kbn/agent-builder-browser/events` |
| `isRoundCompleteEvent` | `@kbn/agent-builder-common` |
| `RoundCompleteEventData` | `@kbn/agent-builder-common/chat/events` |

## Trade-offs and known limitations

### Global stream, not conversation-scoped

`chat$` emits events from **all** active conversations. There is no `conversation_id` field on `RoundCompleteEvent` to filter by. This is acceptable because the Agent Builder sidebar is a singleton — only one conversation runs at a time. If Agent Builder ever supports concurrent conversations (e.g., multiple sidebars or background conversations), this approach would need revisiting.

### Manual lifecycle management

The subscription is managed in a `useEffect` with explicit subscribe/unsubscribe. The `useRoundComplete` hook uses a ref for the `onRoundComplete` callback to avoid tearing down and re-creating the subscription when the callback identity changes (which would happen on every render without `useCallback`).

### No backpressure or buffering

Events emitted before the subscription is active (or after it is torn down) are lost. In practice this is not an issue because the subscription is established before the user can interact with the sidebar, and it persists for the component's lifetime.

### Preferred future state

If the Agent Builder team adds a first-class `onRoundComplete` callback to `openChat()` as a supported public API, the migration path is straightforward: replace the `useRoundComplete` hook usage with the scoped callback. This would eliminate the global-stream trade-off and simplify lifecycle management. Until then, `events.chat$` is the correct approach — it uses only public, stable APIs and requires zero cross-team code changes.

## Why the dual-path sync model?

To summarize the rationale from [How it works](#how-it-works):

1. **Tool calls are preferred but unreliable** — The `update_esql_query` browser API tool gives instant, mid-round feedback. But LLMs are non-deterministic; they may generate the correct query in their response text or update the attachment without calling the tool.

2. **Attachments are reliable but delayed** — `RoundCompleteEvent.attachments` always reflects the conversation state after a round, but it only arrives after the full round completes (not mid-round).

3. **The flag prevents double-application** — `hasExplicitEsqlToolCallInRoundRef` is set to `true` when the tool fires and reset to `false` at the start of `handleRoundComplete`. If the tool already applied a query during this round, the attachment path is skipped. If the tool was not called, the attachment path applies the query.

This dual-path design maximizes responsiveness (tool calls are instant) while guaranteeing correctness (attachments catch what tools miss).
