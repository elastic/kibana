# Log exploration attachment (PoC)

Renders the `observability.log_exploration` attachment as an interactive view the user filters
directly. Branches on `data.view.type`: `pattern-table` shows patterns with per-row sparklines,
`volume-comparison` shows current log volume overlaid on a baseline epoch. One attachment carries
both views, so state survives switching between them.

**This is a proof of concept.** It exists to answer whether Agent Chat can host a human-steered log
exploration loop, not to ship. The caveats below are deliberate.

## The payload is a journey, not a bag of fields

```
{ source, refinements[], view, result }
```

- **`source`** — what is being explored: index, message field, time range. Survives a refinement and
  a change of lens.
- **`refinements`** — the narrowing decisions, as a discriminated union over `exclude-pattern`
  (muting), `only-pattern` (scoping) and `kql`. Each carries `origin: 'user' | 'agent'`, for
  labelling only — the user may remove one the agent applied.
- **`view`** — the lens and its own parameters. `baselineEpoch` lives here, so it is lost on a lens
  switch; that is accepted.
- **`result`** — the answer to the last query, keyed to `view.type`. Disposable, and nearly all the
  bytes in a ~16 KB write.

Three things follow, and they are the reason for the shape:

- **One server translation.** `server/utils/log_exploration_refinements.ts` maps kinds to DSL
  clauses — `exclude-pattern` to `must_not`, `only-pattern` to the identical clause under `filter`.
  Both query handlers call it, so a narrowing cannot reach one lens and miss another. It previously
  did: `getLogVolumeComparison` took only `kqlFilter` and never received muted patterns, so muting
  had never affected the volume chart.
- **One chip row.** `exploration_controls.tsx` renders `refinements` through an exhaustive switch, so
  a new kind is a compile error until it has a label, and is removable by construction.
- **The refetch request is the state minus `result`, and the response is exactly `result`.** One
  request schema (`logExplorationRequestSchema = logExplorationDataSchema.omit({ result: true })`)
  replaces two hand-written ones that had already drifted apart.

`format()` still writes a hand-written sentence per kind despite the uniform storage. The muting
wording in particular — never _name_ a muted pattern, never include it in a summary, count or
comparison, but you may say how many are muted — is what makes the Summarize criterion pass, and is
not worth flattening into a generic list of narrowings. `format()` also carries the rules for what
the agent may say about state the user can change without a turn. They are conditional on the shape
of the round: a message that renders the view must not restate the window, the baseline or the
filters, because the live controls sit directly beneath it; a prose-only reply, with nothing beside
it that can move, should name them. Either way a quoted number is framed as a reading taken at that
moment.

Journey _history_ is deliberately not modelled: the attachment version chain already is the journey.
The payload describes the current position only.

**Breaking change.** There is no normalising read for the old flat payload. Conversations created
before this change show the invalid-payload callout; start a new one.

## Local edits to other teams' code

These are **not** PRs and must be reverted or upstreamed properly before any of this ships.

| File                                                                                | Change                                                                                                              |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `packages/shared/agent-builder/agent-builder-server/allow_lists.ts`                 | Added two tool ids, one skill id, one attachment type id. `register*` throws without them                           |
| `plugins/shared/agent_builder/server/routes/attachments.ts`                         | Content PUT now passes `ATTACHMENT_REF_ACTOR.user` and calls `addAttachmentsToLastRound` instead of `client.update` |
| `packages/shared/agent-builder/agent-builder-browser/attachments/contract.ts`       | Added optional `updateContent` and `submitMessage` to `GetActionButtonsParams` and `InlineRenderCallbacks`          |
| `plugins/shared/agent_builder/public/services/attachments/attachements_service.tsx` | Added `updateContent`                                                                                               |
| `plugins/shared/agent_builder/public/.../inline_attachment_with_actions.tsx`        | Wired both capabilities into the two renderer call sites                                                            |

## Why the PUT route had to change

Rounds pin attachments by ref. `resolveAttachmentVersion` in `render_attachment_plugin.tsx` reads
`round.input.attachment_refs` **before** falling back to `versions.at(-1)`. The stock PUT route writes
a new version but leaves the ref pinned at the old one, so any refetch re-renders the stale version
even though the new one exists. Persisting the ref is what makes a mutation survive a refetch.

**Known defect, not fixed here:** refs accumulate, one entry appended per button click, unbounded.
Needs collapsing in the update route or in the merge logic. Agent Builder's call.

**Known defect, not fixed here:** `actor: user` places version chips beside the user's prompt under a
hardcoded "Added" label, which is the wrong placement and label for button-driven edits.

## Why content writes do not invalidate the conversation

`updateContent` deliberately omits `conversationActions.invalidateConversation()`, unlike the
`updateOrigin` wrapper directly above it in the same file.

The renderer subtree is keyed `` `${attachment.id}:${versionData.version}` `` on
`AttachmentRenderErrorBoundary`, and `computeCumulativeRefs` resolves that version to the **highest
ref seen**, not the one the round was created with. Because the PUT route persists a ref on every
write, invalidating refetches, advances the pinned version, changes the key and rebuilds the subtree
after every click.

Note this coupling is structural, not incidental: the same version selects the data _and_ forms the
key. A ref that does not advance keeps the key stable but renders stale content; a ref that advances
refreshes the content but always moves the key. There is no configuration that gives a plain
re-render with fresh data.

Measured on a local instance, with invalidation temporarily switched on:

|                                  | Without invalidation | With invalidation                             |
| -------------------------------- | -------------------- | --------------------------------------------- |
| Row disappears                   | ~50 ms               | ~50 ms (local state, unchanged)               |
| Subtree rebuilt                  | never                | ~712 ms after every click                     |
| Network per click                | one ~16 KB PUT       | ~16 KB PUT + **two** ~40 KB conversation GETs |
| Clicking faster than the rebuild | correct              | **rows revert on screen**                     |

**The rebuild reverts recent clicks.** Sampling row count every 20 ms across two mutes 200 ms apart:

```
t=38    5 rows   mute #1 applied locally
t=257   4 rows   mute #2 applied locally
t=405   5 rows   <- muted row REAPPEARS
t=1393  4 rows   settles once mute #2's write lands
```

The rebuild after mute #1's write re-seeds from a server version that predates mute #2, so the row is
visibly back for ~1s. A three-click sequence then lands the third click on a pattern that had already
been muted, because the reverted row returned to position 0 under the pointer:

```
t=0    7 rows -> clicked "GET /api/v1/orders"
t=150  6 rows -> clicked "Cache miss for key session"
t=700  6 rows -> clicked "Cache miss for key session"   same row again
       3 clicks produced 2 mutes
```

Nothing was lost only because `MUTE_PATTERN` is idempotent. Aiming at a different pattern in that
window would have muted the wrong one. For a view whose primary interaction is rapidly dismissing
noise, rows moving under the pointer is the failure that matters, not the flicker.

Costs beyond that: a visible teardown and rebuild of the panel ~700 ms after each click, and a full
conversation refetch per click that grows with conversation length — ~97 KB per mute here against
~16 KB. Anything not derived from attachment data, such as an open date-picker popover, is discarded
with the rebuild. Focus is lost in both modes, since removing the row destroys the focused button.

Consequences of skipping it:

- Local reducer state is the display source between refetches. `props.attachment.data` stays frozen,
  which is why every mutation derives from local state (see `use_log_exploration_state.ts`).
- A failed PUT is corrected by `PERSIST_FAILED` reverting to the last acknowledged snapshot. Nothing
  else will correct it, so that path is load-bearing rather than defensive.
- An agent write to the attachment is not visible until the next natural refetch. Since agent writes
  only happen during a round, and round completion refetches anyway, this is near-theoretical.

### Two live renders of one attachment lose writes

`format()` asks the agent to re-render this view at the end of an analysis, so a recommendation to
mute or investigate is one click away. That puts two renders of the same attachment in the
conversation, and both are writable: `resolveAttachmentVersion` falls back to the latest version when
a round has no ref of its own, so neither resolves to an older one. Nothing tells the earlier render
it has been superseded — props stay frozen for the loop, and content writes deliberately do not
invalidate the conversation.

Measured: mute in the newer render, then mute a different row in the older one, and the first mute is
gone after a reload — the older render derived its payload from the version it mounted with. The
framework's one-writable-render guard (`version < versionCount`) only separates renders that resolve
to _different_ versions, which these do not.

Accepted for the PoC, not fixed. The real fix is delta writes (`{ mute: pattern }`) rather than
full-payload PUTs — see LX-3, which exists for this reason.

## Why agent-turn handlers await `flushPendingWrites()`

`render_attachment_plugin.tsx` renders `<AttachmentLoadingSkeleton />` whenever `isStreaming`, so every
agent turn tears down and rebuilds this subtree from server state. Clicking Mute and then immediately
Investigate or Summarize would otherwise race an in-flight PUT against the turn's refetch and silently
lose the mute — precisely in the interactions meant to prove muted state reaches the model.

Writes are also serialised behind a single in-flight promise, since concurrent PUTs each carry the full
accumulated payload and last-write-wins is only correct if responses land in order. `flushPendingWrites`
awaits the in-flight refetch first, because a refetch persists only once its data lands.

## Refetching without an agent turn

Moving the window has to change the data, not just the label, or the view misrepresents itself. Two
internal routes — `POST /internal/observability_agent_builder/log_exploration/{patterns,volume_comparison}`
— re-run the same query handlers the tools use, so there is one query implementation rather than two.
Both take the attachment state minus its `result` and return exactly that `result`, so a request
cannot describe a narrowing whose answer then ignores it. They are stateless: the renderer already
holds every parameter, and writes the returned data back in a single `updateContent` call once it
lands. Persisting the window first would leave the attachment describing a range whose table still
belongs to the previous one.

Which interactions refetch, and why:

| Interaction            | Refetches      | Reason                                                                      |
| ---------------------- | -------------- | --------------------------------------------------------------------------- |
| Time range             | yes            | Every number in the view belongs to the window                              |
| Baseline epoch         | yes            | The baseline series is queried per epoch                                    |
| Removing a refinement  | yes            | The query narrowed those rows away, so any retained count is from before    |
| Adding a non-exclusion | yes            | It cuts rows the last query returned                                        |
| Excluding a pattern    | yes, debounced | Only `MAX_PATTERNS` rows are shown, so the row below the cut has to move up |

Excluding is the one debounced case. The query is `LIMIT 8`, so muting leaves a visibly short table
until the top-N backfills, which is why it refetches rather than only hiding the row. The row still
disappears locally before any I/O, so the interaction stays instant; the query behind it is delayed by
`MUTE_FETCH_DEBOUNCE_MS` so that clicking down a list of patterns costs one query and one attachment
version instead of one of each per click. The query pushes exclusions down as a `must_not` DSL filter
so the top-N backfills, and the client keeps the previously seen entry for every excluded pattern so
the chip has something to restore while its refetch is in flight.

A pending exclusion refetch is a write that has not happened yet, so `flushPendingWrites` fires it
immediately rather than waiting out the timer — otherwise an agent turn started right after a mute
reads state the server has never seen. For the same reason a failed one still persists: nothing else
writes the exclusion, so dropping the write would lose it on the next remount.

Ordering and failure: each refetch carries a sequence number and aborts its predecessor, so the latest
interaction wins regardless of response order. A failed refetch rolls back the **window only** —
anything the user did while it was in flight stands — and surfaces a callout, distinct from
`PERSIST_FAILED` so a failed fetch cannot revert a successful write.

## Accepted rough edges

- **React DOM-nesting warnings.** Inline renders live inside a markdown `<p>`, and `EuiDataGrid`,
  `EuiSuperDatePicker` and elastic-charts are all block-level. The console will complain. Moving the
  view to `renderCanvasContent` would fix it, at the cost of taking the loop out of the transcript.
- **No canvas.** `renderCanvasContent` is not implemented, so `openCanvas` is never offered and
  `canvas_flyout.tsx` was left untouched. A canvas variant would need the contract additions threaded
  there too.
- **A retained excluded pattern shows a stale count** until its refetch lands, because it is kept from
  the payload rather than re-queried. Removing the refinement refetches immediately, so the window is
  short.
- **`maxContentLength` on `AttachmentTypeDefinition` is declared but never enforced** by the framework.
  All payload bounds live in the zod schema in `common/log_exploration.ts` instead.
- **Silent disappearance.** `render_attachment_plugin.tsx` returns `null` with no diagnostic when the
  resolved version is missing from `versions[]`. If the attachment vanishes rather than erroring, check
  the round's `attachment_refs` against the stored versions first.

## Out of scope

Production quality, visual polish, MCP App parity, persistence beyond the conversation, permissions,
and the remaining capabilities in the log exploration spec. The `kql` refinement kind has no input to
create one — the agent still sets it; the view only shows and removes it.
